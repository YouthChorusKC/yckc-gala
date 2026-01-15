import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getDb, generateId } from '../db.js'
import { sendCustomEmail } from '../services/email.js'
import { adminAuth, editAuth } from '../middleware/auth.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_EXPIRES_IN = '7d'
const SALT_ROUNDS = 10

interface JwtPayload {
  userId: string
  email: string
}

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
}

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email.toLowerCase()) as any

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Update last login
    db.prepare('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id)

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    // Set cookie
    res.cookie('auth_token', token, cookieOptions)

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'view',
        mustChangePassword: !!user.must_change_password,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { path: '/' })
  res.json({ success: true })
})

// Get current user
router.get('/me', (req, res) => {
  const token = req.cookies?.auth_token

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    const db = getDb()
    const user = db.prepare('SELECT id, email, role, must_change_password FROM admin_users WHERE id = ?')
      .get(decoded.userId) as any

    if (!user) {
      res.clearCookie('auth_token', { path: '/' })
      return res.status(401).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'view',
        mustChangePassword: !!user.must_change_password,
      },
    })
  } catch (error) {
    res.clearCookie('auth_token', { path: '/' })
    res.status(401).json({ error: 'Invalid token' })
  }
})

// Change own password
router.post('/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user!.id) as any

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    db.prepare('UPDATE admin_users SET password_hash = ?, must_change_password = 0 WHERE id = ?')
      .run(passwordHash, req.user!.id)

    res.json({ success: true, message: 'Password changed' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
})

// Forgot password - send reset email
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email.toLowerCase()) as any

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent' })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    db.prepare('UPDATE admin_users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
      .run(resetToken, resetTokenExpires, user.id)

    // Send reset email
    const baseUrl = process.env.BASE_URL || 'http://localhost:5173'
    const resetUrl = `${baseUrl}/admin/reset-password?token=${resetToken}`

    await sendCustomEmail(
      user.email,
      'YCKC Gala Admin - Password Reset',
      `
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    )

    res.json({ success: true, message: 'If that email exists, a reset link has been sent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Failed to process request' })
  }
})

// Reset password
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const db = getDb()
    const user = db.prepare(`
      SELECT * FROM admin_users
      WHERE reset_token = ?
        AND reset_token_expires > datetime('now')
    `).get(token) as any

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    // Update password and clear reset token, also clear must_change_password
    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, must_change_password = 0
      WHERE id = ?
    `).run(passwordHash, user.id)

    res.json({ success: true, message: 'Password has been reset' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// ============ USER MANAGEMENT (edit role required) ============

// List all admin users
router.get('/users', adminAuth, (req, res) => {
  const db = getDb()
  const users = db.prepare(`
    SELECT id, email, role, must_change_password, created_at, last_login
    FROM admin_users
    ORDER BY created_at ASC
  `).all()

  res.json(users)
})

// Invite new user (edit role required)
router.post('/users/invite', editAuth, async (req, res) => {
  try {
    const { email, password, role } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    if (role && !['edit', 'view'].includes(role)) {
      return res.status(400).json({ error: 'Role must be edit or view' })
    }

    const db = getDb()

    // Check if email already exists
    const existing = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(email.toLowerCase())
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const userId = generateId()

    db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, must_change_password)
      VALUES (?, ?, ?, ?, 1)
    `).run(userId, email.toLowerCase(), passwordHash, role || 'view')

    res.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase(),
        role: role || 'view',
      },
    })
  } catch (error) {
    console.error('Invite user error:', error)
    res.status(500).json({ error: 'Failed to invite user' })
  }
})

// Update user role (edit role required)
router.patch('/users/:id', editAuth, (req, res) => {
  try {
    const { role } = req.body
    const userId = req.params.id

    if (role && !['edit', 'view'].includes(role)) {
      return res.status(400).json({ error: 'Role must be edit or view' })
    }

    // Prevent user from changing their own role
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }

    const db = getDb()

    // Check user exists
    const user = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (role) {
      db.prepare('UPDATE admin_users SET role = ? WHERE id = ?').run(role, userId)
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Failed to update user' })
  }
})

// Delete user (edit role required)
router.delete('/users/:id', editAuth, (req, res) => {
  try {
    const userId = req.params.id

    // Prevent user from deleting themselves
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' })
    }

    const db = getDb()

    // Check user exists
    const user = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check there's at least one other edit user
    const editCount = db.prepare("SELECT COUNT(*) as count FROM admin_users WHERE role = 'edit' AND id != ?")
      .get(userId) as any
    if (editCount.count === 0) {
      return res.status(400).json({ error: 'Cannot delete the last user with edit permissions' })
    }

    db.prepare('DELETE FROM admin_users WHERE id = ?').run(userId)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Reset user password (edit role required) - sets a new temp password
router.post('/users/:id/reset-password', editAuth, async (req, res) => {
  try {
    const { password } = req.body
    const userId = req.params.id

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const db = getDb()

    // Check user exists
    const user = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    db.prepare('UPDATE admin_users SET password_hash = ?, must_change_password = 1 WHERE id = ?')
      .run(passwordHash, userId)

    res.json({ success: true })
  } catch (error) {
    console.error('Reset user password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

export default router

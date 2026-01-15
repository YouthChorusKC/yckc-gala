import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getDb, generateId } from '../db.js'
import { sendCustomEmail } from '../services/email.js'

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
    const user = db.prepare('SELECT id, email FROM admin_users WHERE id = ?').get(decoded.userId) as any

    if (!user) {
      res.clearCookie('auth_token', { path: '/' })
      return res.status(401).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    res.clearCookie('auth_token', { path: '/' })
    res.status(401).json({ error: 'Invalid token' })
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

    // Update password and clear reset token
    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL
      WHERE id = ?
    `).run(passwordHash, user.id)

    res.json({ success: true, message: 'Password has been reset' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Create admin user (only works if no admins exist)
router.post('/setup', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const db = getDb()

    // Check if any admin exists
    const existingAdmin = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as any
    if (existingAdmin.count > 0) {
      return res.status(403).json({ error: 'Admin user already exists' })
    }

    // Create admin
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const userId = generateId()

    db.prepare(`
      INSERT INTO admin_users (id, email, password_hash)
      VALUES (?, ?, ?)
    `).run(userId, email.toLowerCase(), passwordHash)

    res.json({ success: true, message: 'Admin user created' })
  } catch (error) {
    console.error('Setup error:', error)
    res.status(500).json({ error: 'Failed to create admin user' })
  }
})

export default router

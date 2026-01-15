import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { getDb } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

interface JwtPayload {
  userId: string
  email: string
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: 'edit' | 'view'
        mustChangePassword: boolean
      }
    }
  }
}

// Base auth - any authenticated admin user
export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload

    // Fetch user from database to get current role
    const db = getDb()
    const user = db.prepare('SELECT id, email, role, must_change_password FROM admin_users WHERE id = ?')
      .get(decoded.userId) as any

    if (!user) {
      res.clearCookie('auth_token', { path: '/' })
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role || 'view',
      mustChangePassword: !!user.must_change_password,
    }

    return next()
  } catch (error) {
    res.clearCookie('auth_token', { path: '/' })
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// Edit auth - only users with 'edit' role
export function editAuth(req: Request, res: Response, next: NextFunction) {
  // First run adminAuth
  adminAuth(req, res, () => {
    if (req.user?.role !== 'edit') {
      return res.status(403).json({ error: 'Edit permission required' })
    }
    next()
  })
}

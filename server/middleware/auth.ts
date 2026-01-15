import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

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
      }
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  // Try JWT cookie auth first
  const token = req.cookies?.auth_token
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
      req.user = {
        id: decoded.userId,
        email: decoded.email,
      }
      return next()
    } catch (error) {
      // Invalid token, clear cookie and continue to legacy auth check
      res.clearCookie('auth_token', { path: '/' })
    }
  }

  // Legacy: Check for password in header (for backward compatibility)
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin'
  const password = req.headers['x-admin-password'] || req.query.password

  if (password === adminPassword) {
    return next()
  }

  return res.status(401).json({ error: 'Unauthorized' })
}

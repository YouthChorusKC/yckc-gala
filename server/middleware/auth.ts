import { Request, Response, NextFunction } from 'express'

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  // Read password at runtime to ensure env vars are loaded
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin'

  // Check for password in header or query param
  const password = req.headers['x-admin-password'] || req.query.password

  if (password !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  next()
}

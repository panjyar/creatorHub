import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export type AppRole = 'brand' | 'creator';
export interface AuthRequest extends Request { user?: { id: string; role: AppRole } }

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) { res.status(401).json({ message: 'Authentication required' }); return; }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string; role: AppRole };
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch { res.status(401).json({ message: 'Invalid or expired token' }); }
}

export function requireRole(...roles: AppRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) { res.status(403).json({ message: 'You do not have permission to perform this action' }); return; }
    next();
  };
}

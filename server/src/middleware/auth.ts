import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      };
    }
  }
}

export interface AuthRequest extends Request {}

/** Use this type in route handlers that are protected by `authenticateToken`. */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded as { id: string; username: string; email: string };
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
}

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, AuthPayload } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权，请先登录' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token无效或已过期，请重新登录' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'OPERATOR')) {
    return res.status(403).json({ message: '权限不足' });
  }
  next();
}

export function requireSubscription(plans: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const sub = await prisma.subscription.findUnique({
        where: { userId: req.user!.userId }
      });
      if (!sub || !plans.includes(sub.plan)) {
        return res.status(403).json({ message: '该功能需要升级套餐才能使用' });
      }
      next();
    } finally {
      await prisma.$disconnect();
    }
  };
}

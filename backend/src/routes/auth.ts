import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AuthRequest } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/auth/register - 注册
router.post('/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '请填写所有必填字段' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: '请输入有效的邮箱地址' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: '密码不能少于8位' });
  }

  // 检查邮箱是否已注册
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: '该邮箱已注册，请直接登录' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: email.split('@')[0],
      subscription: {
        create: { plan: 'FREE' }
      }
    }
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
  );

  res.status(201).json({
    message: '注册成功',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: 'FREE',
      onboardingCompleted: false,
    }
  });
});

// POST /api/auth/login - 登录
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: '请输入邮箱和密码' });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { subscription: true }
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: '邮箱或密码错误' });
  }

  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ message: '账号已被封禁，请联系客服' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as any
  );

  res.json({
    message: '登录成功',
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.subscription?.plan || 'FREE',
      onboardingCompleted: false,
    }
  });
});

// GET /api/auth/me - 获取当前用户信息
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: {
      subscription: true,
      onboarding: true,
    }
  });

  if (!user) return res.status(404).json({ message: '用户不存在' });

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    plan: user.subscription?.plan || 'FREE',
    consultationsLeft: user.subscription?.consultationsLeft || 0,
    onboardingCompleted: !!user.onboarding?.completedAt,
    onboarding: user.onboarding,
    createdAt: user.createdAt,
  });
});

// PUT /api/auth/profile - 更新个人信息
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  const { name, avatarUrl } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { name, avatarUrl }
  });

  res.json({ message: '更新成功', user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl } });
});

// POST /api/auth/change-password - 修改密码
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: '密码格式不正确' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user || !(await bcrypt.compare(oldPassword, user.passwordHash))) {
    return res.status(400).json({ message: '原密码错误' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) }
  });

  res.json({ message: '密码修改成功' });
});

export default router;

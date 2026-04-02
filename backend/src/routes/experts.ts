import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate, requireSubscription } from '../middleware/auth';
import { AuthRequest } from '../types';
import {
  sendBookingSubmitted,
  sendBookingConfirmed,
  sendBookingCancelled,
  sendSummaryUploaded,
} from '../services/emailService';

const router = Router();

// GET /api/experts - 获取专家列表
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const { industry } = req.query as { industry?: string };

  const experts = await prisma.expert.findMany({
    where: {
      isActive: true,
      ...(industry ? { industries: { has: industry } } : {})
    },
    orderBy: [{ rating: 'desc' }, { totalBookings: 'desc' }],
    select: {
      id: true, name: true, avatar: true, title: true, bio: true,
      industries: true, rating: true, totalBookings: true,
    }
  });

  res.json(experts);
});

// GET /api/experts/:id - 专家详情
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const expert = await prisma.expert.findUnique({
    where: { id: req.params.id, isActive: true },
    include: {
      slots: {
        where: {
          isBooked: false,
          startTime: { gt: new Date() }
        },
        orderBy: { startTime: 'asc' },
        take: 30,
      }
    }
  });

  if (!expert) return res.status(404).json({ message: '专家不存在' });

  res.json({
    ...expert,
    slots: expert.slots.map(s => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
    }))
  });
});

// POST /api/experts/bookings - 创建预约（999套餐专属）
router.post(
  '/bookings',
  authenticate,
  requireSubscription(['ADVANCED']),
  async (req: AuthRequest, res: Response) => {
    const { expertId, slotId, name, wechat, phone, city, industry, description } = req.body;
    const userId = req.user!.userId;

    if (!expertId || !slotId || !name || !wechat || !phone || !city || !industry || !description) {
      return res.status(400).json({ message: '请填写所有必填字段' });
    }

    if (description.length > 200) {
      return res.status(400).json({ message: '咨询事宜不超过200字' });
    }

    // 检查预约次数
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    if (!subscription || subscription.consultationsLeft <= 0) {
      return res.status(400).json({ message: '预约次数已用完' });
    }

    // 检查时间槽
    const slot = await prisma.expertSlot.findUnique({
      where: { id: slotId, expertId, isBooked: false }
    });
    if (!slot) return res.status(400).json({ message: '该时间槽不可用' });

    const expert = await prisma.expert.findUnique({ where: { id: expertId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!expert || !user) return res.status(404).json({ message: '数据不存在' });

    // 创建预约
    const booking = await prisma.booking.create({
      data: {
        userId, expertId, slotId,
        name, wechat, phone, city, industry, description,
        status: 'PENDING',
      }
    });

    // 标记时间槽已预约
    await prisma.expertSlot.update({
      where: { id: slotId },
      data: { isBooked: true }
    });

    // 扣减预约次数
    await prisma.subscription.update({
      where: { userId },
      data: {
        consultationsLeft: { decrement: 1 },
        consultationsUsed: { increment: 1 },
      }
    });

    // 发送邮件通知
    const dateStr = slot.startTime.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    await sendBookingSubmitted(
      user.email,
      process.env.SMTP_USER!,
      {
        expertName: expert.name,
        userName: name,
        date: dateStr,
        description,
        bookingId: booking.id,
      }
    );

    res.status(201).json({
      message: '预约提交成功，专家将在24小时内确认',
      bookingId: booking.id,
    });
  }
);

// GET /api/experts/bookings/my - 我的预约列表
router.get('/bookings/my', authenticate, async (req: AuthRequest, res: Response) => {
  const bookings = await prisma.booking.findMany({
    where: { userId: req.user!.userId },
    include: {
      expert: { select: { name: true, avatar: true, title: true } },
      slot: { select: { startTime: true, endTime: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(bookings);
});

// GET /api/experts/bookings/:id - 预约详情
router.get('/bookings/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: {
      expert: true,
      slot: true,
      emailLogs: {
        orderBy: { createdAt: 'asc' },
        select: { trigger: true, status: true, sentAt: true, createdAt: true }
      }
    }
  });

  if (!booking) return res.status(404).json({ message: '预约不存在' });
  res.json(booking);
});

// POST /api/experts/bookings/:id/cancel - 取消预约
router.post('/bookings/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, userId },
    include: {
      expert: true,
      slot: true,
    }
  });

  if (!booking) return res.status(404).json({ message: '预约不存在' });
  if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
    return res.status(400).json({ message: '当前状态不可取消' });
  }

  // 判断是否在24小时前
  const now = new Date();
  const hoursBeforeConsult = (booking.slot.startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const refundCredits = hoursBeforeConsult >= 24;

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED', cancelReason: req.body.reason || '' }
  });

  // 释放时间槽
  await prisma.expertSlot.update({
    where: { id: booking.slotId },
    data: { isBooked: false }
  });

  // 归还次数
  if (refundCredits) {
    await prisma.subscription.update({
      where: { userId },
      data: {
        consultationsLeft: { increment: 1 },
        consultationsUsed: { decrement: 1 },
      }
    });
  }

  // 发邮件
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const dateStr = booking.slot.startTime.toLocaleString('zh-CN');

  await sendBookingCancelled(
    user!.email,
    process.env.SMTP_USER!,
    {
      expertName: booking.expert.name,
      userName: booking.name,
      date: dateStr,
      bookingId: booking.id,
      refundCredits,
    }
  );

  res.json({ message: '预约已取消', refundCredits });
});

// POST /api/experts/bookings/:id/rate - 评价
router.post('/bookings/:id/rate', authenticate, async (req: AuthRequest, res: Response) => {
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: '评分必须在1-5之间' });
  }

  const booking = await prisma.booking.findFirst({
    where: { id: req.params.id, userId: req.user!.userId, status: 'COMPLETED' }
  });

  if (!booking) return res.status(404).json({ message: '预约不存在或未完成' });
  if (booking.rating) return res.status(400).json({ message: '已评价过' });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { rating }
  });

  // 更新专家评分（简单平均）
  const allBookings = await prisma.booking.findMany({
    where: { expertId: booking.expertId, rating: { not: null } },
    select: { rating: true }
  });
  const avgRating = allBookings.reduce((s, b) => s + (b.rating || 0), 0) / allBookings.length;

  await prisma.expert.update({
    where: { id: booking.expertId },
    data: { rating: Math.round(avgRating * 10) / 10 }
  });

  res.json({ message: '评价成功，感谢您的反馈！' });
});

export default router;

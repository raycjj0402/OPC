import { Router, Response } from 'express';
import prisma from '../../utils/prisma';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { AuthRequest } from '../../types';

const router = Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard - 数据概览
router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    todayUsers,
    todayOrders,
    totalUsers,
    totalRevenue,
    pendingBookings,
    basicUsers,
    advancedUsers,
    todayBasicRevenue,
    todayAdvancedRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart }, status: 'PAID' },
      select: { amount: true, plan: true }
    }),
    prisma.user.count(),
    prisma.order.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.subscription.count({ where: { plan: 'BASIC' } }),
    prisma.subscription.count({ where: { plan: 'ADVANCED' } }),
    prisma.order.aggregate({
      where: { status: 'PAID', plan: 'BASIC', createdAt: { gte: todayStart } },
      _sum: { amount: true }
    }),
    prisma.order.aggregate({
      where: { status: 'PAID', plan: 'ADVANCED', createdAt: { gte: todayStart } },
      _sum: { amount: true }
    }),
  ]);

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.amount, 0);
  const todayBasicCount = todayOrders.filter(o => o.plan === 'BASIC').length;
  const todayAdvancedCount = todayOrders.filter(o => o.plan === 'ADVANCED').length;

  // 7天趋势数据
  const trend = await Promise.all(
    Array.from({ length: 7 }, (_, i) => {
      const date = new Date(todayStart);
      date.setDate(date.getDate() - (6 - i));
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      return Promise.all([
        prisma.user.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.order.count({ where: { status: 'PAID', createdAt: { gte: date, lt: nextDate } } }),
        prisma.order.aggregate({
          where: { status: 'PAID', createdAt: { gte: date, lt: nextDate } },
          _sum: { amount: true }
        }),
      ]).then(([users, orders, revenue]) => ({
        date: date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
        users,
        orders,
        revenue: (revenue._sum.amount || 0) / 100,
      }));
    })
  );

  // 城市分布
  const cityDistribution = await prisma.onboarding.groupBy({
    by: ['city'],
    _count: { city: true },
    orderBy: { _count: { city: 'desc' } }
  });

  // 行业分布（从onboarding中提取）
  const onboardings = await prisma.onboarding.findMany({
    select: { industries: true }
  });
  const industryCount: Record<string, number> = {};
  onboardings.forEach(o => {
    o.industries.forEach(ind => {
      const key = ind.startsWith('其他:') ? '其他' : ind;
      industryCount[key] = (industryCount[key] || 0) + 1;
    });
  });

  res.json({
    summary: {
      todayNewUsers: todayUsers,
      todayBasicOrders: todayBasicCount,
      todayAdvancedOrders: todayAdvancedCount,
      todayRevenue: todayRevenue / 100,
      totalUsers,
      basicUsers,
      advancedUsers,
      totalRevenue: (totalRevenue._sum.amount || 0) / 100,
      pendingBookings,
    },
    trend,
    cityDistribution: cityDistribution.map(c => ({ city: c.city, count: c._count.city })),
    industryDistribution: Object.entries(industryCount).map(([name, value]) => ({ name, value })),
  });
});

// GET /api/admin/users - 用户列表
router.get('/users', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', keyword, plan, city, status } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { email: { contains: keyword, mode: 'insensitive' } },
      { id: { contains: keyword } }
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: true,
        onboarding: { select: { city: true, industries: true } },
        _count: { select: { lessonProgress: true, bookings: true } },
      }
    }),
    prisma.user.count({ where })
  ]);

  // 过滤套餐和城市（在应用层处理，因为这些在关联表中）
  let filtered = users;
  if (plan) filtered = filtered.filter(u => u.subscription?.plan === plan);
  if (city) filtered = filtered.filter(u => u.onboarding?.city === city);

  res.json({
    data: filtered.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      status: u.status,
      plan: u.subscription?.plan || 'FREE',
      paidAt: u.subscription?.paidAt,
      city: u.onboarding?.city,
      industries: u.onboarding?.industries,
      lessonCount: u._count.lessonProgress,
      bookingCount: u._count.bookings,
      consultationsLeft: u.subscription?.consultationsLeft || 0,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /api/admin/users/:id - 用户详情
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      subscription: {
        include: { orders: { orderBy: { createdAt: 'desc' } } }
      },
      onboarding: true,
      lessonProgress: {
        where: { completed: true },
        include: {
          lesson: {
            include: { chapter: { include: { module: { select: { title: true } } } } }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      },
      bookings: {
        include: { expert: { select: { name: true } }, slot: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) return res.status(404).json({ message: '用户不存在' });
  res.json(user);
});

// PATCH /api/admin/users/:id/status - 修改用户状态
router.patch('/users/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    return res.status(400).json({ message: '无效状态' });
  }

  await prisma.user.update({ where: { id: req.params.id }, data: { status } });
  res.json({ message: '状态已更新' });
});

// GET /api/admin/orders - 订单列表
router.get('/orders', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', status, plan } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) where.status = status;
  if (plan) where.plan = plan;

  const [orders, total, revenue] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: {
          include: { user: { select: { email: true, name: true } } }
        }
      }
    }),
    prisma.order.count({ where }),
    prisma.order.aggregate({ where: { ...where, status: 'PAID' }, _sum: { amount: true } }),
  ]);

  res.json({
    data: orders.map(o => ({
      id: o.id,
      orderNo: o.orderNo,
      userEmail: o.subscription.user.email,
      userName: o.subscription.user.name,
      plan: o.plan,
      orderType: o.orderType,
      amount: o.amount / 100,
      paymentMethod: o.paymentMethod,
      status: o.status,
      refundReason: o.refundReason,
      createdAt: o.createdAt,
    })),
    total,
    totalRevenue: (revenue._sum.amount || 0) / 100,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// POST /api/admin/orders/:id/refund - 退款处理
router.post('/orders/:id/refund', async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  if (!reason) return res.status(400).json({ message: '请填写退款原因' });

  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { subscription: { include: { user: true } } }
  });

  if (!order || order.status !== 'PAID') {
    return res.status(400).json({ message: '订单状态不允许退款' });
  }

  // 处理退款（实际需调用支付接口）
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'REFUNDED', refundReason: reason, refundedAt: new Date() }
  });

  // 关闭用户权益
  await prisma.subscription.update({
    where: { id: order.subscriptionId },
    data: { plan: 'FREE' }
  });

  await prisma.user.update({
    where: { id: order.subscription.userId },
    data: { status: 'REFUNDED' }
  });

  res.json({ message: '退款处理成功' });
});

// GET /api/admin/bookings - 预约管理列表
router.get('/bookings', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', status } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } },
        expert: { select: { name: true } },
        slot: { select: { startTime: true, endTime: true } },
        emailLogs: { select: { trigger: true, status: true } }
      }
    }),
    prisma.booking.count({ where })
  ]);

  res.json({
    data: bookings.map(b => ({
      id: b.id,
      userEmail: b.user.email,
      userName: b.name,
      expertName: b.expert.name,
      industry: b.industry,
      slotTime: b.slot.startTime,
      descriptionPreview: b.description.slice(0, 50),
      status: b.status,
      emailStatus: b.emailLogs.some(l => l.status === 'FAILED') ? 'PARTIAL_FAILED' : 'OK',
      createdAt: b.createdAt,
    })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// PATCH /api/admin/bookings/:id/status - 更新预约状态
router.patch('/bookings/:id/status', async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: '无效状态' });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { user: true, expert: true, slot: true }
  });

  if (!booking) return res.status(404).json({ message: '预约不存在' });

  await prisma.booking.update({ where: { id: booking.id }, data: { status } });

  // 发送确认邮件
  if (status === 'CONFIRMED') {
    const dateStr = booking.slot.startTime.toLocaleString('zh-CN');
    await sendBookingConfirmed(booking.user.email, {
      expertName: booking.expert.name,
      userName: booking.name,
      date: dateStr,
      bookingId: booking.id,
    });
  }

  res.json({ message: '状态已更新' });
});

// POST /api/admin/bookings/:id/summary - 上传会后总结
router.post('/bookings/:id/summary', async (req: AuthRequest, res: Response) => {
  const { summaryUrl } = req.body;
  if (!summaryUrl) return res.status(400).json({ message: '请提供文档链接' });

  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { user: true, expert: true }
  });

  if (!booking) return res.status(404).json({ message: '预约不存在' });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { summaryDoc: summaryUrl, status: 'COMPLETED' }
  });

  await sendSummaryUploaded(booking.user.email, {
    expertName: booking.expert.name,
    bookingId: booking.id,
    summaryUrl,
  });

  res.json({ message: '总结文档已上传，已通知用户' });
});

// GET /api/admin/email-logs - 邮件日志
router.get('/email-logs', async (req: AuthRequest, res: Response) => {
  const { page = '1', status } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const skip = (pageNum - 1) * 20;

  const where: any = {};
  if (status) where.status = status;

  const [logs, total] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      skip,
      take: 20,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.emailLog.count({ where })
  ]);

  res.json({
    data: logs,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / 20),
  });
});

// POST /api/admin/email-logs/:id/retry - 重试发送
router.post('/email-logs/:id/retry', async (req: AuthRequest, res: Response) => {
  const log = await prisma.emailLog.findUnique({ where: { id: req.params.id } });
  if (!log || log.status !== 'FAILED') {
    return res.status(400).json({ message: '只能重试失败的邮件' });
  }

  // 重置状态（实际需要重新发送邮件）
  await prisma.emailLog.update({
    where: { id: log.id },
    data: { status: 'PENDING' }
  });

  res.json({ message: '已加入重试队列' });
});

// 导出函数（供其他路由使用）
async function sendBookingConfirmed(userEmail: string, data: any) {
  const { sendBookingConfirmed: send } = await import('../../services/emailService');
  return send(userEmail, data);
}

async function sendSummaryUploaded(userEmail: string, data: any) {
  const { sendSummaryUploaded: send } = await import('../../services/emailService');
  return send(userEmail, data);
}

export default router;

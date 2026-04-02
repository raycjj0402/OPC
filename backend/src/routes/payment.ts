import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest, PLAN_PRICES } from '../types';
import { sendPaymentSuccess } from '../services/emailService';

const router = Router();

// GET /api/payment/plans - 获取套餐信息
router.get('/plans', async (_req, res) => {
  res.json([
    {
      id: 'BASIC',
      name: '基础套餐',
      price: 199,
      originalPrice: null,
      features: [
        '个性化学习模块',
        '政府资源库（7城市覆盖）',
        'AI工具指南',
        '行业落地方法论',
        '开发资源中心',
        '获客方法论',
        'OPC社区权限',
      ],
      highlight: false,
    },
    {
      id: 'ADVANCED',
      name: '进阶套餐',
      price: 999,
      originalPrice: null,
      features: [
        '基础套餐全部权益',
        '2次行业专家1对1深度咨询',
        '每次约60分钟',
        '会后总结文档',
        '专家匹配服务',
        '优先客服通道',
      ],
      highlight: true,
    }
  ]);
});

// POST /api/payment/create-order - 创建订单
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
  const { plan, paymentMethod } = req.body;

  if (!['BASIC', 'ADVANCED'].includes(plan)) {
    return res.status(400).json({ message: '无效的套餐类型' });
  }
  if (!['WECHAT', 'ALIPAY'].includes(paymentMethod)) {
    return res.status(400).json({ message: '请选择支付方式' });
  }

  const userId = req.user!.userId;
  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  if (!subscription) {
    return res.status(400).json({ message: '用户信息异常' });
  }

  // 已经是该套餐
  if (subscription.plan === plan) {
    return res.status(400).json({ message: '您已拥有该套餐' });
  }

  // 判断是新购还是升级
  let orderType: 'NEW' | 'UPGRADE' = 'NEW';
  let amount = PLAN_PRICES[plan as keyof typeof PLAN_PRICES];

  if (subscription.plan === 'BASIC' && plan === 'ADVANCED') {
    orderType = 'UPGRADE';
    amount = 80000; // 补差价¥800
  }

  const orderNo = `OPC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const order = await prisma.order.create({
    data: {
      orderNo,
      subscriptionId: subscription.id,
      amount,
      plan: plan as any,
      orderType,
      paymentMethod: paymentMethod as any,
      status: 'PENDING',
    }
  });

  // 模拟支付：在开发环境直接返回支付链接（实际需接入微信/支付宝SDK）
  const mockPayUrl = `${process.env.FRONTEND_URL}/payment/mock?orderId=${order.id}&amount=${amount / 100}`;

  res.json({
    orderId: order.id,
    orderNo,
    amount: amount / 100,
    payUrl: mockPayUrl,
    qrCode: `mock_qr_${order.id}`, // 实际需生成二维码
  });
});

// POST /api/payment/callback - 支付回调（模拟）
router.post('/callback', async (req, res) => {
  const { orderId, status } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { subscription: { include: { user: true } } }
  });

  if (!order) return res.status(404).json({ message: '订单不存在' });
  if (order.status !== 'PENDING') return res.status(400).json({ message: '订单状态异常' });

  if (status === 'SUCCESS') {
    // 更新订单状态
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID', paymentId: `mock_${Date.now()}` }
    });

    // 更新订阅信息
    const plan = order.plan;
    const consultationsLeft = plan === 'ADVANCED' ? 2 : 0;

    await prisma.subscription.update({
      where: { id: order.subscriptionId },
      data: {
        plan,
        paidAt: new Date(),
        consultationsLeft,
      }
    });

    // 发送付款成功邮件
    const planName = plan === 'BASIC' ? '基础套餐 (¥199)' : '进阶套餐 (¥999)';
    const amount = (order.amount / 100).toFixed(0);
    await sendPaymentSuccess(order.subscription.user.email, planName, amount);

    return res.json({ message: '支付成功', redirectUrl: '/onboarding' });
  }

  res.status(400).json({ message: '支付失败' });
});

// GET /api/payment/order/:id - 查询订单状态
router.get('/order/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const order = await prisma.order.findFirst({
    where: {
      id: req.params.id,
      subscription: { userId: req.user!.userId }
    }
  });

  if (!order) return res.status(404).json({ message: '订单不存在' });

  res.json({
    id: order.id,
    orderNo: order.orderNo,
    amount: order.amount / 100,
    plan: order.plan,
    status: order.status,
    createdAt: order.createdAt,
  });
});

// POST /api/payment/upgrade - 套餐升级
router.post('/upgrade', authenticate, async (req: AuthRequest, res: Response) => {
  const { paymentMethod } = req.body;
  const userId = req.user!.userId;

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  if (!subscription || subscription.plan !== 'BASIC') {
    return res.status(400).json({ message: '只有基础套餐用户可以升级' });
  }

  const orderNo = `OPC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const order = await prisma.order.create({
    data: {
      orderNo,
      subscriptionId: subscription.id,
      amount: 80000, // ¥800
      plan: 'ADVANCED',
      orderType: 'UPGRADE',
      paymentMethod: paymentMethod || 'WECHAT',
      status: 'PENDING',
    }
  });

  const mockPayUrl = `${process.env.FRONTEND_URL}/payment/mock?orderId=${order.id}&amount=800`;

  res.json({
    orderId: order.id,
    orderNo,
    amount: 800,
    payUrl: mockPayUrl,
  });
});

// POST /api/payment/invoice - 申请发票
router.post('/invoice', authenticate, async (req: AuthRequest, res: Response) => {
  const { orderId, title, taxNo, email } = req.body;

  if (!orderId || !title || !email) {
    return res.status(400).json({ message: '请填写完整发票信息' });
  }

  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      subscription: { userId: req.user!.userId },
      status: 'PAID',
    }
  });

  if (!order) return res.status(404).json({ message: '订单不存在或未支付' });

  const existing = await prisma.invoiceRequest.findUnique({ where: { orderId } });
  if (existing) return res.status(400).json({ message: '该订单已申请过发票' });

  await prisma.invoiceRequest.create({
    data: {
      orderId,
      userId: req.user!.userId,
      title,
      taxNo,
      email,
    }
  });

  res.json({ message: '发票申请已提交，将在3个工作日内发送至您的邮箱' });
});

export default router;

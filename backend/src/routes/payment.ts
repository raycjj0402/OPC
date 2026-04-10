import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest, FREE_COUPON_CODE, PLAN_PRICES } from '../types';
import { sendPaymentSuccess } from '../services/emailService';
import {
  buildGatewayUrl,
  requestGatewayApiPayment,
  signGatewayPayload,
  verifyGatewayPayload,
} from '../services/paymentGatewayService';

const router = Router();
const GATEWAY_PAGE_URL = process.env.PAYMENT_GATEWAY_URL || 'https://mzf.jzmohe.com/submit.php';
const GATEWAY_API_URL = process.env.PAYMENT_GATEWAY_API_URL || 'https://mzf.jzmohe.com/mapi.php';
const GATEWAY_BASE_URL = process.env.PAYMENT_GATEWAY_BASE_URL || 'https://mzf.jzmohe.com';
const PLAN_LABELS = {
  BASIC: '基础套餐',
  ADVANCED: '进阶套餐',
} as const;
const GATEWAY_TYPE_MAP = {
  ALIPAY: 'alipay',
  WECHAT: 'wxpay',
} as const;

function getBackendPublicUrl(req: Request) {
  return (process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function getFrontendPublicUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function normalizeFlatPayload(input: unknown) {
  const source = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => {
      if (Array.isArray(value)) {
        return [key, String(value[0] ?? '')];
      }
      return [key, value == null ? '' : String(value)];
    })
  );
}

function resolveGatewayMerchantConfig() {
  return {
    pid: process.env.PAYMENT_MERCHANT_ID || '',
    key: process.env.PAYMENT_MERCHANT_KEY || '',
    siteName: process.env.PAYMENT_SITE_NAME || '',
    mode: (process.env.PAYMENT_GATEWAY_MODE || 'page').toLowerCase(),
  };
}

function assertGatewayConfigured() {
  const config = resolveGatewayMerchantConfig();

  if (!config.pid || !config.key) {
    throw new Error('支付通道未配置完成，请补充 PAYMENT_MERCHANT_ID 和 PAYMENT_MERCHANT_KEY');
  }

  return config;
}

function getPlanAmount(currentPlan: string, targetPlan: 'BASIC' | 'ADVANCED') {
  if (currentPlan === 'BASIC' && targetPlan === 'ADVANCED') {
    return {
      orderType: 'UPGRADE' as const,
      amount: 5000,
    };
  }

  return {
    orderType: 'NEW' as const,
    amount: PLAN_PRICES[targetPlan],
  };
}

function buildGatewayPaymentFields(params: {
  orderNo: string;
  amount: number;
  plan: 'BASIC' | 'ADVANCED';
  paymentMethod: 'ALIPAY' | 'WECHAT';
  notifyUrl: string;
  returnUrl: string;
}) {
  const merchant = assertGatewayConfigured();
  const payload = {
    pid: merchant.pid,
    type: GATEWAY_TYPE_MAP[params.paymentMethod],
    out_trade_no: params.orderNo,
    notify_url: params.notifyUrl,
    return_url: params.returnUrl,
    name: `noif ${PLAN_LABELS[params.plan]}`,
    money: (params.amount / 100).toFixed(2),
    ...(merchant.siteName ? { sitename: merchant.siteName } : {}),
  };
  const sign = signGatewayPayload(payload, merchant.key);

  return {
    ...payload,
    sign,
    sign_type: 'MD5',
  };
}

function isGatewaySuccess(payload: Record<string, string>) {
  return String(payload.trade_status || '')
    .trim()
    .toUpperCase() === 'TRADE_SUCCESS';
}

async function activatePaidOrder(orderId: string, paymentId?: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { subscription: { include: { user: true } } },
  });

  if (!order) {
    return null;
  }

  if (order.status === 'PAID') {
    return order;
  }

  const plan = order.plan;
  const consultationsLeft = plan === 'ADVANCED' ? 2 : 0;

  const [updatedOrder] = await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paymentId: paymentId || order.paymentId || `pay_${Date.now()}`,
      },
      include: { subscription: { include: { user: true } } },
    }),
    prisma.subscription.update({
      where: { id: order.subscriptionId },
      data: {
        plan,
        paidAt: new Date(),
        consultationsLeft,
      },
    }),
  ]);

  const planName = plan === 'BASIC' ? '基础套餐 (¥49.99)' : '进阶套餐 (¥99.99)';
  const amount = (updatedOrder.amount / 100).toFixed(2);
  await sendPaymentSuccess(updatedOrder.subscription.user.email, planName, amount);

  return updatedOrder;
}

function buildPaymentResultUrl(orderId: string, status: 'success' | 'pending' | 'failed' | 'invalid') {
  const url = new URL('/payment/result', `${getFrontendPublicUrl()}/`);
  url.searchParams.set('orderId', orderId);
  url.searchParams.set('status', status);
  return url.toString();
}

function buildPaymentCheckoutUrl(orderId: string) {
  const url = new URL('/payment/checkout', `${getFrontendPublicUrl()}/`);
  url.searchParams.set('orderId', orderId);
  return url.toString();
}

function resolveGatewayImageUrl(codeUrl?: string) {
  if (!codeUrl) {
    return '';
  }

  try {
    return new URL(codeUrl, `${GATEWAY_BASE_URL}/`).toString();
  } catch {
    return codeUrl;
  }
}

async function createGatewayPayment(params: {
  req: Request;
  orderId: string;
  orderNo: string;
  amount: number;
  plan: 'BASIC' | 'ADVANCED';
  paymentMethod: 'ALIPAY' | 'WECHAT';
}) {
  const backendPublicUrl = getBackendPublicUrl(params.req);
  const gatewayFields = buildGatewayPaymentFields({
    orderNo: params.orderNo,
    amount: params.amount,
    plan: params.plan,
    paymentMethod: params.paymentMethod,
    notifyUrl: `${backendPublicUrl}/api/payment/notify`,
    returnUrl: `${backendPublicUrl}/api/payment/return?orderId=${params.orderId}`,
  });
  const merchant = resolveGatewayMerchantConfig();

  if (merchant.mode === 'api') {
    const gatewayResponse = await requestGatewayApiPayment(GATEWAY_API_URL, gatewayFields);
    const code = Number(gatewayResponse.code);
    if (code !== 200 && code !== 1) {
      throw new Error(gatewayResponse.msg || '支付网关下单失败');
    }

    return {
      orderId: params.orderId,
      orderNo: params.orderNo,
      amount: params.amount / 100,
      couponApplied: false,
      paymentMode: 'api_qr',
      gateway: {
        tradeNo: String(gatewayResponse.trade_no || ''),
        type: String(gatewayResponse.type || gatewayFields.type),
        qrcode: String(gatewayResponse.qrcode || ''),
        codeUrl: resolveGatewayImageUrl(String(gatewayResponse.code_url || '')),
        checkoutUrl: buildPaymentCheckoutUrl(params.orderId),
        pollHint: '请在扫码或拉起支付后保留此页面，系统会自动同步支付结果。',
      },
    };
  }

  return {
    orderId: params.orderId,
    orderNo: params.orderNo,
    amount: params.amount / 100,
    couponApplied: false,
    paymentMode: 'redirect_form',
    payUrl: buildGatewayUrl(GATEWAY_PAGE_URL, gatewayFields),
    gateway: {
      action: GATEWAY_PAGE_URL,
      method: 'POST',
      fields: gatewayFields,
    },
  };
}

// GET /api/payment/plans - 获取套餐信息
router.get('/plans', async (_req, res) => {
  res.json([
    {
      id: 'BASIC',
      name: '基础套餐',
      price: 49.99,
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
      price: 99.99,
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

router.post('/validate-coupon', authenticate, async (req: AuthRequest, res: Response) => {
  const { couponCode } = req.body;
  const normalizedCode = String(couponCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    return res.status(400).json({ message: '请输入优惠码' });
  }

  if (normalizedCode !== FREE_COUPON_CODE) {
    return res.status(400).json({ message: '优惠码无效' });
  }

  res.json({
    valid: true,
    couponCode: normalizedCode,
    discountType: 'FULL_DISCOUNT',
    message: '优惠码已生效，当前套餐可 0 元解锁',
  });
});

// POST /api/payment/create-order - 创建订单
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
  const { plan, paymentMethod, couponCode } = req.body;

  if (!['BASIC', 'ADVANCED'].includes(plan)) {
    return res.status(400).json({ message: '无效的套餐类型' });
  }
  if (!['WECHAT', 'ALIPAY'].includes(paymentMethod)) {
    return res.status(400).json({ message: '请选择支付方式' });
  }

  const userId = req.user!.userId;
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  const normalizedCouponCode = String(couponCode || '').trim().toUpperCase();
  const hasFreeCoupon = normalizedCouponCode === FREE_COUPON_CODE;

  if (!subscription) {
    return res.status(400).json({ message: '用户信息异常' });
  }

  // 已经是该套餐
  if (subscription.plan === plan) {
    return res.status(400).json({ message: '您已拥有该套餐' });
  }

  const { orderType, amount: defaultAmount } = getPlanAmount(subscription.plan, plan as 'BASIC' | 'ADVANCED');
  let amount = defaultAmount;

  if (hasFreeCoupon) {
    amount = 0;
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

  if (amount === 0) {
    await activatePaidOrder(order.id, `coupon_${order.orderNo}`);
    return res.json({
      orderId: order.id,
      orderNo,
      amount: 0,
      couponApplied: true,
      paymentMode: 'free',
      redirectUrl: '/onboarding',
    });
  }

  try {
    return res.json(
      await createGatewayPayment({
        req,
        orderId: order.id,
        orderNo,
        amount,
        plan: plan as 'BASIC' | 'ADVANCED',
        paymentMethod: paymentMethod as 'ALIPAY' | 'WECHAT',
      })
    );
  } catch (error) {
    await prisma.order.delete({ where: { id: order.id } });
    return res.status(500).json({
      message: error instanceof Error ? error.message : '支付配置异常，请稍后重试',
    });
  }
});

// POST /api/payment/callback - 本地/测试回调
router.post('/callback', async (req, res) => {
  const { orderId, status } = req.body;

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) return res.status(404).json({ message: '订单不存在' });
  if (order.status === 'PAID') return res.json({ message: '订单已支付', redirectUrl: '/onboarding' });

  if (status === 'SUCCESS') {
    await activatePaidOrder(orderId, `manual_${Date.now()}`);
    return res.json({ message: '支付成功', redirectUrl: '/onboarding' });
  }

  res.status(400).json({ message: '支付失败' });
});

// POST /api/payment/notify - 第三方异步通知
router.all('/notify', async (req: Request, res: Response) => {
  const payload = normalizeFlatPayload(req.method === 'GET' ? req.query : req.body);
  const merchant = resolveGatewayMerchantConfig();
  const orderNo = payload.out_trade_no || payload.order_no || payload.orderNo;

  if (!merchant.key) {
    return res.status(500).send('fail');
  }

  if (!orderNo) {
    return res.status(400).send('fail');
  }

  if (!verifyGatewayPayload(payload, merchant.key)) {
    return res.status(400).send('fail');
  }

  const order = await prisma.order.findUnique({ where: { orderNo } });
  if (!order) {
    return res.status(404).send('fail');
  }

  if (isGatewaySuccess(payload)) {
    await activatePaidOrder(
      order.id,
      payload.trade_no || payload.api_trade_no || payload.gateway_trade_no || order.orderNo
    );
  }

  return res.send('success');
});

// GET|POST /api/payment/return - 页面回跳
router.all('/return', async (req: Request, res: Response) => {
  const payload = normalizeFlatPayload(req.method === 'GET' ? req.query : req.body);
  const merchant = resolveGatewayMerchantConfig();
  const orderId = String(payload.orderId || req.query.orderId || '');
  const orderNo = payload.out_trade_no || payload.order_no || payload.orderNo;

  let resolvedOrderId = orderId;
  if (!resolvedOrderId && orderNo) {
    const order = await prisma.order.findUnique({ where: { orderNo } });
    resolvedOrderId = order?.id || '';
  }

  if (!resolvedOrderId) {
    return res.redirect(buildPaymentResultUrl('', 'failed'));
  }

  const signLooksValid = merchant.key ? verifyGatewayPayload(payload, merchant.key) : false;
  const paid = signLooksValid && isGatewaySuccess(payload);

  if (paid) {
    await activatePaidOrder(
      resolvedOrderId,
      payload.trade_no || payload.api_trade_no || payload.gateway_trade_no || orderNo
    );
    return res.redirect(buildPaymentResultUrl(resolvedOrderId, 'success'));
  }

  const fallbackStatus = signLooksValid ? 'pending' : 'invalid';
  return res.redirect(buildPaymentResultUrl(resolvedOrderId, fallbackStatus));
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
  const { paymentMethod, couponCode } = req.body;
  const userId = req.user!.userId;
  const normalizedCouponCode = String(couponCode || '').trim().toUpperCase();
  const hasFreeCoupon = normalizedCouponCode === FREE_COUPON_CODE;

  const subscription = await prisma.subscription.findUnique({ where: { userId } });

  if (!subscription || subscription.plan !== 'BASIC') {
    return res.status(400).json({ message: '只有基础套餐用户可以升级' });
  }

  const orderNo = `OPC${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  const order = await prisma.order.create({
    data: {
      orderNo,
      subscriptionId: subscription.id,
      amount: hasFreeCoupon ? 0 : 5000, // ¥50.00 or ¥0
      plan: 'ADVANCED',
      orderType: 'UPGRADE',
      paymentMethod: paymentMethod || 'WECHAT',
      status: 'PENDING',
    }
  });

  if (hasFreeCoupon) {
    await activatePaidOrder(order.id, `coupon_${order.orderNo}`);
    return res.json({
      orderId: order.id,
      orderNo,
      amount: 0,
      couponApplied: true,
      paymentMode: 'free',
      redirectUrl: '/onboarding',
    });
  }

  try {
    return res.json(
      await createGatewayPayment({
        req,
        orderId: order.id,
        orderNo,
        amount: 5000,
        plan: 'ADVANCED',
        paymentMethod: (paymentMethod || 'WECHAT') as 'ALIPAY' | 'WECHAT',
      })
    );
  } catch (error) {
    await prisma.order.delete({ where: { id: order.id } });
    return res.status(500).json({
      message: error instanceof Error ? error.message : '支付配置异常，请稍后重试',
    });
  }
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

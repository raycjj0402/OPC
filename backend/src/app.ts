import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import authRoutes from './routes/auth';
import paymentRoutes from './routes/payment';
import onboardingRoutes from './routes/onboarding';
import learningRoutes from './routes/learning';
import governmentRoutes from './routes/government';
import expertRoutes from './routes/experts';
import communityRoutes from './routes/community';
import adminRoutes from './routes/admin/index';

const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// 日志
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200,
  message: { message: '请求过于频繁，请稍后再试' },
});
app.use('/api', limiter);

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/government', governmentRoutes);
app.use('/api/experts', expertRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404处理
app.use((_req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// 全局错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误'
  });
});

export default app;

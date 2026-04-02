import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();

// GET /api/government/policies - 获取政策列表
router.get('/policies', authenticate, async (req: AuthRequest, res: Response) => {
  const { city, category, keyword, page = '1', limit = '10' } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { isActive: true };

  if (city) where.city = city;
  if (category) where.category = category;
  if (keyword) {
    where.OR = [
      { title: { contains: keyword, mode: 'insensitive' } },
      { summary: { contains: keyword, mode: 'insensitive' } },
    ];
  }

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        title: true,
        city: true,
        category: true,
        summary: true,
        tags: true,
        publishedAt: true,
        viewCount: true,
      }
    }),
    prisma.policy.count({ where })
  ]);

  // 检查用户是否收藏
  const savedPolicies = await prisma.savedPolicy.findMany({
    where: {
      userId: req.user!.userId,
      policyId: { in: policies.map(p => p.id) }
    },
    select: { policyId: true }
  });
  const savedIds = new Set(savedPolicies.map(s => s.policyId));

  res.json({
    data: policies.map(p => ({ ...p, saved: savedIds.has(p.id) })),
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  });
});

// GET /api/government/policies/:id - 获取政策详情
router.get('/policies/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const policy = await prisma.policy.findUnique({
    where: { id: req.params.id, isActive: true }
  });

  if (!policy) return res.status(404).json({ message: '政策不存在' });

  // 增加浏览量
  await prisma.policy.update({
    where: { id: policy.id },
    data: { viewCount: { increment: 1 } }
  });

  const saved = await prisma.savedPolicy.findUnique({
    where: {
      userId_policyId: { userId: req.user!.userId, policyId: policy.id }
    }
  });

  res.json({ ...policy, saved: !!saved });
});

// POST /api/government/policies/:id/save - 收藏/取消收藏
router.post('/policies/:id/save', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const policyId = req.params.id;

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return res.status(404).json({ message: '政策不存在' });

  const existing = await prisma.savedPolicy.findUnique({
    where: { userId_policyId: { userId, policyId } }
  });

  if (existing) {
    await prisma.savedPolicy.delete({ where: { userId_policyId: { userId, policyId } } });
    return res.json({ saved: false, message: '已取消收藏' });
  }

  await prisma.savedPolicy.create({ data: { userId, policyId } });
  res.json({ saved: true, message: '已收藏' });
});

// GET /api/government/saved - 获取收藏的政策
router.get('/saved', authenticate, async (req: AuthRequest, res: Response) => {
  const saved = await prisma.savedPolicy.findMany({
    where: { userId: req.user!.userId },
    include: {
      policy: {
        select: {
          id: true, title: true, city: true, category: true, summary: true, publishedAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(saved.map(s => ({ ...s.policy, savedAt: s.createdAt })));
});

// POST /api/government/qa - AI问答（模拟RAG）
router.post('/qa', authenticate, async (req: AuthRequest, res: Response) => {
  const { question, city, policyId } = req.body;
  const userId = req.user!.userId;

  if (!question || question.trim().length < 2) {
    return res.status(400).json({ message: '请输入有效问题' });
  }

  // 查找相关政策（简单关键词匹配，实际应用需要向量数据库）
  const keywords = question.split(/[\s，。？！、]+/).filter((w: string) => w.length >= 2);
  const policies = await prisma.policy.findMany({
    where: {
      isActive: true,
      ...(city ? { city } : {}),
      ...(policyId ? { id: policyId } : {
        OR: keywords.flatMap((kw: string) => [
          { title: { contains: kw, mode: 'insensitive' as const } },
          { summary: { contains: kw, mode: 'insensitive' as const } },
          { content: { contains: kw, mode: 'insensitive' as const } },
        ])
      })
    },
    take: 3,
  });

  // 模拟AI回答（实际需接入LLM + RAG）
  let answer = '';
  const sources: any[] = [];

  if (policies.length > 0) {
    const policyInfo = policies.map(p =>
      `【${p.city} · ${p.title}】：${p.summary}`
    ).join('\n\n');

    answer = `根据相关政策文档，为您整理如下回答：\n\n${policyInfo}\n\n如需了解更多详细信息，建议直接查阅政策原文或联系当地主管部门。`;
    sources.push(...policies.map(p => ({
      id: p.id,
      title: p.title,
      city: p.city,
      category: p.category,
    })));
  } else {
    answer = `暂时没有找到与「${question}」直接相关的政策信息。建议您：\n1. 换个关键词重新搜索\n2. 直接浏览对应城市的政策列表\n3. 联系当地创业服务中心获取最新信息`;
  }

  // 保存问答记录
  const qa = await prisma.policyQA.create({
    data: {
      userId,
      policyId: policyId || null,
      question,
      answer,
      sources: sources.length > 0 ? sources : undefined,
    }
  });

  res.json({ id: qa.id, question, answer, sources });
});

// GET /api/government/qa/history - 问答历史
router.get('/qa/history', authenticate, async (req: AuthRequest, res: Response) => {
  const history = await prisma.policyQA.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, question: true, answer: true, sources: true, createdAt: true
    }
  });

  res.json(history);
});

export default router;

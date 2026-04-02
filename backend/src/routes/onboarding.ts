import { Router, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { AuthRequest, SUPPORTED_CITIES, INDUSTRIES, RESOURCE_TYPES } from '../types';
import { generateLearningPath } from '../services/learningPathService';

const router = Router();

// GET /api/onboarding/options - 获取引导选项
router.get('/options', (_req, res) => {
  res.json({
    cities: [
      { name: '北京', province: '直辖市' },
      { name: '上海', province: '直辖市' },
      { name: '广州', province: '广东省' },
      { name: '深圳', province: '广东省' },
      { name: '重庆', province: '直辖市' },
      { name: '杭州', province: '浙江省' },
      { name: '南京', province: '江苏省' },
    ],
    industries: [
      { id: '电商', label: '电商', icon: '🛒', desc: '独立站、平台电商、跨境贸易' },
      { id: '知识付费', label: '知识付费', icon: '📚', desc: '课程、咨询、付费社群' },
      { id: '教育', label: '教育', icon: '🎓', desc: '在线教育、培训、辅导' },
      { id: '金融', label: '金融', icon: '💰', desc: '理财、投资、保险' },
      { id: '开发类产品', label: '开发类产品', icon: '💻', desc: 'SaaS、App、插件工具' },
      { id: '其他', label: '其他', icon: '✨', desc: '自定义创业方向' },
    ],
    resourceTypes: [
      { id: '政府补贴政策', label: '政府补贴政策', icon: '🏛️', desc: '各城市创业补贴、税收优惠' },
      { id: 'AI工具使用', label: 'AI工具使用', icon: '🤖', desc: 'AI工具选型、使用教程、工作流' },
      { id: '行业落地方法论', label: '行业落地方法论', icon: '🗺️', desc: '所在行业的系统经营方法' },
      { id: '产品开发技术', label: '产品开发技术', icon: '⚙️', desc: '产品从0到1的技术路线' },
      { id: '获客与运营', label: '获客与运营', icon: '📈', desc: '流量获取、私域运营、品牌建设' },
    ]
  });
});

// POST /api/onboarding/submit - 提交引导问卷
router.post('/submit', authenticate, async (req: AuthRequest, res: Response) => {
  const { city, industries, resourcePrefs, otherIndustry } = req.body;
  const userId = req.user!.userId;

  // 校验
  if (!city || !SUPPORTED_CITIES.includes(city)) {
    return res.status(400).json({ message: '请选择有效的城市' });
  }

  if (!industries || !Array.isArray(industries) || industries.length < 1 || industries.length > 2) {
    return res.status(400).json({ message: '请选择1-2个创业方向' });
  }

  if (!resourcePrefs || !Array.isArray(resourcePrefs) || resourcePrefs.length < 1) {
    return res.status(400).json({ message: '请至少选择1个感兴趣的资源模块' });
  }

  // 处理「其他」行业
  const processedIndustries = industries.map((i: string) =>
    i === '其他' && otherIndustry ? `其他:${otherIndustry}` : i
  );

  // 保存引导信息
  const onboarding = await prisma.onboarding.upsert({
    where: { userId },
    update: {
      city,
      industries: processedIndustries,
      resourcePrefs,
      completedAt: new Date(),
    },
    create: {
      userId,
      city,
      industries: processedIndustries,
      resourcePrefs,
      completedAt: new Date(),
    }
  });

  // 生成个性化学习路径
  await generateLearningPath(userId, {
    city,
    industries: processedIndustries,
    resourcePrefs,
  });

  res.json({
    message: '引导完成，专属学习路径已生成！',
    onboarding: {
      city: onboarding.city,
      industries: onboarding.industries,
      resourcePrefs: onboarding.resourcePrefs,
    }
  });
});

// PUT /api/onboarding/update - 更新引导设置
router.put('/update', authenticate, async (req: AuthRequest, res: Response) => {
  const { city, industries, resourcePrefs } = req.body;
  const userId = req.user!.userId;

  const existing = await prisma.onboarding.findUnique({ where: { userId } });
  if (!existing) {
    return res.status(400).json({ message: '请先完成引导问卷' });
  }

  const cityChanged = city && city !== existing.city;
  const industriesChanged = industries &&
    JSON.stringify(industries.sort()) !== JSON.stringify([...existing.industries].sort());

  await prisma.onboarding.update({
    where: { userId },
    data: {
      city: city || existing.city,
      industries: industries || existing.industries,
      resourcePrefs: resourcePrefs || existing.resourcePrefs,
    }
  });

  // 如果城市或行业变更，重新生成学习路径
  if (cityChanged || industriesChanged) {
    await generateLearningPath(userId, {
      city: city || existing.city,
      industries: industries || existing.industries,
      resourcePrefs: resourcePrefs || existing.resourcePrefs,
    });
  }

  res.json({
    message: '设置已更新',
    changed: { cityChanged, industriesChanged },
  });
});

export default router;

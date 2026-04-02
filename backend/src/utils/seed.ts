import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据填充...');

  // 创建管理员账号
  const adminHash = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@opc-platform.com' },
    update: {},
    create: {
      email: 'admin@opc-platform.com',
      passwordHash: adminHash,
      name: '平台管理员',
      role: 'ADMIN',
      subscription: { create: { plan: 'FREE' } }
    }
  });
  console.log('✅ 管理员账号:', admin.email);

  // 创建专家数据
  const experts = await Promise.all([
    prisma.expert.upsert({
      where: { id: 'expert-001' },
      update: {},
      create: {
        id: 'expert-001',
        name: '张明远',
        title: '电商创业顾问 · 前阿里P7',
        bio: '拥有10年电商从业经验，曾帮助50+个人创业者实现从0到月销百万的突破。专注独立站、跨境电商和私域运营领域。',
        industries: ['电商', '获客与运营'],
        rating: 4.9,
        totalBookings: 128,
        slots: {
          create: Array.from({ length: 10 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            d.setHours(10, 0, 0, 0);
            const end = new Date(d);
            end.setHours(11, 0, 0, 0);
            return { startTime: d, endTime: end };
          })
        }
      }
    }),
    prisma.expert.upsert({
      where: { id: 'expert-002' },
      update: {},
      create: {
        id: 'expert-002',
        name: '李思雨',
        title: '知识付费创业导师 · 百万IP打造者',
        bio: '知识付费领域连续创业者，个人IP粉丝超50万，课程销售额突破1000万。专注帮助有知识有经验的人实现知识变现。',
        industries: ['知识付费', '教育'],
        rating: 4.8,
        totalBookings: 96,
        slots: {
          create: Array.from({ length: 10 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            d.setHours(14, 0, 0, 0);
            const end = new Date(d);
            end.setHours(15, 0, 0, 0);
            return { startTime: d, endTime: end };
          })
        }
      }
    }),
    prisma.expert.upsert({
      where: { id: 'expert-003' },
      update: {},
      create: {
        id: 'expert-003',
        name: '王浩宇',
        title: 'AI产品创业专家 · 独立开发者',
        bio: '独立开发者出身，主导开发多款SaaS工具，月流水超30万美元。专注AI工具产品化、独立开发变现和出海路径规划。',
        industries: ['开发类产品', 'AI工具'],
        rating: 4.7,
        totalBookings: 64,
        slots: {
          create: Array.from({ length: 10 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            d.setHours(16, 0, 0, 0);
            const end = new Date(d);
            end.setHours(17, 0, 0, 0);
            return { startTime: d, endTime: end };
          })
        }
      }
    }),
  ]);
  console.log(`✅ 创建专家 ${experts.length} 位`);

  // 创建学习模块
  const modules = [
    {
      id: 'mod-govt-bj',
      slug: 'govt-beijing',
      title: '北京创业政策解读',
      description: '深度解析北京市创业扶持政策，包括算力补贴、空间支持、资金启动等',
      icon: '🏛️',
      tags: ['北京', 'all', 'government', 'policy'],
      order: 1,
      chapters: [
        {
          title: '北京算力补贴政策',
          lessons: [
            { title: '北京AI算力补贴申请全流程图解', contentType: 'ARTICLE' as const, duration: 8 },
            { title: '北京中关村创业补贴政策一览', contentType: 'PDF' as const, duration: 5 },
          ]
        },
        {
          title: '北京创业空间资源',
          lessons: [
            { title: '北京孵化器&联合办公选择指南', contentType: 'ARTICLE' as const, duration: 6 },
          ]
        }
      ]
    },
    {
      id: 'mod-govt-sh',
      slug: 'govt-shanghai',
      title: '上海创业政策解读',
      description: '上海市创业补贴政策、科技型小企业优惠政策详解',
      icon: '🏙️',
      tags: ['上海', 'all', 'government', 'policy'],
      order: 2,
      chapters: [
        {
          title: '上海创业扶持政策',
          lessons: [
            { title: '上海科创中心创业政策全梳理', contentType: 'ARTICLE' as const, duration: 10 },
            { title: '上海小额贷款申请流程', contentType: 'ARTICLE' as const, duration: 7 },
          ]
        }
      ]
    },
    {
      id: 'mod-ai-tools',
      slug: 'ai-tools-guide',
      title: 'AI工具创业指南',
      description: '精选20+AI工具，覆盖内容创作、客服、设计、开发等场景的完整使用教程',
      icon: '🤖',
      tags: ['all', 'ai-tools', 'tools'],
      order: 3,
      chapters: [
        {
          title: 'AI内容创作工作流',
          lessons: [
            { title: 'Claude vs GPT-4：一人公司该如何选择AI助手', contentType: 'ARTICLE' as const, duration: 8 },
            { title: '用AI批量生成小红书内容的完整工作流', contentType: 'ARTICLE' as const, duration: 12 },
            { title: 'Midjourney商业设计实战：品牌视觉0成本搞定', contentType: 'VIDEO' as const, duration: 15 },
          ]
        },
        {
          title: 'AI效率工具集',
          lessons: [
            { title: 'Notion AI搭建个人知识管理系统', contentType: 'ARTICLE' as const, duration: 10 },
            { title: '用Zapier+AI自动化你的日常工作流', contentType: 'ARTICLE' as const, duration: 8 },
          ]
        }
      ]
    },
    {
      id: 'mod-ecommerce',
      slug: 'ecommerce-methodology',
      title: '电商创业方法论',
      description: '从选品到运营，覆盖独立站、平台电商、跨境全链路实战方法',
      icon: '🛒',
      tags: ['all', '电商', 'methodology', 'industry'],
      order: 4,
      chapters: [
        {
          title: '独立站从0到1',
          lessons: [
            { title: 'Shopify独立站搭建完整教程（2026版）', contentType: 'ARTICLE' as const, duration: 20 },
            { title: '独立站选品方法论：如何找到好卖的产品', contentType: 'ARTICLE' as const, duration: 12 },
          ]
        },
        {
          title: '跨境电商实战',
          lessons: [
            { title: '亚马逊FBA入门全攻略', contentType: 'VIDEO' as const, duration: 25 },
            { title: '深圳跨境电商政策与仓储服务指南', contentType: 'ARTICLE' as const, duration: 8 },
          ]
        }
      ]
    },
    {
      id: 'mod-knowledge-pay',
      slug: 'knowledge-payment',
      title: '知识付费变现路径',
      description: '从个人IP打造到课程设计，再到私域运营的知识付费全链路方法论',
      icon: '📚',
      tags: ['all', '知识付费', 'methodology', 'industry'],
      order: 5,
      chapters: [
        {
          title: '个人IP打造',
          lessons: [
            { title: '个人IP定位：找到你的差异化标签', contentType: 'ARTICLE' as const, duration: 10 },
            { title: '小红书涨粉：从0到1万粉的完整方法', contentType: 'ARTICLE' as const, duration: 12 },
          ]
        },
        {
          title: '课程产品设计',
          lessons: [
            { title: '知识付费产品设计：如何做一门卖得好的课', contentType: 'ARTICLE' as const, duration: 15 },
            { title: '小鹅通 vs 腾讯课堂：知识付费平台选择指南', contentType: 'TOOL_CARD' as const, duration: 5 },
          ]
        }
      ]
    },
    {
      id: 'mod-growth',
      slug: 'growth-marketing',
      title: '获客与增长方法论',
      description: '覆盖私域、内容、付费投流的全渠道获客策略，适用于各行业一人公司',
      icon: '📈',
      tags: ['all', 'growth', 'marketing'],
      order: 6,
      chapters: [
        {
          title: '私域流量运营',
          lessons: [
            { title: '微信私域冷启动：从0到1000个精准用户', contentType: 'ARTICLE' as const, duration: 12 },
            { title: '企业微信SCRM实战手册', contentType: 'ARTICLE' as const, duration: 10 },
          ]
        },
        {
          title: '内容获客',
          lessons: [
            { title: '小红书获客玩法2026：算法逻辑+爆文公式', contentType: 'ARTICLE' as const, duration: 15 },
            { title: '视频号直播获客：冷启动到月销10万', contentType: 'VIDEO' as const, duration: 20 },
          ]
        }
      ]
    },
    {
      id: 'mod-dev',
      slug: 'development-path',
      title: '产品开发技术路径',
      description: '面向非技术创业者的四阶段开发学习路径，从原型到上线全覆盖',
      icon: '💻',
      tags: ['all', 'development', 'tech'],
      order: 7,
      chapters: [
        {
          title: '阶段一：产品原型',
          lessons: [
            { title: 'Figma原型设计入门：一天学会画产品原型', contentType: 'ARTICLE' as const, duration: 15 },
          ]
        },
        {
          title: '阶段二：AI辅助开发',
          lessons: [
            { title: '用Claude Code实现你的第一个产品功能', contentType: 'ARTICLE' as const, duration: 20 },
            { title: 'Cursor AI编程实战：前端页面10分钟搞定', contentType: 'VIDEO' as const, duration: 18 },
          ]
        },
        {
          title: '阶段三：部署上线',
          lessons: [
            { title: 'Vercel一键部署：让你的产品上线只需5分钟', contentType: 'ARTICLE' as const, duration: 8 },
          ]
        }
      ]
    },
    {
      id: 'mod-finance',
      slug: 'finance-methodology',
      title: '金融赛道创业指南',
      description: '金融类产品合规要求、用户获取策略和变现模式全解析',
      icon: '💰',
      tags: ['all', '金融', 'methodology', 'industry'],
      order: 8,
      chapters: [
        {
          title: '金融创业合规基础',
          lessons: [
            { title: '金融类自媒体的合规红线与风险规避', contentType: 'ARTICLE' as const, duration: 10 },
            { title: 'RIA vs IFA：个人理财顾问的持牌路径', contentType: 'ARTICLE' as const, duration: 8 },
          ]
        }
      ]
    },
  ];

  for (const modData of modules) {
    const { chapters, ...moduleFields } = modData;

    await prisma.module.upsert({
      where: { id: moduleFields.id },
      update: {},
      create: {
        ...moduleFields,
        chapters: {
          create: chapters.map((ch, chIdx) => ({
            title: ch.title,
            order: chIdx,
            lessons: {
              create: ch.lessons.map((lesson, lIdx) => ({
                title: lesson.title,
                contentType: lesson.contentType,
                duration: lesson.duration,
                order: lIdx,
                content: `# ${lesson.title}\n\n这里是课程内容占位文本。实际运营时，运营人员可通过后台CMS系统上传完整的课程内容，支持富文本、图片、视频等多种格式。\n\n## 核心要点\n\n1. 要点一：具体内容由运营团队填充\n2. 要点二：支持多媒体内容嵌入\n3. 要点三：可关联外部资源链接\n\n## 实操步骤\n\n详细的操作步骤将在正式内容上线后展示。`,
              }))
            }
          }))
        }
      }
    });
  }
  console.log(`✅ 创建学习模块 ${modules.length} 个`);

  // 创建政策数据
  const policies = [
    {
      title: '北京市人工智能算力补贴申请指南',
      city: '北京',
      category: 'COMPUTE_SUBSIDY' as const,
      summary: '北京市对中小企业使用AI算力平台给予最高50%补贴，单家企业每年最高补贴50万元。',
      content: '# 北京市人工智能算力补贴政策\n\n## 政策背景\n为加快人工智能产业发展，北京市出台算力补贴政策。\n\n## 补贴对象\n在北京注册的中小企业，使用认定算力平台。\n\n## 补贴标准\n- 基础算力：补贴30%，年上限20万\n- 高级算力：补贴50%，年上限50万\n\n## 申请流程\n1. 企业注册登记\n2. 提交用量证明\n3. 审核公示\n4. 资金拨付',
      tags: ['北京', 'AI', '算力', '补贴', '中小企业'],
    },
    {
      title: '深圳跨境电商扶持政策2026',
      city: '深圳',
      category: 'SERVICE_ECOSYSTEM' as const,
      summary: '深圳前海跨境电商综合试验区为跨境电商企业提供税收优惠、仓储补贴和通关便利化服务。',
      content: '# 深圳跨境电商扶持政策\n\n## 政策范围\n适用于深圳前海、龙华等跨境电商示范区企业。\n\n## 主要优惠\n- 跨境电商零售进口监管试点\n- 仓储物流补贴最高30%\n- 出口退税优化流程\n\n## 适用行业\n跨境B2C、B2B2C电商企业',
      tags: ['深圳', '跨境电商', '前海', '税收优惠'],
    },
    {
      title: '上海科技创业企业认定与优惠政策',
      city: '上海',
      category: 'TAX_INCENTIVE' as const,
      summary: '上海市科技型中小企业认定后可享受15%企业所得税优惠税率，研发费用150%加计扣除。',
      content: '# 上海科技创业企业优惠政策\n\n## 认定条件\n- 注册满1年\n- 研发人员占比不低于10%\n- 年研发投入不低于营收5%\n\n## 主要优惠\n- 企业所得税：15%（普通25%）\n- 研发费用加计扣除：150%\n- 高新技术企业补贴：最高50万',
      tags: ['上海', '科技创业', '税收优惠', '研发'],
    },
    {
      title: '杭州数字经济创业扶持政策',
      city: '杭州',
      category: 'STARTUP_FUND' as const,
      summary: '杭州市对数字经济领域创业企业提供最高100万元无息贷款，以及免费入驻梦想小镇等孵化器资格。',
      content: '# 杭州数字经济创业政策\n\n## 适用范围\n电商、数字营销、SaaS软件等数字经济创业团队。\n\n## 主要支持\n- 梦想小镇免费办公空间\n- 100万元无息创业贷款（3年期）\n- 创业导师对接\n\n## 申请要求\n- 创始人35岁以下\n- 团队不少于3人\n- 杭州注册',
      tags: ['杭州', '数字经济', '创业贷款', '孵化器'],
    },
    {
      title: '广州创业担保贷款政策',
      city: '广州',
      category: 'STARTUP_FUND' as const,
      summary: '广州市对符合条件的个人创业者提供最高30万元创业担保贷款，享受财政贴息，利息几乎为零。',
      content: '# 广州创业担保贷款政策\n\n## 贷款金额\n个人：最高30万元\n合伙企业：最高300万元\n\n## 贷款期限\n2年，可申请延期1年\n\n## 贴息标准\n财政全额贴息，贷款人实际零利率\n\n## 申请渠道\n广州市人社局官网或各区人社局窗口',
      tags: ['广州', '创业贷款', '担保贷款', '贴息'],
    },
    {
      title: '重庆两江新区创业支持计划',
      city: '重庆',
      category: 'SPACE_SUPPORT' as const,
      summary: '重庆两江新区为创业团队提供3年免费办公空间，以及最高50万元的项目启动资金。',
      content: '# 重庆两江新区创业支持计划\n\n## 支持内容\n- 3年内免费使用办公空间（约100㎡）\n- 项目启动资金最高50万\n- 绿色通道工商注册服务\n\n## 优先支持领域\n智能制造、AI、大数据、消费互联网',
      tags: ['重庆', '两江新区', '免费空间', '创业扶持'],
    },
    {
      title: '南京软件产业创业补贴政策',
      city: '南京',
      category: 'TAX_INCENTIVE' as const,
      summary: '南京雨花软件谷为软件类创业企业提供3年运营补贴，最高享受场租全免、人才补贴和税收返还政策。',
      content: '# 南京软件产业创业政策\n\n## 政策范围\n入驻南京雨花软件谷的软件、互联网企业。\n\n## 主要优惠\n- 3年场租全免\n- 软件人才补贴：每人每年最高2万\n- 地方留存税收100%返还（前3年）',
      tags: ['南京', '软件产业', '雨花', '场租减免'],
    },
  ];

  for (const policy of policies) {
    await prisma.policy.create({ data: { ...policy, publishedAt: new Date() } }).catch(() => {});
  }
  console.log(`✅ 创建政策 ${policies.length} 条`);

  // 创建测试用户（有套餐的）
  const userHash = await bcrypt.hash('test123456', 12);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: userHash,
      name: '测试用户',
      subscription: {
        create: {
          plan: 'ADVANCED',
          paidAt: new Date(),
          consultationsLeft: 2,
        }
      },
      onboarding: {
        create: {
          city: '深圳',
          industries: ['电商', '知识付费'],
          resourcePrefs: ['政府补贴政策', 'AI工具使用', '获客与运营'],
          completedAt: new Date(),
        }
      }
    }
  });
  console.log('✅ 测试用户:', testUser.email, '/ 密码: test123456');

  // 为测试用户生成学习路径
  const { generateLearningPath } = await import('../services/learningPathService');
  await generateLearningPath(testUser.id, {
    city: '深圳',
    industries: ['电商', '知识付费'],
    resourcePrefs: ['政府补贴政策', 'AI工具使用', '获客与运营'],
  });
  console.log('✅ 测试用户学习路径已生成');

  // 创建社区示例帖子
  const posts = [
    {
      title: '我是如何用3个月把知识付费做到月入5万的',
      content: '大家好，我是小李。从去年开始转型做知识付费，经历了很多坑，今天分享一下我的经验...\n\n## 选题定位\n\n选择自己最擅长的领域，而不是最热门的领域。\n\n## 产品设计\n\n我的第一个产品是职场沟通技巧训练营，定价499元，第一期招募了20人...',
      industry: '知识付费',
      tags: ['知识付费', '个人IP', '月入5万'],
      isFeatured: true,
      isPinned: true,
    },
    {
      title: '深圳跨境电商创业6个月复盘：亏了2万后的重启之路',
      content: '坦白讲，我的电商创业之路并不顺利。第一次尝试亚马逊FBA，因为选品错误亏损了2万元...',
      industry: '电商',
      tags: ['跨境电商', '复盘', '经验分享'],
      isFeatured: true,
    },
    {
      title: '【求助】在北京创业，政府的算力补贴怎么申请？',
      content: '最近在做AI相关的产品，听说北京有算力补贴政策，请问有人申请过吗？具体流程是怎样的？',
      industry: '开发类产品',
      tags: ['北京', '算力补贴', '政策咨询'],
    },
  ];

  for (const post of posts) {
    await prisma.post.create({
      data: { ...post, authorId: testUser.id, status: 'PUBLISHED' }
    }).catch(() => {});
  }
  console.log(`✅ 创建社区帖子 ${posts.length} 条`);

  console.log('\n🎉 数据填充完成！');
  console.log('');
  console.log('账号信息:');
  console.log('  管理员: admin@opc-platform.com / admin123456');
  console.log('  测试用户: test@example.com / test123456 (进阶套餐)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

import {
  CaseStudy,
  DiagnosisQuestion,
  OnboardingProfile,
  ProfileField,
  SelectOption,
  VentureType,
} from '../types/noif';

export const ventureTypeCards: Array<{
  id: VentureType;
  label: string;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    id: 'STARTUP_C',
    label: '创业开公司',
    title: 'C 端产品创业',
    description: '适合做 App、内容平台、工具产品等面向个人用户的创业方向。',
    badge: '用户增长与验证',
  },
  {
    id: 'STARTUP_B',
    label: '创业开公司',
    title: 'B 端服务 / 企业创业',
    description: '适合咨询、服务、SaaS、代运营、解决方案等面向企业的方向。',
    badge: '交付与客户稳定性',
  },
  {
    id: 'STORE',
    label: '实体创业',
    title: '开店 / 线下门店',
    description: '适合餐饮、零售、美业、健身、教育等需要线下场景的创业方向。',
    badge: '坪效、租金、选址',
  },
  {
    id: 'SIDE_HUSTLE',
    label: '副业创业',
    title: '副业 / 一人公司',
    description: '适合技能接单、内容创作、知识付费、AI 服务、副业变现等模式。',
    badge: '时间成本与获客',
  },
];

export const cityOptions: SelectOption[] = [
  '北京',
  '上海',
  '广州',
  '深圳',
  '成都',
  '杭州',
  '武汉',
  '西安',
  '南京',
  '其他',
].map((value) => ({ label: value, value }));

export const commonProfileFields: ProfileField[] = [
  {
    id: 'city',
    label: '目标城市',
    type: 'select',
    options: cityOptions,
  },
  {
    id: 'familyStatus',
    label: '婚育状态',
    type: 'select',
    options: [
      '未婚无孩',
      '已婚无孩',
      '已婚有孩（孩子 < 3 岁）',
      '已婚有孩（孩子 ≥ 3 岁）',
    ].map((value) => ({ label: value, value })),
  },
  {
    id: 'occupationStatus',
    label: '现有主业状态',
    type: 'select',
    options: [
      '在职（全职）',
      '在职（兼职）',
      '已辞职待业',
      '自由职业',
      '学生',
    ].map((value) => ({ label: value, value })),
  },
  {
    id: 'experience',
    label: '过往创业 / 副业经验',
    type: 'select',
    options: [
      '从未尝试过',
      '尝试过但失败',
      '有成功经验',
      '正在进行中',
    ].map((value) => ({ label: value, value })),
  },
  {
    id: 'skills',
    label: '核心技能方向',
    type: 'multiselect',
    maxSelect: 3,
    options: [
      '销售',
      '技术开发',
      '内容创作',
      '设计',
      '运营',
      '教育培训',
      '财务',
      '其他',
    ].map((value) => ({ label: value, value })),
  },
];

export const ventureFieldMap: Record<VentureType, ProfileField[]> = {
  STARTUP_C: [
    {
      id: 'industry',
      label: '目标行业',
      type: 'select',
      options: ['AI', '教育', '电商', '本地生活', 'SaaS', '内容', '健康', '其他'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'budgetRange',
      label: '计划启动资金',
      type: 'select',
      options: ['< 10 万', '10-50 万', '50-200 万', '> 200 万'].map((value) => ({ label: value, value })),
    },
    {
      id: 'seedUsers',
      label: '是否已有种子用户',
      type: 'select',
      options: ['还没有', '有 < 100 人', '有 > 100 人'].map((value) => ({ label: value, value })),
    },
    {
      id: 'targetCustomer',
      label: '目标客群',
      type: 'select',
      options: ['C 端个人用户', 'B 端中小企业', 'B 端大型企业', '政府机构'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'projectSummary',
      label: '用一句话描述你要做的事',
      type: 'text',
      placeholder: '比如：做一个帮小学生练口语的 AI 陪练 App',
    },
  ],
  STARTUP_B: [
    {
      id: 'industry',
      label: '目标行业',
      type: 'select',
      options: ['AI 服务', '咨询服务', '代运营', 'SaaS', '本地企业服务', '招聘培训', '其他'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'budgetRange',
      label: '计划启动资金',
      type: 'select',
      options: ['< 10 万', '10-50 万', '50-200 万', '> 200 万'].map((value) => ({ label: value, value })),
    },
    {
      id: 'seedUsers',
      label: '是否已有意向客户',
      type: 'select',
      options: ['还没有', '有 1-3 个', '有 3 个以上'].map((value) => ({ label: value, value })),
    },
    {
      id: 'targetCustomer',
      label: '目标客群',
      type: 'select',
      options: ['中小企业', '大型企业', '政府 / 学校', '个人高净值客户'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'projectSummary',
      label: '用一句话描述你要做的事',
      type: 'text',
      placeholder: '比如：做一家用 AI 提升企业短视频产能的代运营服务公司',
    },
  ],
  STORE: [
    {
      id: 'industry',
      label: '实体类型',
      type: 'select',
      options: ['餐饮', '零售', '美容美发', '教育培训', '健身', '加盟连锁', '其他'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'channelOrLocation',
      label: '计划选址区域',
      type: 'text',
      placeholder: '比如：上海嘉定写字楼附近，或成都高新区商业街',
    },
    {
      id: 'budgetRange',
      label: '计划启动资金',
      type: 'select',
      options: ['< 5 万', '5-20 万', '20-100 万', '> 100 万'].map((value) => ({ label: value, value })),
    },
    {
      id: 'franchisePreference',
      label: '是否考虑加盟',
      type: 'select',
      options: ['是，已有目标品牌', '是，还在选', '否，自创品牌'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'projectSummary',
      label: '用一句话描述你要做的事',
      type: 'text',
      placeholder: '比如：在杭州文三路开一家专注白领下午茶的精品咖啡馆',
    },
  ],
  SIDE_HUSTLE: [
    {
      id: 'industry',
      label: '副业方向',
      type: 'select',
      options: ['内容创作', '知识付费', '电商', '技能接单', '本地服务', '投资理财', '其他'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'timeCommitment',
      label: '每周可投入时间',
      type: 'select',
      options: ['< 5 小时', '5-10 小时', '10-20 小时', '> 20 小时'].map((value) => ({ label: value, value })),
    },
    {
      id: 'budgetRange',
      label: '计划启动资金',
      type: 'select',
      options: ['0 元（纯时间投入）', '< 5000 元', '5000 元-3 万', '> 3 万'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      id: 'sideHustlePolicy',
      label: '主业是否允许副业',
      type: 'select',
      options: ['允许', '不确定', '合同禁止'].map((value) => ({ label: value, value })),
    },
    {
      id: 'projectSummary',
      label: '用一句话描述你要做的事',
      type: 'text',
      placeholder: '比如：用 AI + 剪辑能力，接企业视频和短视频代运营订单',
    },
  ],
};

export const resourcePreferenceOptions = [
  '本地行业案例',
  '获客验证工具',
  '选址 / 竞品调研清单',
  '法律与合规提醒',
  'AI 工作流建议',
  '90 天行动路线图',
];

export const interactionModes = [
  {
    label: '文字问诊',
    value: 'TEXT',
    hint: '适合沉淀结构化信息，并在对话后生成风险报告。',
  },
  {
    label: '语音问诊（即将上线）',
    value: 'VOICE',
    hint: '当前先保留偏好，产品阶段仍以文字问诊为主。',
  },
];

export const diagnosisQuestions: DiagnosisQuestion[] = [
  {
    id: 'runway',
    dimension: 'funding',
    prompt: '如果从现在开始 3 个月没有收入，你的现金流还能撑多久？',
    detail: '这是创业里最容易被乐观情绪掩盖的问题，runway 不只是开张前的钱。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '几乎没有缓冲，1 个月内就会焦虑', value: 'under_1m', score: 18, insight: 'runway 太短，任何小偏差都会放大成资金风险。' },
      { label: '大概能撑 1-3 个月', value: '1_3m', score: 42, insight: '有起步空间，但经不起获客或回款延迟。' },
      { label: '能撑 3-6 个月', value: '3_6m', score: 72, insight: '具备试错窗口，但仍要做现金流压力测试。' },
      { label: '能撑 6 个月以上，并留有应急金', value: '6m_plus', score: 90, insight: '资金韧性不错，后续重点看使用效率。' },
    ],
  },
  {
    id: 'paying-customers',
    dimension: 'customer',
    prompt: '你能清楚说出前 10 个真实付费客户可能从哪里来吗？',
    detail: '很多人说“先做起来自然会来”，但真正的验证从具体客户开始。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '完全说不出来，还停留在想象', value: 'none', score: 16, insight: '这是高风险信号，说明需求验证尚未开始。' },
      { label: '模糊知道一些人群，但没有渠道名单', value: 'vague', score: 39, insight: '客群定义有方向，但获客路径仍不清楚。' },
      { label: '已有渠道和名单，正在逐个验证', value: 'testing', score: 74, insight: '你已经进入真正验证阶段。' },
      { label: '已经有意向付费者或试单客户', value: 'validated', score: 92, insight: '客户验证是当前的一块优势。' },
    ],
  },
  {
    id: 'market-proof',
    dimension: 'market',
    prompt: '你对所在城市、商圈或赛道的竞争强度，有做过真实调研吗？',
    detail: '“感觉有需求”不等于“这个位置、这个价格、这个模式可以活”。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '没有，主要靠直觉判断', value: 'intuition', score: 22, insight: '市场认知还不够，容易高估需求、低估竞争。' },
      { label: '看过一些公开资料，但没做实地或访谈', value: 'desk_only', score: 46, insight: '信息有，但离决策还差临门一脚。' },
      { label: '做过竞品 / 商圈 / 用户访谈', value: 'field_research', score: 76, insight: '你已经具备一定现实感，不容易被想象带偏。' },
      { label: '做过调研且有自己的验证结论', value: 'validated_research', score: 91, insight: '你对市场的理解比多数创业者更扎实。' },
    ],
  },
  {
    id: 'compliance',
    dimension: 'compliance',
    prompt: '合同、主体、发票、许可、版权这些合规问题，你现在处理到哪一步了？',
    detail: '很多坑不是业务坑，而是签约、收款、售后和责任边界的坑。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '还没想过', value: 'not_started', score: 15, insight: '合规认知偏弱，后期补救成本通常很高。' },
      { label: '知道重要，但没有具体方案', value: 'aware_only', score: 40, insight: '意识到问题是好事，但目前仍处于裸奔状态。' },
      { label: '关键条款和主体结构已初步准备', value: 'prepared', score: 73, insight: '合规准备度合格，建议再做风险边界检查。' },
      { label: '已有合同模板、主体方案或顾问支持', value: 'secured', score: 89, insight: '你的合规基础比较稳。' },
    ],
  },
  {
    id: 'execution-capacity',
    dimension: 'execution',
    prompt: '如果项目开始后需求频繁变化、返工变多，你现在的执行承载力够吗？',
    detail: '很多项目不是死在开始，而是死在持续执行和反复返工。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '主要靠我一个人硬扛', value: 'solo_fragile', score: 24, insight: '个人承压过高，后期很容易情绪和交付一起失控。' },
      { label: '有一点备用方案，但不稳定', value: 'partial_backup', score: 48, insight: '执行韧性一般，适合尽快补足流程和协作支持。' },
      { label: '有 SOP、外援或可复制流程', value: 'system_ready', score: 79, insight: '你已经在向可持续交付靠近。' },
      { label: '团队 / 供应链 / 外包边界都很清楚', value: 'resilient', score: 93, insight: '执行层面具备比较强的稳定性。' },
    ],
  },
  {
    id: 'first-loss',
    dimension: 'funding',
    prompt: '如果第一波投入没有换来预期收入，你设定过止损线吗？',
    detail: '不是每次坚持都会赢，没有止损线会把试错变成失控。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '没有，只能边做边看', value: 'no_stoploss', score: 21, insight: '决策边界模糊，容易越亏越不甘心。' },
      { label: '心里有个大概数字，但没写下来', value: 'rough_limit', score: 51, insight: '已经有意识，但需要明确触发条件。' },
      { label: '有明确的金额 / 时间止损线', value: 'clear_limit', score: 81, insight: '资金决策会更理性，也更容易复盘。' },
      { label: '有止损线且准备了 Plan B', value: 'plan_b', score: 94, insight: '这是非常成熟的创业者心态。' },
    ],
  },
  {
    id: 'channel-fit',
    dimension: 'customer',
    prompt: '你选择的获客方式，和你的项目成交链路真的匹配吗？',
    detail: '不是所有项目都适合靠内容，更不是所有业务都能靠熟人介绍撑起来。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '没认真评估，先试了再说', value: 'guessing', score: 20, insight: '获客方式和产品不匹配，会让验证周期大幅拉长。' },
      { label: '知道大概渠道，但没有过转化测试', value: 'known_not_tested', score: 45, insight: '策略还停留在理论层面。' },
      { label: '已测试过至少一种获客路径', value: 'tested_one', score: 75, insight: '你已经有真实反馈，不再是空想。' },
      { label: '已形成稳定的获客节奏', value: 'stable_channel', score: 91, insight: '这会大幅提升启动成功率。' },
    ],
  },
  {
    id: 'personal-cost',
    dimension: 'execution',
    prompt: '你把家庭、主业、情绪和时间成本算进去了吗？',
    detail: '创业不是只花钱，它也会吞掉注意力、关系和恢复能力。',
    ventureTypes: ['SIDE_HUSTLE', 'STORE', 'STARTUP_B', 'STARTUP_C'],
    options: [
      { label: '没有，先冲了再说', value: 'blind_rush', score: 19, insight: '这是典型的执行坑前兆。' },
      { label: '有想过，但没有预留具体安排', value: 'thought_only', score: 44, insight: '开始有风险意识，但保护机制不够。' },
      { label: '已经安排了时间和支持系统', value: 'planned', score: 77, insight: '说明你考虑了长期可持续性。' },
      { label: '主业 / 家庭 / 时间成本都已协同好', value: 'aligned', score: 92, insight: '执行稳定性会明显更高。' },
    ],
  },
];

export const pricingPlans = [
  {
    id: 'BASIC',
    label: '副业版',
    price: '49.99',
    originalPrice: '99.99',
    description: '适合有主业、想验证副业方向和现实约束的人。',
    features: [
      '12-25 轮结构化问诊',
      '副业避坑报告 + 实操提醒',
      '10+ 信息验证工具清单',
      '每日 10 次追问额度',
      '副业相关案例库',
    ],
  },
  {
    id: 'ADVANCED',
    label: '创业 / 实体店版',
    price: '99.99',
    originalPrice: '199.99',
    description: '适合开店、创业开公司、注册主体或高风险决策场景。',
    features: [
      '20-35 轮深度问诊',
      '五维风险报告 + 90 天路线图',
      '30+ 信息验证工具清单',
      '每日 30 次追问额度',
      '副业 + 创业 + 实体全量案例库',
    ],
    featured: true,
  },
];

export const caseStudies: CaseStudy[] = [
  {
    id: 'jiading-noodle',
    title: '上海嘉定 · 20㎡ 小面馆创业',
    background: [
      '在上海打拼多年，辛辛苦苦存下 40 万积蓄，不想继续打工，准备在嘉定写字楼附近开一家自己的小面馆当老板。',
      '自己专门学过手艺，主打重庆小面香辣口 + 江苏本味清淡口双风味，认为只要味道好、位置过得去，就能稳定盈利、慢慢回本。',
    ],
    analysis: [
      'Noif：你在嘉定租 20㎡ 中端商铺，租金约 6000-8000 元 / 月，你每天要卖多少碗、翻台几次，才真正不亏本，附近最好的餐饮能够卖多少？',
      'Noif：你做“重庆 + 江苏”双风味，想过一个关键点吗？写字楼客群午餐只有 30-40 分钟，他们更在意出餐速度，还是口味融合？',
    ],
    evidence:
      '办公区快餐调研显示，72% 的人能接受的等餐时间不超过 10 分钟。风味越复杂，备料越繁琐，出餐每慢 3 分钟，流失率上升 11%。',
  },
  {
    id: 'opc-video',
    title: 'OPC 一人创业 · 视频剪辑师 + AI 视频服务',
    background: [
      '某媒体公司在职视频剪辑师，工作 5 年，手上有一些老客户资源。',
      '看到 AI 效率很高，想辞职做 OPC 一人公司，用 AI 做文案、数字人、剪辑，接单做短视频代运营、企业宣传片，实现自由职业、收入翻倍。',
    ],
    analysis: [
      'Noif：你的第一个付费客户是谁？他凭什么放弃成熟团队，选择用 AI 的你？',
      'Noif：你手上有老客户，但你评估过吗？这些老客户今年预算缩了多少？是否还具备持续付费、持续复购的能力？',
      'Noif：如果客户频繁改需求、无限次返工，你一个人扛得住吗？你的时间成本、返工成本、情绪成本算进去了吗？',
    ],
    evidence:
      '企业视频客户决策中，63% 优先看交付稳定性。AI 能降低 30%-50% 制作成本，但客户更担心风格不可控、修改繁琐。中小企业 2025 年营销预算平均压缩 18%。',
  },
  {
    id: 'backend-outsourcing',
    title: '大厂 5 年程序员 · 接外包研发副业',
    background: [
      '大厂工作 5 年的后端程序员，月薪 25K，工作相对稳定。',
      '通过朋友介绍，能接到一些小型软件开发、小程序、后台定制类外包活，想利用下班和周末时间接单，每月多赚 1-2 万补贴家用。',
    ],
    analysis: [
      'Noif：如果交付延期、bug 频发、效果不达标，你能不能承受既丢钱、又丢朋友关系的双重后果？',
      'Noif：如果外包占用 30% 以上主业精力，导致绩效下滑、晋升错失，这笔账真的划算吗？',
      'Noif：项目上线后出 bug、需要长期维护，朋友会接受额外收费吗？如果不收费，你的无偿售后时间要搭进去多少？',
      'Noif：你以个人名义接外包、走私人转账，有没有考虑过合同、发票、版权归属、劳务合规等潜在法律风险？',
    ],
    evidence:
      '个人接外包项目延期率约 57%，68% 的售后维护无额外费用，平均耗时占总开发时长的 27%。大厂隐性收入占年收入 35%-50%。',
  },
];

export const landingPainPoints = [
  '如果我省一点，资金就够用。',
  '如果先做起来，客户自然会慢慢来。',
  '如果味道 / 技术 / 能力足够好，市场会自己给我机会。',
];

export const dashboardHighlights = [
  '不是劝退，而是提前让你看见自己没算进去的成本。',
  '不是泛泛建议，而是把你的城市、行业、预算、模式放进同一张风险地图里。',
  '不是“创业灵感工具”，而是签合同、交定金、辞职前的最后一道检查。 ',
];

export const roadmapTemplates: Record<'default' | 'side', Array<{ week: string; title: string; detail: string }>> = {
  default: [
    { week: 'Week 1-2', title: '完成主体与边界确认', detail: '先确认主体注册、账户、合同模板与责任边界，避免后期补救。' },
    { week: 'Week 3-4', title: '做至少 5 个真实样本验证', detail: '不管是商圈、竞品、客户访谈还是试单，都要形成书面结论。' },
    { week: 'Week 5-6', title: '测试定价与成本模型', detail: '验证毛利、现金流和回本周期，别靠“忙起来应该能赚”做判断。' },
    { week: 'Week 7-8', title: '拿下第一批真实客户', detail: '目标不是曝光，而是 10 个真实客户或可复制成交路径。' },
    { week: 'Week 9-10', title: '建立台账与监控指标', detail: '至少记录回款、毛利、复购、返工、交付耗时这五件事。' },
    { week: 'Week 11-12', title: '沉淀 SOP 与止损线', detail: '把能复制的动作固化，把不该再投入的方向及时停掉。' },
  ],
  side: [
    { week: 'Week 1-2', title: '校准主业与副业边界', detail: '先确认时间、合同、交付承诺边界，不要一上来就透支主业和关系。' },
    { week: 'Week 3-4', title: '验证第一批愿意付款的人', detail: '优先验证谁会真付钱，而不是谁会夸你做得不错。' },
    { week: 'Week 5-6', title: '建立交付模板', detail: '把需求收集、报价、交付、修改边界形成模板，减少返工。' },
    { week: 'Week 7-8', title: '测试一条新客渠道', detail: '不要只依赖老客户和熟人介绍，尽快建立稳定新客入口。' },
    { week: 'Week 9-10', title: '算清时间与利润', detail: '每单实际耗时、修改次数、毛利率要真实记录。' },
    { week: 'Week 11-12', title: '决定放大还是止损', detail: '看数据决定继续做、升级做，还是及时转向。' },
  ],
};

export const defaultProfileValues: Partial<OnboardingProfile> = {
  city: '上海',
  familyStatus: '',
  occupationStatus: '',
  experience: '',
  skills: [],
  budgetRange: '',
  industry: '',
  projectSummary: '',
  interactionMode: 'TEXT',
  resourcePrefs: ['本地行业案例', '90 天行动路线图'],
  industries: [],
};

import {
  DiagnosisAnswer,
  DiagnosisQuestion,
  NoifOnboardingProfile,
  NoifReport,
  NoifReportDimensionScore,
} from '../types/chat';

const negativeKeywords = ['没有', '没想过', '不清楚', '不知道', '不确定', '全靠', '焦虑', '模糊', '先做了再说', '一个人硬扛'];
const positiveKeywords = ['已经', '明确', '稳定', '验证', '名单', '合同', '顾问', '应急金', '团队', '计划', '复购', '止损线', 'sop'];

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

const roadmapTemplates = {
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
} as const;

const dimensionMeta = {
  funding: {
    label: '资金坑',
    weight: 25,
    fallback: 50,
    low: '你的现金流安全垫偏薄，容易在刚启动时被现实节奏击穿。',
    high: '你的资金韧性相对不错，可以把更多精力放在效率和增长上。',
  },
  market: {
    label: '选址 / 选品坑',
    weight: 25,
    fallback: 52,
    low: '你对真实市场环境的认知还不够，容易把想象当成需求。',
    high: '你已经把市场验证做在前面，这能显著降低试错成本。',
  },
  compliance: {
    label: '合规与法律坑',
    weight: 15,
    fallback: 48,
    low: '合规边界还不清晰，后期容易在合同、税务或责任归属上踩坑。',
    high: '你的主体、合同和边界意识比较成熟，是很重要的底盘。',
  },
  customer: {
    label: '获客坑',
    weight: 20,
    fallback: 46,
    low: '“客户会来”这件事还没有被真正验证，获客风险偏高。',
    high: '你已经从抽象用户走向真实客户，这会大幅提升成功率。',
  },
  execution: {
    label: '个人执行坑',
    weight: 15,
    fallback: 54,
    low: '当前更像靠意志力扛事，长期可持续性偏弱。',
    high: '你的时间、流程和执行支持都比较清楚，具备持续推进能力。',
  },
} as const;

function getVentureLabel(ventureType: NoifOnboardingProfile['ventureType']) {
  if (ventureType === 'STARTUP_C') return 'C 端产品创业';
  if (ventureType === 'STARTUP_B') return 'B 端服务 / 企业创业';
  if (ventureType === 'STORE') return '开店 / 线下门店';
  return '副业 / 一人公司';
}

function scoreVerdict(score: number) {
  if (score >= 80) return '可以启动，但仍建议先做一次小范围验证。';
  if (score >= 65) return '可以推进，但存在明确短板，建议先补最低分维度。';
  if (score >= 45) return '坑位较多，建议先停下来补信息和验证。';
  return '时机未到，继续投入前请先把关键风险看清。';
}

function scoreQuote(score: number) {
  if (score >= 80) return '你不是没准备，而是已经准备到可以开始算账了。';
  if (score >= 65) return '你离启动不远，但最深的坑正藏在“差不多可以”里。';
  if (score >= 45) return '最危险的不是没能力，而是带着盲区直接冲。';
  return '现在不是晚，而是终于在代价发生前看见了问题。';
}

export function getQuestionsForType(ventureType: NoifOnboardingProfile['ventureType']) {
  return diagnosisQuestions.filter((question) => question.ventureTypes.includes(ventureType));
}

export function getCurrentQuestion(
  ventureType: NoifOnboardingProfile['ventureType'],
  answers: DiagnosisAnswer[]
) {
  const questions = getQuestionsForType(ventureType);
  return questions.find((question) => !answers.some((answer) => answer.questionId === question.id)) || null;
}

export function inferOptionFromText(question: DiagnosisQuestion, rawText: string) {
  const text = rawText.toLowerCase().replace(/\s+/g, '');

  switch (question.id) {
    case 'runway':
      if (/6个?月|半年|应急金|12个?月|一年/.test(text)) return question.options[3];
      if (/3个?月|4个?月|5个?月/.test(text)) return question.options[2];
      if (/1个?月|2个?月|两个月/.test(text)) return question.options[1];
      return question.options[0];
    case 'paying-customers':
      if (/意向付费|试单|已经付费|真实客户|老客户已经/.test(text)) return question.options[3];
      if (/名单|渠道|正在验证|访谈|潜在客户/.test(text)) return question.options[2];
      if (/大概|模糊|一些人群/.test(text)) return question.options[1];
      return question.options[0];
    case 'market-proof':
      if (/验证结论|自己调研过|访谈过|商圈踩过/.test(text)) return question.options[3];
      if (/竞品|访谈|实地|调研/.test(text)) return question.options[2];
      if (/公开资料|网上查过/.test(text)) return question.options[1];
      return question.options[0];
    case 'compliance':
      if (/合同模板|顾问|律师|主体方案|发票/.test(text)) return question.options[3];
      if (/准备过|主体|条款|初步/.test(text)) return question.options[2];
      if (/知道重要|有意识/.test(text)) return question.options[1];
      return question.options[0];
    case 'execution-capacity':
      if (/团队|供应链|外包边界|很清楚/.test(text)) return question.options[3];
      if (/sop|流程|外援|协作/.test(text)) return question.options[2];
      if (/备用方案|有人帮忙/.test(text)) return question.options[1];
      return question.options[0];
    case 'first-loss':
      if (/planb|方案b|备选|第二方案/.test(text)) return question.options[3];
      if (/止损线|金额|时间线/.test(text)) return question.options[2];
      if (/大概数字|心里有数/.test(text)) return question.options[1];
      return question.options[0];
    case 'channel-fit':
      if (/稳定获客|持续转化|固定渠道/.test(text)) return question.options[3];
      if (/测试过|投放过|试过一条渠道/.test(text)) return question.options[2];
      if (/知道渠道|大概知道/.test(text)) return question.options[1];
      return question.options[0];
    case 'personal-cost':
      if (/协同好|家里支持|时间安排好|边界明确/.test(text)) return question.options[3];
      if (/安排了|规划了|支持系统/.test(text)) return question.options[2];
      if (/想过|有考虑/.test(text)) return question.options[1];
      return question.options[0];
    default:
      break;
  }

  const negativeScore = negativeKeywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
  const positiveScore = positiveKeywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);

  if (positiveScore >= 2 && negativeScore === 0) return question.options[question.options.length - 1];
  if (positiveScore > negativeScore) return question.options[Math.max(question.options.length - 2, 0)];
  if (negativeScore >= 2) return question.options[0];
  return question.options[Math.min(1, question.options.length - 1)];
}

export function normalizeAnswer(question: DiagnosisQuestion, answerText: string): DiagnosisAnswer {
  const matched = inferOptionFromText(question, answerText);
  return {
    questionId: question.id,
    dimension: question.dimension,
    answer: answerText,
    value: matched.value,
    score: matched.score,
    insight: matched.insight,
  };
}

export function buildReport(profile: NoifOnboardingProfile, answers: DiagnosisAnswer[]): NoifReport {
  const dimensionScores: NoifReportDimensionScore[] = (Object.keys(dimensionMeta) as Array<keyof typeof dimensionMeta>).map((key) => {
    const currentAnswers = answers.filter((answer) => answer.dimension === key);
    const average = currentAnswers.length
      ? Math.round(currentAnswers.reduce((sum, answer) => sum + answer.score, 0) / currentAnswers.length)
      : dimensionMeta[key].fallback;

    return {
      key,
      label: dimensionMeta[key].label,
      score: average,
      weight: dimensionMeta[key].weight,
      summary: average < 60 ? dimensionMeta[key].low : dimensionMeta[key].high,
    };
  });

  const readinessScore = Math.round(
    dimensionScores.reduce((sum, item) => sum + item.score * item.weight, 0) / 100
  );

  const weakest = [...dimensionScores].sort((a, b) => a.score - b.score).slice(0, 2);
  const strongest = [...dimensionScores].sort((a, b) => b.score - a.score)[0];
  const roadmap = [...(profile.ventureType === 'SIDE_HUSTLE' ? roadmapTemplates.side : roadmapTemplates.default)];

  return {
    id: `report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ventureType: profile.ventureType,
    ventureLabel: getVentureLabel(profile.ventureType),
    projectName: profile.projectSummary || `${profile.city}${profile.industry}项目`,
    city: profile.city,
    readinessScore,
    verdict: scoreVerdict(readinessScore),
    summary: `你当前最大的风险集中在${weakest.map((item) => item.label).join('和')}。最值得利用的优势是${strongest.label}。`,
    ifQuote: scoreQuote(readinessScore),
    dimensionScores,
    topWarnings: [
      `先补 ${weakest[0]?.label}，否则你会在真正开始后用更高成本交学费。`,
      '不要把“有人会需要”当成“有人会付钱”，请尽快做真实用户或真实商圈验证。',
      '把止损线、交付边界和现金流压力测试写下来，而不是只放在脑子里。',
    ],
    nextMoves: [
      `用 7 天时间补一轮 ${profile.city} 本地样本验证，目标是拿到至少 5 条现实反馈。`,
      '列出你的第一批潜在付费客户名单，并把来源渠道写成可执行动作。',
      '把合同、主体、税务、许可或修改边界中最不清楚的一项单独补课。',
    ],
    actionPlan: roadmap,
  };
}

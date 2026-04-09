import { diagnosisQuestions, roadmapTemplates, ventureTypeCards } from '../data/noif';
import {
  DiagnosisAnswer,
  DiagnosisDimension,
  NoifReport,
  OnboardingProfile,
  ReportDimensionScore,
} from '../types/noif';

const dimensionMeta: Record<
  DiagnosisDimension,
  { label: string; weight: number; fallback: number; low: string; high: string }
> = {
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
};

export function getQuestionsForType(ventureType: OnboardingProfile['ventureType']) {
  return diagnosisQuestions.filter((question) => question.ventureTypes.includes(ventureType));
}

function getVentureLabel(ventureType: OnboardingProfile['ventureType']) {
  return ventureTypeCards.find((item) => item.id === ventureType)?.title || '创业项目';
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

export function buildReport(profile: OnboardingProfile, answers: DiagnosisAnswer[]): NoifReport {
  const dimensionScores: ReportDimensionScore[] = (Object.keys(dimensionMeta) as DiagnosisDimension[]).map((key) => {
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
  const roadmap = profile.ventureType === 'SIDE_HUSTLE' ? roadmapTemplates.side : roadmapTemplates.default;
  const ventureLabel = getVentureLabel(profile.ventureType);

  return {
    id: `report_${Date.now()}`,
    createdAt: new Date().toISOString(),
    ventureType: profile.ventureType,
    ventureLabel,
    projectName: profile.projectSummary || `${profile.city}${profile.industry}项目`,
    city: profile.city,
    readinessScore,
    verdict: scoreVerdict(readinessScore),
    summary: `你当前最大的风险集中在${weakest.map((item) => item.label).join('和')}。最值得利用的优势是${strongest.label}。`,
    ifQuote: scoreQuote(readinessScore),
    dimensionScores,
    topWarnings: [
      `先补 ${weakest[0]?.label}，否则你会在真正开始后用更高成本交学费。`,
      `不要把“有人会需要”当成“有人会付钱”，请尽快做真实用户或真实商圈验证。`,
      `把止损线、交付边界和现金流压力测试写下来，而不是只放在脑子里。`,
    ],
    nextMoves: [
      `用 7 天时间补一轮 ${profile.city} 本地样本验证，目标是拿到至少 5 条现实反馈。`,
      '列出你的第一批潜在付费客户名单，并把来源渠道写成可执行动作。',
      '把合同、主体、税务、许可或修改边界中最不清楚的一项单独补课。',
    ],
    actionPlan: roadmap,
  };
}

export function getPlanLabel(plan: 'FREE' | 'BASIC' | 'ADVANCED') {
  if (plan === 'ADVANCED') return '创业 / 实体店版';
  if (plan === 'BASIC') return '副业版';
  return '未购买';
}

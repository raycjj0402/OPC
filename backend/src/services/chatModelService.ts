import {
  ChatConversationMessage,
  ChatModelConfig,
  ChatModelProvider,
  ChatSearchCitation,
  DiagnosisAnswer,
  DiagnosisDimension,
  NoifOnboardingProfile,
} from '../types/chat';
import { normalizeConversationalAnswer } from './noifDiagnosisService';
import { searchWeb, webSearchEnabled } from './webSearchService';

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AssistantGenerationInput {
  modelId?: string;
  profile: NoifOnboardingProfile;
  conversation: ChatConversationMessage[];
  answers: DiagnosisAnswer[];
  latestUserMessage?: string;
  mode: 'opening' | 'reply';
}

interface ParsedModelResponse {
  assistantMessage: string;
  quickReplies: string[];
  reportReady: boolean;
  analysis?: {
    questionId?: string;
    dimension?: DiagnosisDimension;
    score?: number;
    insight?: string;
    value?: string;
  };
}

interface AssistantGenerationResult {
  model: ChatModelConfig;
  assistantMessage: string;
  quickReplies: string[];
  usedFallback: boolean;
  reportReady: boolean;
  normalizedAnswer: DiagnosisAnswer | null;
  citations: ChatSearchCitation[];
  searchQueries: string[];
}

interface AssistantStreamHandlers {
  onStart?: (result: AssistantGenerationResult) => Promise<void> | void;
  onChunk: (chunk: string) => Promise<void> | void;
  onComplete?: (result: AssistantGenerationResult) => Promise<void> | void;
}

const DEFAULT_MODEL_ID = 'mock:noif-socratic';
const DIMENSION_ORDER: DiagnosisDimension[] = ['customer', 'funding', 'market', 'execution', 'compliance'];
const WEB_SEARCH_KEYWORDS = ['城市', '租金', '商圈', '政策', '法规', '合规', '市场', '竞品', '客户', '行业', '预算', '成本', '选址'];
const MODEL_TIMEOUT_MS = Number(process.env.NOIF_MODEL_TIMEOUT_MS || 15000);
const DEFAULT_COMPLETION_TEMPERATURE = 0.35;
const DEFAULT_COMPLETION_MAX_TOKENS = 900;
const DIMENSION_KEYWORDS: Record<DiagnosisDimension, string[]> = {
  customer: ['客户', '付费', '下单', '复购', '获客', '成交', '转化', '渠道', '名单'],
  funding: ['现金流', '止损', '预算', '资金', '回本', '成本', '亏损', '毛利', '租金'],
  market: ['市场', '商圈', '竞品', '选址', '需求', '行业', '城市', '位置', '调研'],
  compliance: ['合同', '发票', '合规', '税', '版权', '主体', '许可', '法律'],
  execution: ['交付', '返工', '时间', '精力', '团队', '执行', '主业', '家庭', '外包'],
};
const META_INPUT_PATTERNS = [
  /^(你好|您好|嗨|hi|hello)[！!。,.，、\s]*$/i,
  /^继续[吧啊呀吗呢啦]?$/i,
  /^继续问[吧啊呀吗呢啦]?$/i,
  /继续往下问/,
  /我补充一个细节/,
  /我再补充一点/,
  /先换个角度问我/,
  /换个角度/,
  /重新问/,
];

function titleCaseProvider(provider: ChatModelProvider) {
  if (provider === 'openai') return 'ChatGPT';
  if (provider === 'anthropic') return 'Claude';
  if (provider === 'kimi') return 'Kimi';
  return 'Mock';
}

function providerEnabled(provider: ChatModelProvider) {
  if (provider === 'mock') return true;
  if (provider === 'openai') return Boolean(process.env.OPENAI_API_KEY);
  if (provider === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  if (provider === 'kimi') return Boolean(process.env.KIMI_API_KEY);
  return false;
}

function providerDefaultModel(provider: ChatModelProvider) {
  if (provider === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (provider === 'anthropic') return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  if (provider === 'kimi') return process.env.KIMI_MODEL || 'kimi-k2.5';
  return 'noif-socratic';
}

function parseModelId(modelId: string) {
  const [provider, ...rest] = modelId.split(':');
  const parsedProvider = provider as ChatModelProvider;
  return {
    provider: parsedProvider,
    model: rest.join(':') || providerDefaultModel(parsedProvider),
  };
}

export function getAvailableChatModels(): ChatModelConfig[] {
  const configured = (process.env.NOIF_CHAT_ENABLED_MODELS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const modelIds = configured.length > 0
    ? configured
    : [
        DEFAULT_MODEL_ID,
        process.env.OPENAI_API_KEY ? `openai:${providerDefaultModel('openai')}` : null,
        process.env.ANTHROPIC_API_KEY ? `anthropic:${providerDefaultModel('anthropic')}` : null,
        process.env.KIMI_API_KEY ? `kimi:${providerDefaultModel('kimi')}` : null,
      ].filter(Boolean) as string[];

  const defaultId = process.env.NOIF_CHAT_DEFAULT_MODEL || DEFAULT_MODEL_ID;

  return modelIds.map((id) => {
    const parsed = parseModelId(id);
    return {
      id,
      provider: parsed.provider,
      model: parsed.model,
      label: `${titleCaseProvider(parsed.provider)} · ${parsed.model}`,
      enabled: providerEnabled(parsed.provider),
      isDefault: id === defaultId,
    };
  });
}

function getModelConfig(modelId?: string): ChatModelConfig {
  const models = getAvailableChatModels();
  const selectedId = modelId || process.env.NOIF_CHAT_DEFAULT_MODEL || DEFAULT_MODEL_ID;
  return models.find((item) => item.id === selectedId) || models[0] || {
    id: DEFAULT_MODEL_ID,
    provider: 'mock',
    model: 'noif-socratic',
    label: 'Mock · noif-socratic',
    enabled: true,
    isDefault: true,
  };
}

function summarizeCoverage(answers: DiagnosisAnswer[]) {
  const coverage = DIMENSION_ORDER.map((dimension) => {
    const items = answers.filter((answer) => answer.dimension === dimension);
    const average = items.length
      ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
      : 0;

    return {
      dimension,
      count: items.length,
      average,
    };
  });

  const weakest = [...coverage]
    .filter((item) => item.count > 0)
    .sort((left, right) => left.average - right.average)
    .slice(0, 2);

  return {
    coverage,
    weakest,
    enoughForReport:
      answers.length >= 6 &&
      coverage.filter((item) => item.count > 0).length >= 4,
  };
}

function buildFallbackAnalysis(input: AssistantGenerationInput) {
  if (!input.latestUserMessage || isMetaConversationInput(input.latestUserMessage)) {
    return null;
  }

  const suggestedDimension = inferPromptedDimension(input.conversation);
  const normalized = normalizeConversationalAnswer(
    input.latestUserMessage,
    input.profile,
    suggestedDimension,
    `turn_${input.answers.length + 1}`
  );

  return normalized;
}

function inferPromptedDimension(conversation: ChatConversationMessage[]) {
  const lastAssistant = [...conversation].reverse().find((message) => message.role === 'assistant');
  if (!lastAssistant) return undefined;

  const text = `${lastAssistant.content} ${(lastAssistant.quickReplies || []).join(' ')}`;
  const ranked = (Object.keys(DIMENSION_KEYWORDS) as DiagnosisDimension[])
    .map((dimension) => ({
      dimension,
      count: DIMENSION_KEYWORDS[dimension].reduce(
        (sum, keyword) => sum + (text.includes(keyword) ? 1 : 0),
        0
      ),
    }))
    .sort((left, right) => right.count - left.count);

  return ranked[0]?.count ? ranked[0].dimension : undefined;
}

function nextFallbackDimension(answers: DiagnosisAnswer[], excluded: DiagnosisDimension[] = []) {
  const counts = new Map<DiagnosisDimension, number>();
  DIMENSION_ORDER.forEach((dimension) => counts.set(dimension, 0));
  answers.forEach((answer) => counts.set(answer.dimension, (counts.get(answer.dimension) || 0) + 1));

  const ranked = [...counts.entries()]
    .filter(([dimension]) => !excluded.includes(dimension))
    .sort((left, right) => left[1] - right[1]);

  return ranked[0]?.[0] || [...counts.keys()].find((dimension) => !excluded.includes(dimension)) || 'customer';
}

function createFallbackAssistantMessage(input: AssistantGenerationInput, normalizedAnswer: DiagnosisAnswer | null) {
  if (input.mode === 'opening') {
    return `我先不按固定题库来问你。基于你在${input.profile.city}想做的${input.profile.industry}方向，我更想先确认一件最现实的事: 你现在最担心会踩的第一个坑，究竟是客户、资金、执行，还是合规？你可以直接把真实情况告诉我。`;
  }

  const coverage = summarizeCoverage(normalizedAnswer ? [...input.answers, normalizedAnswer] : input.answers);
  if (coverage.enoughForReport) {
    return '我已经拿到比较完整的风险画像了。接下来可以直接为你生成一份个性化的避坑报告，如果你还想补充一个最担心的问题，也可以继续聊一轮。';
  }

  const isMetaInput = Boolean(input.latestUserMessage && isMetaConversationInput(input.latestUserMessage));
  const promptedDimension = inferPromptedDimension(input.conversation);
  const targetDimension = nextFallbackDimension(
    normalizedAnswer ? [...input.answers, normalizedAnswer] : input.answers,
    isMetaInput && promptedDimension ? [promptedDimension] : []
  );
  const dimensionPrompt: Record<DiagnosisDimension, string> = {
    customer: '你的第一批真实付费客户是谁，他们为什么现在就愿意买单？',
    funding: '如果未来 3 个月收入不达预期，你的现金流和止损线准备到了什么程度？',
    market: '你对所在城市、商圈或赛道的真实竞争情况，做过哪些实地验证？',
    compliance: '合同、收款、主体、发票和版权这些边界，现在有哪些还是空白？',
    execution: '如果项目开始后反复返工或需求变化，你现在的时间和交付承载力扛得住吗？',
  };

  if (isMetaInput) {
    const promptPrefix = input.latestUserMessage?.includes('换个角度')
      ? '好，那我换个角度，不重复刚才那条。'
      : input.latestUserMessage?.includes('补充')
        ? '你先不用急着组织答案，我把问题收窄一点。'
        : '我们继续往下聊。';

    return `${promptPrefix} ${dimensionPrompt[targetDimension]}`;
  }

  const acknowledgement = normalizedAnswer
    ? normalizedAnswer.score >= 72
      ? '你这轮回答里已经有一些扎实准备了。'
      : normalizedAnswer.score >= 48
        ? '这里已经露出几个需要继续往下挖的风险点。'
        : '这轮回答里有明显的高风险信号，需要继续追问。'
    : '我们先把最关键的现实条件聊透。';

  return `${acknowledgement} 我想继续追问 ${dimensionPrompt[targetDimension]}`;
}

function createFallbackQuickReplies(input: AssistantGenerationInput, reportReady: boolean) {
  if (reportReady) {
    return ['直接生成报告', '我再补充一点', '先看看当前结论'];
  }

  if (input.mode === 'opening') {
    return ['我最担心客户不来', '我最担心现金流断掉', '我最担心一个人扛不住'];
  }

  const targetDimension = nextFallbackDimension(buildFallbackAnalysis(input) ? [...input.answers, buildFallbackAnalysis(input)!] : input.answers);
  const suggestions: Record<DiagnosisDimension, string[]> = {
    customer: ['我现在还说不出前 10 个付费客户', '我只有一些模糊的人群判断', '我已经有几个愿意试单的人'],
    funding: ['我现在还没有明确止损线', '我大概只能撑 3 个月', '我留了 6 个月以上缓冲'],
    market: ['我主要还是靠感觉判断市场', '我看过竞品但没做实地调研', '我已经做过访谈和调研'],
    compliance: ['我还没处理合同和发票', '我知道重要但没具体方案', '我已经有合同模板和主体方案'],
    execution: ['现在主要还是我一个人扛', '我有一点备用方案但不稳定', '我已经安排好时间和协作支持'],
  };

  return suggestions[targetDimension];
}

function isMetaConversationInput(text: string) {
  const normalized = String(text || '').trim();
  if (!normalized) return false;

  return META_INPUT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function sanitizeQuickReplies(replies: string[], fallbackQuickReplies: string[]) {
  const sanitized = replies
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => !isMetaConversationInput(item))
    .slice(0, 3);

  return sanitized.length ? sanitized : fallbackQuickReplies;
}

function buildSystemPrompt() {
  return [
    '现在你是一位资深市场洞察者，请以苏格拉底式提问，帮助用户分析他创业可能会遇见的坑。',
    '你不是固定问卷，也不是鸡汤型顾问。你要像一个见过很多失败案例、但说话克制的创业前辈，用自然对话方式层层追问。',
    '每一轮都要根据用户画像、历史对话、已有风险维度覆盖情况，决定最值得追问的点。',
    '不要暴露你的内部结构化分析，不要说“我在给你打分”或“下一题是”。',
    '回复风格要求：中文，简洁，有洞察，像 ChatGPT/Claude 那样自然，不要列表，不要 markdown。',
    '如果信息还不够，就给一句现实反馈，然后继续追问一个最关键的问题。',
    '如果信息已经足够支撑风险报告，就明确告诉用户现在可以生成报告，也允许用户继续补充。',
    '如果提供了联网搜索摘要，可以把它们当作背景参考，但不要胡编没有给你的外部事实。',
    'quickReplies 只能是用户可以直接点击发送的真实情况或具体补充方向，不能写“继续往下问”“我补充一个细节”“换个角度问我”这类操作按钮。',
    '你必须只输出 JSON，不要输出 JSON 之外的任何文字。',
    'JSON 格式如下：{"assistantMessage":"给用户看的自然回复","quickReplies":["可选快捷建议，最多3条"],"reportReady":false,"analysis":{"questionId":"turn_1","dimension":"customer","score":62,"insight":"一句内部归纳","value":"short_tag"}}',
    'opening 模式下没有用户回答，analysis 可以省略。',
  ].join('\n');
}

function buildConversationTranscript(conversation: ChatConversationMessage[]) {
  if (conversation.length === 0) {
    return '暂无历史对话。';
  }

  return conversation
    .slice(-12)
    .map((message) => `${message.role === 'assistant' ? '助手' : '用户'}: ${message.content}`)
    .join('\n');
}

function buildCoverageSummary(answers: DiagnosisAnswer[]) {
  const coverage = summarizeCoverage(answers);
  return coverage.coverage
    .map((item) => `${item.dimension}: ${item.count}轮, 平均${item.average || 0}`)
    .join(' | ');
}

function shouldUseWebSearch(input: AssistantGenerationInput) {
  if (!webSearchEnabled()) return false;
  if (input.mode === 'opening') return false;

  const text = `${input.latestUserMessage || ''} ${input.profile.projectSummary || ''}`;
  return WEB_SEARCH_KEYWORDS.some((keyword) => text.includes(keyword));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = MODEL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(`model request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildSearchQueries(input: AssistantGenerationInput) {
  const queries: string[] = [];
  const projectName = input.profile.projectSummary || `${input.profile.city}${input.profile.industry}项目`;

  if (input.profile.city && input.profile.industry) {
    queries.push(`${input.profile.city} ${input.profile.industry} 创业 风险 成本 客户`);
  }

  if (input.profile.ventureType === 'STORE') {
    queries.push(`${input.profile.city} ${input.profile.industry} 商圈 租金 客流`);
  }

  if (input.latestUserMessage) {
    const keywords = WEB_SEARCH_KEYWORDS.filter((keyword) => input.latestUserMessage?.includes(keyword)).slice(0, 3);
    if (keywords.length > 0) {
      queries.push(`${input.profile.city} ${input.profile.industry} ${keywords.join(' ')} ${projectName}`);
    } else {
      queries.push(`${projectName} ${input.latestUserMessage.slice(0, 24)} 创业 风险`);
    }
  }

  return [...new Set(queries.map((item) => item.trim()).filter(Boolean))].slice(0, 2);
}

async function collectWebContext(input: AssistantGenerationInput) {
  if (!shouldUseWebSearch(input)) {
    return { searchQueries: [] as string[], citations: [] as ChatSearchCitation[] };
  }

  const queries = buildSearchQueries(input);
  const aggregated: ChatSearchCitation[] = [];

  for (const query of queries) {
    try {
      const results = await searchWeb(query, 3);
      aggregated.push(...results);
    } catch (error) {
      console.error('[web-search] query failed:', query, error);
    }
  }

  const unique = aggregated.filter((item, index, array) => array.findIndex((candidate) => candidate.url === item.url) === index);
  return {
    searchQueries: queries,
    citations: unique.slice(0, 4),
  };
}

function buildUserPrompt(input: AssistantGenerationInput, citations: ChatSearchCitation[]) {
  const latestInputLine = input.latestUserMessage
    ? isMetaConversationInput(input.latestUserMessage)
      ? `用户本轮最新输入更像对话指令而不是事实回答: ${input.latestUserMessage}\n请换一个更具体的角度继续追问，不要把这句话当成答案。`
      : `用户本轮最新输入: ${input.latestUserMessage}`
    : '当前是开场轮，还没有用户输入。';

  return [
    `模式: ${input.mode}`,
    `项目: ${input.profile.projectSummary || `${input.profile.city}${input.profile.industry}项目`}`,
    `城市: ${input.profile.city}`,
    `行业: ${input.profile.industry}`,
    `预算: ${input.profile.budgetRange}`,
    `创业类型: ${input.profile.ventureType}`,
    `已有回答轮数: ${input.answers.length}`,
    `风险维度覆盖: ${buildCoverageSummary(input.answers)}`,
    `历史对话:\n${buildConversationTranscript(input.conversation)}`,
    latestInputLine,
    citations.length
      ? `联网搜索摘要:\n${citations.map((item, index) => `${index + 1}. ${item.title} | ${item.url} | ${item.snippet}`).join('\n')}`
      : '联网搜索摘要: 无',
    '请只返回 JSON。',
  ].join('\n\n');
}

function extractJsonBlock(text: string) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function parseModelResponse(rawText: string): ParsedModelResponse | null {
  const jsonBlock = extractJsonBlock(rawText);
  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock) as ParsedModelResponse;
    if (!parsed || typeof parsed !== 'object' || !parsed.assistantMessage) {
      return null;
    }
    return {
      assistantMessage: String(parsed.assistantMessage || '').trim(),
      quickReplies: Array.isArray(parsed.quickReplies)
        ? parsed.quickReplies.map((item) => String(item).trim()).filter(Boolean).slice(0, 3)
        : [],
      reportReady: Boolean(parsed.reportReady),
      analysis: parsed.analysis
        ? {
            questionId: parsed.analysis.questionId ? String(parsed.analysis.questionId) : undefined,
            dimension: parsed.analysis.dimension,
            score: typeof parsed.analysis.score === 'number' ? parsed.analysis.score : undefined,
            insight: parsed.analysis.insight ? String(parsed.analysis.insight) : undefined,
            value: parsed.analysis.value ? String(parsed.analysis.value) : undefined,
          }
        : undefined,
    };
  } catch {
    return null;
  }
}

function extractMessageText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item && typeof (item as { text?: unknown }).text === 'string') {
          return String((item as { text?: unknown }).text);
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

function getOpenAiCompatibleTemperature(provider: 'openai' | 'kimi', model: string) {
  if (provider === 'kimi' && model.startsWith('kimi-k2.5')) {
    return 1;
  }

  return DEFAULT_COMPLETION_TEMPERATURE;
}

function getOpenAiCompatibleMaxTokens(provider: 'openai' | 'kimi', model: string) {
  if (provider === 'kimi' && model.startsWith('kimi-k2.5')) {
    return 1400;
  }

  return DEFAULT_COMPLETION_MAX_TOKENS;
}

function materializeNormalizedAnswer(
  input: AssistantGenerationInput,
  parsed: ParsedModelResponse | null
) {
  if (input.mode === 'opening' || !input.latestUserMessage || isMetaConversationInput(input.latestUserMessage)) {
    return null;
  }

  const fallback = buildFallbackAnalysis(input);
  if (!parsed?.analysis) {
    return fallback;
  }

  return {
    questionId: parsed.analysis.questionId || `turn_${input.answers.length + 1}`,
    dimension: parsed.analysis.dimension || fallback?.dimension || 'customer',
    answer: input.latestUserMessage,
    value: parsed.analysis.value || fallback?.value || 'major_gap',
    score: Math.max(0, Math.min(100, Math.round(parsed.analysis.score ?? fallback?.score ?? 50))),
    insight: parsed.analysis.insight || fallback?.insight || '这轮回答还需要继续追问，才能看清真正的风险边界。',
  } satisfies DiagnosisAnswer;
}

async function requestOpenAiCompatibleCompletion(
  provider: 'openai' | 'kimi',
  model: string,
  messages: LlmMessage[]
) {
  const baseUrl =
    provider === 'kimi'
      ? process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1'
      : process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = provider === 'kimi' ? process.env.KIMI_API_KEY : process.env.OPENAI_API_KEY;

  if (!apiKey) throw new Error(`${provider} API key is missing`);

  const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: getOpenAiCompatibleTemperature(provider, model),
      max_tokens: getOpenAiCompatibleMaxTokens(provider, model),
      messages,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} chat completion failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
  };

  const message = data.choices?.[0]?.message;
  const content = extractMessageText(message?.content);
  const reasoningContent = extractMessageText(message?.reasoning_content);

  if (!content && provider === 'kimi' && reasoningContent) {
    console.warn('[chat-model] kimi returned empty content with reasoning only', {
      model,
      reasoningLength: reasoningContent.length,
    });
  }

  return content;
}

async function requestAnthropicCompletion(model: string, messages: LlmMessage[]) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('anthropic API key is missing');
  }

  const system = messages.find((message) => message.role === 'system')?.content || '';
  const anthropicMessages = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  const response = await fetchWithTimeout(`${(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 900,
      temperature: 0.35,
      messages: anthropicMessages,
    }),
  });

  if (!response.ok) {
    throw new Error(`anthropic completion failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as {
    content?: Array<{ type: string; text?: string }>;
  };

  return data.content?.find((item) => item.type === 'text')?.text?.trim() || '';
}

export async function generateAssistantTurn(input: AssistantGenerationInput): Promise<AssistantGenerationResult> {
  const model = getModelConfig(input.modelId);
  const webContext = await collectWebContext(input);
  const fallbackNormalizedAnswer = buildFallbackAnalysis(input);
  const fallbackCoverage = summarizeCoverage(fallbackNormalizedAnswer ? [...input.answers, fallbackNormalizedAnswer] : input.answers);
  const fallbackMessage = createFallbackAssistantMessage(input, fallbackNormalizedAnswer);
  const fallbackQuickReplies = createFallbackQuickReplies(input, fallbackCoverage.enoughForReport);

  if (!model.enabled || model.provider === 'mock') {
    return {
      model,
      assistantMessage: fallbackMessage,
      quickReplies: fallbackQuickReplies,
      usedFallback: true,
      reportReady: fallbackCoverage.enoughForReport,
      normalizedAnswer: fallbackNormalizedAnswer,
      citations: webContext.citations,
      searchQueries: webContext.searchQueries,
    };
  }

  const messages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input, webContext.citations) },
  ];

  try {
    let rawMessage = '';
    if (model.provider === 'anthropic') {
      rawMessage = await requestAnthropicCompletion(model.model, messages);
    } else {
      rawMessage = await requestOpenAiCompatibleCompletion(model.provider, model.model, messages);
    }

    const parsed = parseModelResponse(rawMessage);
    if (!parsed) {
      console.warn('[chat-model] failed to parse model response', {
        provider: model.provider,
        model: model.model,
        rawPreview: rawMessage.slice(0, 280),
      });
    }
    const normalizedAnswer = materializeNormalizedAnswer(input, parsed);
    const postCoverage = summarizeCoverage(normalizedAnswer ? [...input.answers, normalizedAnswer] : input.answers);

    return {
      model,
      assistantMessage: parsed?.assistantMessage || fallbackMessage,
      quickReplies: parsed ? sanitizeQuickReplies(parsed.quickReplies, fallbackQuickReplies) : fallbackQuickReplies,
      usedFallback: !parsed,
      reportReady: parsed?.reportReady ?? postCoverage.enoughForReport,
      normalizedAnswer,
      citations: webContext.citations,
      searchQueries: webContext.searchQueries,
    };
  } catch (error) {
    console.error('[chat-model] falling back to mock response:', error);
    return {
      model,
      assistantMessage: fallbackMessage,
      quickReplies: fallbackQuickReplies,
      usedFallback: true,
      reportReady: fallbackCoverage.enoughForReport,
      normalizedAnswer: fallbackNormalizedAnswer,
      citations: webContext.citations,
      searchQueries: webContext.searchQueries,
    };
  }
}

function splitIntoStreamChunks(text: string) {
  const segments = text
    .split(/(?<=[。！？!?])|(?<=，)|(?<=；)|(?<=：)/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (segments.length > 0) return segments;

  const fallbackChunks: string[] = [];
  for (let index = 0; index < text.length; index += 24) {
    fallbackChunks.push(text.slice(index, index + 24));
  }
  return fallbackChunks;
}

export async function streamAssistantTurn(
  input: AssistantGenerationInput,
  handlers: AssistantStreamHandlers
) {
  const result = await generateAssistantTurn(input);

  if (handlers.onStart) {
    await handlers.onStart(result);
  }

  const chunks = splitIntoStreamChunks(result.assistantMessage);
  for (const chunk of chunks) {
    await handlers.onChunk(chunk);
  }

  if (handlers.onComplete) {
    await handlers.onComplete(result);
  }

  return result;
}

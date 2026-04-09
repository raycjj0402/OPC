import {
  ChatModelConfig,
  ChatModelProvider,
  DiagnosisAnswer,
  DiagnosisQuestion,
  NoifOnboardingProfile,
} from '../types/chat';

interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AssistantGenerationInput {
  modelId?: string;
  profile: NoifOnboardingProfile;
  latestAnswer: DiagnosisAnswer;
  nextQuestion: DiagnosisQuestion | null;
  answerCount: number;
}

interface AssistantGenerationResult {
  model: ChatModelConfig;
  assistantMessage: string;
  quickReplies: string[];
  usedFallback: boolean;
}

interface AssistantStreamHandlers {
  onStart?: (result: AssistantGenerationResult) => Promise<void> | void;
  onChunk: (chunk: string) => Promise<void> | void;
  onComplete?: (result: AssistantGenerationResult) => Promise<void> | void;
}

const DEFAULT_MODEL_ID = 'mock:noif-socratic';

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

function createFallbackAssistantMessage(input: AssistantGenerationInput) {
  const acknowledgement = input.latestAnswer.score >= 75
    ? '你这部分准备度还不错，说明你已经比大多数人更早开始算现实账。'
    : input.latestAnswer.score >= 45
      ? '这里已经暴露出一些关键盲区，继续往下问，通常就能看到真正的风险链条。'
      : '这就是典型的高风险信号，很多人不是输在努力不够，而是输在这里没有提前看清。';

  if (!input.nextQuestion) {
    return `${acknowledgement} 我已经拿到足够信息，可以开始为你生成个性化的避坑报告了。`;
  }

  return `${acknowledgement} 接下来我想继续追问一层：${input.nextQuestion.prompt}`;
}

function buildSystemPrompt() {
  return [
    '你是 noif 的创业避坑对话助手。',
    '你的职责不是鼓励创业，也不是直接下判断，而是像一个有实战经验的前辈一样，用对话追问暴露用户盲区。',
    '回复要求：1-2 段中文，简洁、冷静、有洞察，不要长篇大论，不要列表。',
    '如果存在下一题，先根据用户刚才的回答给一句现实反馈，再自然引出下一题。',
    '如果已经问完，告诉用户可以生成风险报告。',
    '不要使用 markdown。',
  ].join('\n');
}

function buildUserPrompt(input: AssistantGenerationInput) {
  return [
    `用户项目：${input.profile.projectSummary || `${input.profile.city}${input.profile.industry}项目`}`,
    `城市：${input.profile.city}`,
    `行业：${input.profile.industry}`,
    `预算：${input.profile.budgetRange}`,
    `刚回答的问题：${input.latestAnswer.questionId}`,
    `用户原始回答：${input.latestAnswer.answer}`,
    `系统归纳的风险信号：${input.latestAnswer.insight}`,
    input.nextQuestion
      ? `下一题（必须自然过渡到这里）：${input.nextQuestion.prompt} | 说明：${input.nextQuestion.detail}`
      : '当前没有下一题，请告诉用户现在可以生成报告。',
    '请直接输出最终对用户可见的话，不要输出 JSON，不要解释你的思路。',
  ].join('\n');
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

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider} chat completion failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() || '';
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

  const response = await fetch(`${(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '')}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': process.env.ANTHROPIC_VERSION || '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: 500,
      temperature: 0.4,
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
  const quickReplies = input.nextQuestion ? input.nextQuestion.options.map((option) => option.label) : [];
  const fallbackMessage = createFallbackAssistantMessage(input);

  if (!model.enabled || model.provider === 'mock') {
    return {
      model,
      assistantMessage: fallbackMessage,
      quickReplies,
      usedFallback: true,
    };
  }

  const messages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input) },
  ];

  try {
    let assistantMessage = '';
    if (model.provider === 'anthropic') {
      assistantMessage = await requestAnthropicCompletion(model.model, messages);
    } else {
      assistantMessage = await requestOpenAiCompatibleCompletion(model.provider, model.model, messages);
    }

    return {
      model,
      assistantMessage: assistantMessage || fallbackMessage,
      quickReplies,
      usedFallback: !assistantMessage,
    };
  } catch (error) {
    console.error('[chat-model] falling back to mock response:', error);
    return {
      model,
      assistantMessage: fallbackMessage,
      quickReplies,
      usedFallback: true,
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

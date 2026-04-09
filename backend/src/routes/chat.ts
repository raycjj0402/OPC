import { Router, Response } from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import { AuthRequest } from '../types';
import { buildReport } from '../services/noifDiagnosisService';
import { generateAssistantTurn, getAvailableChatModels, streamAssistantTurn } from '../services/chatModelService';
import { ChatConversationMessage, DiagnosisAnswer, NoifOnboardingProfile } from '../types/chat';

const router = Router();

router.use(authenticate);
router.use(requireSubscription(['BASIC', 'ADVANCED']));

router.get('/models', (_req, res) => {
  const models = getAvailableChatModels();
  res.json({
    defaultModel: models.find((item) => item.isDefault)?.id || models[0]?.id || 'mock:noif-socratic',
    models,
  });
});

function validateProfile(profile?: NoifOnboardingProfile) {
  if (!profile?.ventureType || !profile.city || !profile.industry || !profile.budgetRange) {
    return '缺少必要的用户画像信息';
  }

  return null;
}

function normalizeConversation(conversation?: ChatConversationMessage[]) {
  if (!Array.isArray(conversation)) return [];

  return conversation
    .filter((message) => message && (message.role === 'assistant' || message.role === 'user') && String(message.content || '').trim())
    .map((message, index) => ({
      id: message.id || `msg_${index + 1}`,
      role: message.role,
      content: String(message.content || '').trim(),
      createdAt: message.createdAt,
      citations: Array.isArray(message.citations) ? message.citations : [],
      quickReplies: Array.isArray(message.quickReplies) ? message.quickReplies.map((item) => String(item)) : [],
      modelLabel: message.modelLabel,
    }));
}

function mergeAnswers(existing: DiagnosisAnswer[], nextAnswer: DiagnosisAnswer | null) {
  if (!nextAnswer) return existing;
  return [...existing, nextAnswer];
}

function writeSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/opening', async (req: AuthRequest, res: Response) => {
  const {
    profile,
    conversation = [],
    answers = [],
    modelId,
  }: {
    profile?: NoifOnboardingProfile;
    conversation?: ChatConversationMessage[];
    answers?: DiagnosisAnswer[];
    modelId?: string;
  } = req.body;

  const validationError = validateProfile(profile);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const assistant = await generateAssistantTurn({
    modelId,
    profile: profile!,
    conversation: normalizeConversation(conversation),
    answers: Array.isArray(answers) ? answers : [],
    mode: 'opening',
  });

  res.json({
    reportReady: assistant.reportReady,
    answers,
    assistantMessage: assistant.assistantMessage,
    quickReplies: assistant.quickReplies,
    citations: assistant.citations,
    searchQueries: assistant.searchQueries,
    model: assistant.model,
    usedFallback: assistant.usedFallback,
  });
});

router.post('/respond', async (req: AuthRequest, res: Response) => {
  const {
    profile,
    latestUserMessage,
    conversation = [],
    answers = [],
    modelId,
  }: {
    profile?: NoifOnboardingProfile;
    latestUserMessage?: string;
    conversation?: ChatConversationMessage[];
    answers?: DiagnosisAnswer[];
    modelId?: string;
  } = req.body;

  const validationError = validateProfile(profile);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (!latestUserMessage || !latestUserMessage.trim()) {
    return res.status(400).json({ message: '请输入本轮回答内容' });
  }

  const assistant = await generateAssistantTurn({
    modelId,
    profile: profile!,
    conversation: normalizeConversation(conversation),
    answers: Array.isArray(answers) ? answers : [],
    latestUserMessage: latestUserMessage.trim(),
    mode: 'reply',
  });

  const updatedAnswers = mergeAnswers(Array.isArray(answers) ? answers : [], assistant.normalizedAnswer);

  res.json({
    reportReady: assistant.reportReady,
    normalizedAnswer: assistant.normalizedAnswer,
    answers: updatedAnswers,
    assistantMessage: assistant.assistantMessage,
    quickReplies: assistant.quickReplies,
    citations: assistant.citations,
    searchQueries: assistant.searchQueries,
    model: assistant.model,
    usedFallback: assistant.usedFallback,
  });
});

router.post('/stream', async (req: AuthRequest, res: Response) => {
  const {
    profile,
    latestUserMessage,
    conversation = [],
    answers = [],
    modelId,
  }: {
    profile?: NoifOnboardingProfile;
    latestUserMessage?: string;
    conversation?: ChatConversationMessage[];
    answers?: DiagnosisAnswer[];
    modelId?: string;
  } = req.body;

  const validationError = validateProfile(profile);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  if (!latestUserMessage || !latestUserMessage.trim()) {
    return res.status(400).json({ message: '请输入本轮回答内容' });
  }

  const normalizedConversation = normalizeConversation(conversation);
  const existingAnswers = Array.isArray(answers) ? answers : [];

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    await streamAssistantTurn(
      {
        modelId,
        profile: profile!,
        conversation: normalizedConversation,
        answers: existingAnswers,
        latestUserMessage: latestUserMessage.trim(),
        mode: 'reply',
      },
      {
        onStart: async (result) => {
          const updatedAnswers = mergeAnswers(existingAnswers, result.normalizedAnswer);
          writeSse(res, 'ack', {
            reportReady: result.reportReady,
            normalizedAnswer: result.normalizedAnswer,
            answers: updatedAnswers,
          });
          writeSse(res, 'start', {
            model: result.model,
            reportReady: result.reportReady,
          });
        },
        onChunk: async (chunk) => {
          writeSse(res, 'delta', { content: chunk });
        },
        onComplete: async (result) => {
          const updatedAnswers = mergeAnswers(existingAnswers, result.normalizedAnswer);
          writeSse(res, 'meta', {
            assistantMessage: result.assistantMessage,
            quickReplies: result.quickReplies,
            citations: result.citations,
            searchQueries: result.searchQueries,
            normalizedAnswer: result.normalizedAnswer,
            answers: updatedAnswers,
            model: result.model,
            usedFallback: result.usedFallback,
            reportReady: result.reportReady,
          });
        },
      }
    );

    writeSse(res, 'done', { ok: true });
    res.end();
  } catch (error) {
    console.error('[chat/stream] failed:', error);
    writeSse(res, 'error', {
      message: error instanceof Error ? error.message : '流式对话失败',
    });
    res.end();
  }
});

router.post('/report', async (req: AuthRequest, res: Response) => {
  const {
    profile,
    answers = [],
  }: {
    profile?: NoifOnboardingProfile;
    answers?: DiagnosisAnswer[];
  } = req.body;

  if (validateProfile(profile)) {
    return res.status(400).json({ message: '缺少必要的用户画像信息' });
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: '请先完成至少一轮有效问诊' });
  }

  const report = buildReport(profile!, answers);
  res.json({ report });
});

export default router;

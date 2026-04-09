import { Router, Response } from 'express';
import { authenticate, requireSubscription } from '../middleware/auth';
import { AuthRequest } from '../types';
import {
  buildReport,
  getCurrentQuestion,
  getQuestionsForType,
  normalizeAnswer,
} from '../services/noifDiagnosisService';
import { generateAssistantTurn, getAvailableChatModels, streamAssistantTurn } from '../services/chatModelService';
import { DiagnosisAnswer, NoifOnboardingProfile } from '../types/chat';

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

function validateRespondPayload(body: {
  profile?: NoifOnboardingProfile;
  latestUserMessage?: string;
  answers?: DiagnosisAnswer[];
}) {
  const { profile, latestUserMessage } = body;

  if (!profile?.ventureType || !profile.city || !profile.industry || !profile.budgetRange) {
    return '缺少必要的用户画像信息';
  }

  if (!latestUserMessage || !latestUserMessage.trim()) {
    return '请输入本轮回答内容';
  }

  return null;
}

function buildNextStep(profile: NoifOnboardingProfile, answers: DiagnosisAnswer[], latestUserMessage: string) {
  const currentQuestion = getCurrentQuestion(profile.ventureType, answers);
  if (!currentQuestion) {
    return { error: '当前问诊已完成，请直接生成报告' as string };
  }

  const normalizedAnswer = normalizeAnswer(currentQuestion, latestUserMessage.trim());
  const updatedAnswers = [...answers.filter((item) => item.questionId !== currentQuestion.id), normalizedAnswer];
  const orderedAnswers = getQuestionsForType(profile.ventureType)
    .map((question) => updatedAnswers.find((item) => item.questionId === question.id))
    .filter(Boolean) as DiagnosisAnswer[];

  const nextQuestion = getCurrentQuestion(profile.ventureType, orderedAnswers);
  const reportReady = !nextQuestion;

  return {
    normalizedAnswer,
    answers: orderedAnswers,
    nextQuestion,
    reportReady,
  };
}

function writeSse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

router.post('/respond', async (req: AuthRequest, res: Response) => {
  const {
    profile,
    latestUserMessage,
    answers = [],
    modelId,
  }: {
    profile?: NoifOnboardingProfile;
    latestUserMessage?: string;
    answers?: DiagnosisAnswer[];
    modelId?: string;
  } = req.body;

  const validationError = validateRespondPayload({ profile, latestUserMessage, answers });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const step = buildNextStep(profile!, answers, latestUserMessage!);
  if ('error' in step) {
    return res.status(400).json({ message: step.error });
  }

  if (step.reportReady) {
    return res.json({
      reportReady: true,
      normalizedAnswer: step.normalizedAnswer,
      answers: step.answers,
      assistantMessage: '我已经拿到足够信息了。现在可以开始为你生成一份个性化的避坑报告。',
      quickReplies: [],
      nextQuestion: null,
      model: null,
      usedFallback: true,
    });
  }

  const assistant = await generateAssistantTurn({
    modelId,
    profile: profile!,
    latestAnswer: step.normalizedAnswer,
    nextQuestion: step.nextQuestion,
    answerCount: step.answers.length,
  });

  res.json({
    reportReady: false,
    normalizedAnswer: step.normalizedAnswer,
    answers: step.answers,
    assistantMessage: assistant.assistantMessage,
    quickReplies: assistant.quickReplies,
    nextQuestion: step.nextQuestion
      ? {
          id: step.nextQuestion.id,
          dimension: step.nextQuestion.dimension,
          prompt: step.nextQuestion.prompt,
          detail: step.nextQuestion.detail,
        }
      : null,
    model: assistant.model,
    usedFallback: assistant.usedFallback,
  });
});

router.post('/stream', async (req: AuthRequest, res: Response) => {
  const {
    profile,
    latestUserMessage,
    answers = [],
    modelId,
  }: {
    profile?: NoifOnboardingProfile;
    latestUserMessage?: string;
    answers?: DiagnosisAnswer[];
    modelId?: string;
  } = req.body;

  const validationError = validateRespondPayload({ profile, latestUserMessage, answers });
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const step = buildNextStep(profile!, answers, latestUserMessage!);
  if ('error' in step) {
    return res.status(400).json({ message: step.error });
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  writeSse(res, 'ack', {
    reportReady: step.reportReady,
    normalizedAnswer: step.normalizedAnswer,
    answers: step.answers,
  });

  if (step.reportReady) {
    writeSse(res, 'meta', {
      assistantMessage: '我已经拿到足够信息了。现在可以开始为你生成一份个性化的避坑报告。',
      quickReplies: [],
      nextQuestion: null,
      model: null,
      usedFallback: true,
      reportReady: true,
    });
    writeSse(res, 'done', { ok: true });
    return res.end();
  }

  try {
    await streamAssistantTurn(
      {
        modelId,
        profile: profile!,
        latestAnswer: step.normalizedAnswer,
        nextQuestion: step.nextQuestion,
        answerCount: step.answers.length,
      },
      {
        onStart: async (result) => {
          writeSse(res, 'start', {
            model: result.model,
            reportReady: false,
          });
        },
        onChunk: async (chunk) => {
          writeSse(res, 'delta', { content: chunk });
        },
        onComplete: async (result) => {
          writeSse(res, 'meta', {
            assistantMessage: result.assistantMessage,
            quickReplies: result.quickReplies,
            nextQuestion: step.nextQuestion
              ? {
                  id: step.nextQuestion.id,
                  dimension: step.nextQuestion.dimension,
                  prompt: step.nextQuestion.prompt,
                  detail: step.nextQuestion.detail,
                }
              : null,
            model: result.model,
            usedFallback: result.usedFallback,
            reportReady: false,
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

  if (!profile?.ventureType || !profile.city || !profile.industry || !profile.budgetRange) {
    return res.status(400).json({ message: '缺少必要的用户画像信息' });
  }

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ message: '请先完成至少一轮有效问诊' });
  }

  const report = buildReport(profile, answers);
  res.json({ report });
});

export default router;

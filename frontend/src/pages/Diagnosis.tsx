import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  ExternalLink,
  Globe,
  RefreshCcw,
  SendHorizontal,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { chatApi, streamChatResponse } from '../api/client';
import { DiagnosisAnswer, DiagnosisMessage, OnboardingProfile } from '../types/noif';
import { useAuthStore } from '../store/authStore';

function generateMessageId(prefix: 'assistant' | 'user') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function inferReportReady(answers: DiagnosisAnswer[]) {
  const uniqueDimensions = new Set(answers.map((item) => item.dimension));
  return answers.length >= 6 && uniqueDimensions.size >= 4;
}

function AssistantBubble({
  message,
  isStreaming,
  onQuickReply,
}: {
  message: DiagnosisMessage;
  isStreaming?: boolean;
  onQuickReply: (value: string) => void;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
        <BrainCircuit size={18} />
      </div>
      <div className="max-w-3xl rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">noif</div>
          {message.modelLabel ? <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{message.modelLabel}</div> : null}
          {message.citations?.length ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-100">
              <Globe size={11} />
              联网参考
            </div>
          ) : null}
        </div>

        <p className="mt-3 whitespace-pre-wrap text-base leading-8 text-white">
          {message.content || (isStreaming ? '正在思考...' : '')}
        </p>

        {message.citations?.length ? (
          <div className="mt-4 space-y-2">
            {message.citations.map((citation) => (
              <a
                key={`${citation.url}_${citation.title}`}
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-cyan-300/30"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <ExternalLink size={14} className="text-cyan-300" />
                  <span>{citation.title}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">{citation.url}</div>
                <div className="mt-2 text-xs leading-6 text-slate-400">{citation.snippet}</div>
              </a>
            ))}
          </div>
        ) : null}

        {message.quickReplies?.length && !isStreaming ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {message.quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => onQuickReply(reply)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-3xl rounded-[1.8rem] bg-[linear-gradient(135deg,#89ecff_0%,#55c7ff_44%,#247cff_100%)] px-5 py-4 text-[#04111c] shadow-[0_18px_48px_rgba(36,124,255,0.22)]">
        <p className="whitespace-pre-wrap text-base leading-8">{content}</p>
      </div>
    </div>
  );
}

export default function Diagnosis() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const profile = user?.onboarding as OnboardingProfile | undefined;
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<DiagnosisMessage[]>(user?.diagnosisMessages || []);
  const [answers, setAnswers] = useState<DiagnosisAnswer[]>(user?.diagnosisAnswers || []);
  const [draft, setDraft] = useState('');
  const [reportPending, setReportPending] = useState(inferReportReady(user?.diagnosisAnswers || []));
  const [initializing, setInitializing] = useState(false);
  const [bootstrapFailed, setBootstrapFailed] = useState(false);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  const displayProjectName = useMemo(() => {
    if (!profile) return '';
    return profile.projectSummary || `${profile.city}${profile.industry}项目`;
  }, [profile]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, draft, sending, reportPending]);

  useEffect(() => {
    let cancelled = false;

    const loadModels = async () => {
      try {
        const { data } = await chatApi.getModels();
        if (cancelled) return;
        setModels((data.models || []).filter((item: any) => item.enabled).map((item: any) => ({ id: item.id, label: item.label })));
        setSelectedModel((current) => current || data.defaultModel || '');
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || '获取模型列表失败');
        }
      }
    };

    loadModels();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profile || !selectedModel || messages.length > 0 || initializing || bootstrapFailed) {
      return;
    }

    let cancelled = false;

    const bootstrapConversation = async () => {
      setInitializing(true);
      setBootstrapFailed(false);
      try {
        const { data } = await chatApi.opening({
          profile,
          conversation: [],
          answers,
          modelId: selectedModel,
        });

        if (cancelled) return;

        const assistantMessage: DiagnosisMessage = {
          id: generateMessageId('assistant'),
          role: 'assistant',
          content: data.assistantMessage,
          createdAt: new Date().toISOString(),
          quickReplies: data.quickReplies || [],
          citations: data.citations || [],
          modelLabel: data.model?.label,
        };

        setMessages([assistantMessage]);
        setReportPending(Boolean(data.reportReady));
        updateUser({
          diagnosisMessages: [assistantMessage],
        });
      } catch (error: any) {
        if (!cancelled) {
          setBootstrapFailed(true);
          toast.error(error.response?.data?.message || '初始化对话失败');
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    };

    bootstrapConversation();

    return () => {
      cancelled = true;
    };
  }, [answers, bootstrapFailed, initializing, messages.length, profile, selectedModel, updateUser]);

  if (!profile) {
    return (
      <div className="noif-panel mx-auto max-w-3xl p-10 text-center">
        <h1 className="text-3xl font-semibold text-white">还没有可用的问诊画像</h1>
        <p className="mt-4 text-base leading-8 text-slate-400">先完成问诊向导，noif 才知道该从哪里开始和你聊。</p>
        <button type="button" className="btn-primary mt-8" onClick={() => navigate('/onboarding')}>
          前往问诊向导
        </button>
      </div>
    );
  }

  const syncConversationState = (nextMessages: DiagnosisMessage[], nextAnswers: DiagnosisAnswer[], nextReportReady: boolean) => {
    setMessages(nextMessages);
    setAnswers(nextAnswers);
    setReportPending(nextReportReady);
    updateUser({
      diagnosisMessages: nextMessages,
      diagnosisAnswers: nextAnswers,
    });
  };

  const handleSubmit = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input || sending || generating) return;

    const userMessage: DiagnosisMessage = {
      id: generateMessageId('user'),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    };
    const assistantMessageId = generateMessageId('assistant');
    const pendingAssistantMessage: DiagnosisMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      quickReplies: [],
      citations: [],
    };

    const baseConversation = [...messages, userMessage];
    setDraft('');
    setSending(true);
    setMessages([...baseConversation, pendingAssistantMessage]);

    let streamedText = '';
    let nextAnswers = answers;
    let nextReportReady = reportPending;
    let finalMessage = pendingAssistantMessage;

    try {
      await streamChatResponse(
        {
          profile,
          latestUserMessage: input,
          conversation: baseConversation,
          answers,
          modelId: selectedModel || undefined,
        },
        {
          onDelta: (chunk) => {
            streamedText += chunk;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, content: streamedText }
                  : message
              )
            );
          },
          onEvent: (event, payload) => {
            if (event === 'ack') {
              nextAnswers = payload.answers || answers;
              nextReportReady = Boolean(payload.reportReady);
            }

            if (event === 'meta') {
              nextAnswers = payload.answers || nextAnswers;
              nextReportReady = Boolean(payload.reportReady);
              finalMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: payload.assistantMessage || streamedText,
                createdAt: new Date().toISOString(),
                quickReplies: payload.quickReplies || [],
                citations: payload.citations || [],
                modelLabel: payload.model?.label,
              };
            }
          },
        }
      );

      const nextMessages = [...baseConversation, finalMessage];
      syncConversationState(nextMessages, nextAnswers, nextReportReady);
    } catch (error: any) {
      setMessages(messages);
      toast.error(error.response?.data?.message || error.message || '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!answers.length) {
      toast.error('请先完成至少一轮有效对话');
      return;
    }

    setGenerating(true);
    try {
      const { data } = await chatApi.buildReport({
        profile,
        answers,
      });

      updateUser({
        reports: [data.report, ...(user?.reports || []).filter((item) => item.id !== data.report.id)],
        diagnosisAnswers: answers,
        diagnosisMessages: messages,
      });
      toast.success('风险报告已生成');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '生成报告失败');
    } finally {
      setGenerating(false);
    }
  };

  const resetConversation = async () => {
    const nextMessages: DiagnosisMessage[] = [];
    const nextAnswers: DiagnosisAnswer[] = [];
    syncConversationState(nextMessages, nextAnswers, false);
    toast.success('已重新开始这轮问诊');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <section className="noif-panel overflow-hidden">
        <div className="border-b border-white/8 px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Step 03 · 对话问诊</div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">真正像聊天一样，把风险聊出来</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                这里不再是固定问卷。模型会根据你的画像、已有对话和联网搜索摘要，自己决定下一步该追问什么。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
                {answers.length} 轮有效输入
              </div>
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id} className="bg-[#07131f]">
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div ref={transcriptRef} className="h-[68vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          {initializing ? (
            <div className="flex gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
                <Sparkles size={18} />
              </div>
              <div className="max-w-3xl rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">noif</div>
                <p className="mt-3 text-base leading-8 text-white">正在根据你的画像生成第一轮追问...</p>
              </div>
            </div>
          ) : null}

          {!initializing && bootstrapFailed ? (
            <div className="flex gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-300/12 text-amber-200">
                <Sparkles size={18} />
              </div>
              <div className="max-w-3xl rounded-[1.8rem] border border-amber-300/20 bg-amber-300/[0.08] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-amber-200">init failed</div>
                <p className="mt-3 text-base leading-8 text-white">
                  第一轮追问初始化失败了，通常是模型请求超时，或者联网搜索过慢。现在不会再无限重试了，你可以手动再试一次。
                </p>
                <button type="button" className="btn-secondary mt-4 justify-center" onClick={() => setBootstrapFailed(false)}>
                  重新初始化
                </button>
              </div>
            </div>
          ) : null}

          {messages.map((message, index) =>
            message.role === 'assistant' ? (
              <AssistantBubble
                key={message.id}
                message={message}
                isStreaming={sending && index === messages.length - 1 && !message.content}
                onQuickReply={handleSubmit}
              />
            ) : (
              <UserBubble key={message.id} content={message.content} />
            )
          )}

          {reportPending ? (
            <div className="flex gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
                <Sparkles size={18} />
              </div>
              <div className="max-w-3xl rounded-[1.8rem] border border-cyan-300/20 bg-cyan-300/[0.08] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">ready</div>
                <p className="mt-3 text-base leading-8 text-white">
                  当前信息已经足够形成一份风险报告了。你可以现在生成，也可以继续补一两轮更细的现实细节。
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/8 px-6 py-5 sm:px-8">
          {reportPending ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-7 text-slate-400">
                生成报告前，你仍然可以继续发消息补充更细的情况，比如预算明细、客户来源或合规边界。
              </div>
              <button type="button" className="btn-primary justify-center" onClick={handleGenerateReport} disabled={generating}>
                {generating ? '生成中...' : '生成避坑报告'}
                <ArrowRight size={18} />
              </button>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit(draft);
                }
              }}
              className="noif-input min-h-[108px] flex-1 resize-none"
              placeholder="直接输入真实情况，比如：我现在有 15 万现金流，大概能撑 3 个月，但还没有明确的第一批付费客户。"
            />
            <button
              type="button"
              className="btn-primary justify-center self-end sm:self-stretch"
              onClick={() => handleSubmit(draft)}
              disabled={!draft.trim() || sending || initializing}
            >
              {sending ? '发送中...' : '发送'}
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="noif-panel p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">当前项目</div>
          <div className="mt-4 text-xl font-semibold text-white">{displayProjectName}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[profile.city, profile.industry, profile.budgetRange, profile.timeCommitment]
              .filter(Boolean)
              .map((item) => (
                <div key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  {item}
                </div>
              ))}
          </div>
        </div>

        <div className="noif-panel p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">问诊方式</div>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-400">
            <p>模型会根据你的上下文自由追问，不再按预设题号推进。</p>
            <p>快捷建议只是辅助输入，不是主流程。</p>
            <p>搜索结果会作为模型背景参考，帮助它更贴近你所在城市和行业的现实情况。</p>
          </div>
        </div>

        <div className="noif-panel p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">控制项</div>
          <div className="mt-5 space-y-3">
            <button type="button" className="btn-secondary w-full justify-center" onClick={resetConversation}>
              <RefreshCcw size={16} />
              重新开始
            </button>
            <button type="button" className="btn-secondary w-full justify-center" onClick={() => navigate('/dashboard')}>
              先返回总览
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

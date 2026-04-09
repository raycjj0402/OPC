import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, RefreshCcw, SendHorizontal, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { buildReport, getQuestionsForType } from '../utils/noif';
import { DiagnosisAnswer, DiagnosisQuestion, OnboardingProfile } from '../types/noif';
import { useAuthStore } from '../store/authStore';

const negativeKeywords = ['没有', '没想过', '不清楚', '不知道', '不确定', '全靠', '焦虑', '模糊', '先做了再说', '一个人硬扛'];
const positiveKeywords = ['已经', '明确', '稳定', '验证', '名单', '合同', '顾问', '应急金', '团队', '计划', '复购', '止损线', 'sop'];

function inferOptionFromText(question: DiagnosisQuestion, rawText: string) {
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

function AssistantBubble({
  question,
  showOptions,
  onQuickReply,
}: {
  question: DiagnosisQuestion;
  showOptions?: boolean;
  onQuickReply?: (optionLabel: string, optionIndex: number) => void;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
        <BrainCircuit size={18} />
      </div>
      <div className="max-w-3xl rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4">
        <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">{question.dimension}</div>
        <p className="mt-3 text-base leading-8 text-white">{question.prompt}</p>
        <p className="mt-3 text-sm leading-7 text-slate-400">{question.detail}</p>

        {showOptions && onQuickReply ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {question.options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onQuickReply(option.label, index)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
              >
                {option.label}
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
        <p className="text-base leading-8">{content}</p>
      </div>
    </div>
  );
}

export default function Diagnosis() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const profile = user?.onboarding;
  const completeProfile = profile as OnboardingProfile | undefined;
  const questions = useMemo(
    () => (completeProfile?.ventureType ? getQuestionsForType(completeProfile.ventureType) : []),
    [completeProfile?.ventureType]
  );
  const existingAnswers = user?.diagnosisAnswers || [];
  const [answers, setAnswers] = useState<DiagnosisAnswer[]>(existingAnswers);
  const [currentIndex, setCurrentIndex] = useState(Math.min(existingAnswers.length, Math.max(questions.length - 1, 0)));
  const [draft, setDraft] = useState('');
  const [reportPending, setReportPending] = useState(existingAnswers.length >= questions.length && questions.length > 0);
  const [generating, setGenerating] = useState(false);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  const progress = questions.length ? Math.round((answers.length / questions.length) * 100) : 0;
  const currentQuestion = questions[Math.min(currentIndex, Math.max(questions.length - 1, 0))];

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [answers.length, currentIndex, draft, reportPending]);

  if (!completeProfile || !currentQuestion) {
    return (
      <div className="noif-panel mx-auto max-w-3xl p-10 text-center">
        <h1 className="text-3xl font-semibold text-white">还没有可用的问诊画像</h1>
        <p className="mt-4 text-base leading-8 text-slate-400">先完成问诊向导，noif 才知道该从哪里开始追问。</p>
        <button type="button" className="btn-primary mt-8" onClick={() => navigate('/onboarding')}>
          前往问诊向导
        </button>
      </div>
    );
  }

  const submitAnswer = (inputText: string, optionIndex?: number) => {
    const trimmed = inputText.trim();
    if (!trimmed || generating) return;

    const selectedOption =
      typeof optionIndex === 'number'
        ? currentQuestion.options[optionIndex]
        : inferOptionFromText(currentQuestion, trimmed);

    const nextAnswer: DiagnosisAnswer = {
      questionId: currentQuestion.id,
      dimension: currentQuestion.dimension,
      answer: trimmed,
      value: selectedOption.value,
      score: selectedOption.score,
      insight: selectedOption.insight,
    };

    const nextAnswers = [...answers.filter((item) => item.questionId !== currentQuestion.id), nextAnswer];
    const orderedAnswers = questions
      .map((question) => nextAnswers.find((item) => item.questionId === question.id))
      .filter(Boolean) as DiagnosisAnswer[];

    setAnswers(orderedAnswers);
    updateUser({ diagnosisAnswers: orderedAnswers });
    setDraft('');

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((value) => value + 1);
    } else {
      setReportPending(true);
    }
  };

  const handleGenerateReport = () => {
    setGenerating(true);
    window.setTimeout(() => {
      const report = buildReport(completeProfile, answers);
      updateUser({
        reports: [report, ...(user?.reports || []).filter((item) => item.id !== report.id)],
        diagnosisAnswers: answers,
      });
      toast.success('风险报告已生成');
      navigate('/dashboard');
      setGenerating(false);
    }, 900);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
      <section className="noif-panel overflow-hidden">
        <div className="border-b border-white/8 px-6 py-5 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Step 03 · 对话问诊</div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">像聊天一样，把真正的问题聊出来</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                你可以直接输入，也可以偶尔用快捷回复。noif 会根据你的回答继续追问，而不是让你一页页做选择题。
              </p>
            </div>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              进度 {progress}%
            </div>
          </div>
        </div>

        <div ref={transcriptRef} className="h-[68vh] space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="flex gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
              <Sparkles size={18} />
            </div>
            <div className="max-w-3xl rounded-[1.8rem] border border-white/10 bg-white/[0.04] px-5 py-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">noif</div>
              <p className="mt-3 text-base leading-8 text-white">
                我会像一个有实战经验的人一样，慢慢追问你创业前最容易忽略的地方。你直接说真实情况就好，不需要“答对”。
              </p>
            </div>
          </div>

          {questions.map((question, index) => {
            const answer = answers.find((item) => item.questionId === question.id);
            const showCurrent = index === currentIndex && !answer && !reportPending;
            const showHistory = index < currentIndex || !!answer || reportPending;

            if (!showHistory && !showCurrent) return null;

            return (
              <div key={question.id} className="space-y-4">
                <AssistantBubble
                  question={question}
                  showOptions={showCurrent}
                  onQuickReply={(label, optionIndex) => submitAnswer(label, optionIndex)}
                />
                {answer ? <UserBubble content={answer.answer} /> : null}
              </div>
            );
          })}

          {reportPending ? (
            <div className="flex gap-4">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/12 text-cyan-200">
                <CheckCircle2 size={18} />
              </div>
              <div className="max-w-3xl rounded-[1.8rem] border border-cyan-300/20 bg-cyan-300/[0.08] px-5 py-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">ready</div>
                <p className="mt-3 text-base leading-8 text-white">
                  我已经拿到足够的信息了。现在可以为你生成一份个性化的避坑报告。
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/8 px-6 py-5 sm:px-8">
          {reportPending ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-7 text-slate-400">
                你也可以先回头看回答内容；如果准备好了，就直接生成报告。
              </div>
              <button type="button" className="btn-primary justify-center" onClick={handleGenerateReport} disabled={generating}>
                {generating ? '生成中...' : '生成避坑报告'}
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => submitAnswer(option.label, index)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:border-cyan-300/30 hover:text-white"
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitAnswer(draft);
                    }
                  }}
                  className="noif-input min-h-[108px] flex-1 resize-none"
                  placeholder="直接输入你的真实情况，比如：我现在有 15 万现金流，大概能撑 3 个月，但还没有明确的第一批付费客户。"
                />
                <button type="button" className="btn-primary justify-center self-end sm:self-stretch" onClick={() => submitAnswer(draft)} disabled={!draft.trim()}>
                  发送
                  <SendHorizontal size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="noif-panel p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">当前项目</div>
          <div className="mt-4 text-xl font-semibold text-white">{completeProfile.projectSummary || `${completeProfile.city}${completeProfile.industry}项目`}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              completeProfile.city,
              completeProfile.industry,
              completeProfile.budgetRange,
              completeProfile.timeCommitment,
            ]
              .filter(Boolean)
              .map((item) => (
                <div key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
                  {item}
                </div>
              ))}
          </div>
        </div>

        <div className="noif-panel p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">问诊说明</div>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-400">
            <p>主要是对话形式，不需要你只选固定答案。</p>
            <p>快捷回复只是为了你想快速测试界面时更方便。</p>
            <p>报告会根据你的回答内容映射到五个风险维度。</p>
          </div>
        </div>

        <div className="noif-panel p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">控制项</div>
          <div className="mt-5 space-y-3">
            <button
              type="button"
              className="btn-secondary w-full justify-center"
              onClick={() => {
                setAnswers([]);
                setDraft('');
                setCurrentIndex(0);
                setReportPending(false);
                updateUser({ diagnosisAnswers: [], reports: user?.reports || [] });
                toast.success('已重新开始这轮问诊');
              }}
            >
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

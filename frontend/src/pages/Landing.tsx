import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, CircleAlert, MoveRight, ScanSearch, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { caseStudies, landingPainPoints } from '../data/noif';
import { useAuthStore } from '../store/authStore';

const heroSignals = [
  { label: '城市', value: '上海' },
  { label: '赛道', value: '实体 / 副业 / 服务' },
  { label: '输出', value: '风险报告' },
];

const differenceRows = [
  {
    label: '输入方式',
    generic: '用户问什么，AI 回什么',
    noif: 'noif 主动追问，把盲区挖出来',
  },
  {
    label: '信息来源',
    generic: '公开信息 + 常识总结',
    noif: '城市、行业、预算、模式组合后的现实约束',
  },
  {
    label: '交付结果',
    generic: '泛化建议',
    noif: '只属于你的创业风险报告',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [activeCase, setActiveCase] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveCase((current) => (current + 1) % caseStudies.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  const primaryRoute = useMemo(() => {
    if (!isAuthenticated) return '/register';
    if (user?.plan === 'FREE') return '/payment';
    if (!user?.onboardingCompleted) return '/onboarding';
    return '/diagnosis';
  }, [isAuthenticated, user]);

  const active = caseStudies[activeCase];

  return (
    <div className="min-h-screen overflow-hidden bg-[#050b14] text-white">
      <div className="noif-grid fixed inset-0 opacity-20 pointer-events-none" />
      <div className="noif-particles fixed inset-0 pointer-events-none opacity-60" />
      <div className="noif-glow absolute left-[-10rem] top-[-4rem] h-[28rem] w-[28rem] opacity-40" />
      <div className="noif-glow absolute bottom-[-8rem] right-[-6rem] h-[34rem] w-[34rem] opacity-35" />

      <nav className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-[#08111d]/76 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button type="button" onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#89ecff_0%,#55c7ff_45%,#247cff_100%)] shadow-[0_14px_44px_rgba(36,124,255,0.32)]">
              <span className="text-lg font-black text-[#04121e]">N</span>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">noif</div>
              <div className="text-xs text-slate-500">No More Ifs</div>
            </div>
          </button>

          <div className="hidden items-center gap-10 text-sm text-slate-400 md:flex">
            <button type="button" className="transition hover:text-white" onClick={() => document.getElementById('pain')?.scrollIntoView({ behavior: 'smooth' })}>
              Why Now
            </button>
            <button type="button" className="transition hover:text-white" onClick={() => document.getElementById('difference')?.scrollIntoView({ behavior: 'smooth' })}>
              Product Logic
            </button>
            <button type="button" className="transition hover:text-white" onClick={() => document.getElementById('cases')?.scrollIntoView({ behavior: 'smooth' })}>
              Cases
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" className="hidden text-sm text-slate-400 transition hover:text-white sm:inline-flex" onClick={() => navigate('/login')}>
              登录
            </button>
            <button type="button" className="btn-primary text-sm" onClick={() => navigate(primaryRoute)}>
              试试 noif
            </button>
          </div>
        </div>
      </nav>

      <section className="relative px-5 pb-24 pt-32 sm:px-8 sm:pb-28 sm:pt-40">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/8 px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-cyan-200">
              <Sparkles size={13} />
              AI Risk Navigation
            </div>

            <h1 className="mt-8 text-5xl font-black leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
              如果当时有人告诉我
              <span className="mt-2 block noif-gradient-text">这件事就好了</span>
            </h1>

            <div className="mt-8 space-y-4 text-lg leading-8 text-slate-300 sm:text-xl">
              <p>每 10 个创业讲 “如果” 的人，8 个在 1 年内关门。</p>
              <p>不是不够努力，是有些关键问题，从来没人提前告诉你。</p>
            </div>

            <div className="mt-10 border-l border-cyan-300/26 pl-5">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-500">定位</div>
              <p className="mt-3 max-w-2xl text-xl font-semibold leading-8 text-white sm:text-2xl">
                noif，在你开店 / 创业前，帮你提前找出最容易踩的坑。
              </p>
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button type="button" className="btn-primary group text-base sm:text-lg" onClick={() => navigate(primaryRoute)}>
                试试 noif
                <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                onClick={() => document.getElementById('difference')?.scrollIntoView({ behavior: 'smooth' })}
              >
                先看它为什么不同
                <MoveRight size={15} />
              </button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/8 pt-6">
              {[
                { number: '5', label: '风险维度' },
                { number: '1', label: '份专属报告' },
                { number: '90', label: '天路线图' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl font-semibold text-white sm:text-3xl">{item.number}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="signal-board mx-auto max-w-[34rem]">
              <div className="signal-meta">
                <span>Founder Precheck</span>
                <span>Risk Scan Online</span>
              </div>

              <div className="signal-stage">
                <div className="signal-rings">
                  <div className="signal-ring signal-ring-lg" />
                  <div className="signal-ring signal-ring-md" />
                  <div className="signal-ring signal-ring-sm" />
                  <div className="signal-core">
                    <BrainCircuit size={26} />
                  </div>
                  <div className="signal-dot signal-dot-a" />
                  <div className="signal-dot signal-dot-b" />
                  <div className="signal-dot signal-dot-c" />
                  <div className="signal-sweep" />
                </div>

                <div className="signal-aside">
                  {heroSignals.map((item) => (
                    <div key={item.label} className="signal-chip">
                      <div className="signal-chip-label">{item.label}</div>
                      <div className="signal-chip-value">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: ScanSearch, label: '本地化', value: '城市 x 行业 x 模式' },
                  { icon: CircleAlert, label: '盲区', value: '提前暴露' },
                  { icon: BrainCircuit, label: '报告', value: '只属于你' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="signal-summary">
                    <Icon size={16} className="text-cyan-200" />
                    <div className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
                    <div className="mt-2 text-sm font-medium text-white">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pain" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 border-t border-white/8 pt-14 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Pain Pattern</div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">你是不是也这样想过</h2>
            <div className="mt-8 space-y-6">
              {landingPainPoints.map((item, index) => (
                <div key={item} className="flex gap-5 border-b border-white/8 pb-6">
                  <div className="text-sm text-slate-500">0{index + 1}</div>
                  <p className="text-lg leading-8 text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,18,31,0.92),rgba(4,10,18,0.92))] p-8 shadow-[0_28px_100px_rgba(3,10,20,0.35)] sm:p-10">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Reality</div>
              <div className="mt-5 text-6xl font-black leading-none tracking-[-0.06em] text-white sm:text-7xl">68%</div>
              <p className="mt-4 max-w-xl text-2xl font-semibold leading-9 text-cyan-200">
                的创业者启动时，说不出 10 个真实付费意向。
              </p>
              <p className="mt-8 max-w-xl text-base leading-8 text-slate-400">
                真正的问题不是你有没有热情，而是你还没有把现金流、客户、合规和执行成本一起放到现实里算过。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="difference" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="max-w-xl">
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Difference</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">
              我们只做一件事
              <span className="mt-2 block text-slate-300">消除你的 “如果”</span>
            </h2>
            <p className="mt-8 text-lg leading-8 text-slate-300">
              不同于通用 AI 只给通用建议，noif 结合真实行业垂类信息与自研诊断逻辑，深度挖掘你未来可能踩的坑，让你提前看见风险。
            </p>
            <p className="mt-10 border-l border-cyan-300/24 pl-5 text-base leading-8 text-white">
              通用 AI 会告诉你 “要注意资金和客户”，而我们会根据你的城市、行业、预算、模式，生成一份只属于你的创业风险报告。
            </p>
          </div>

          <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-[#08131f]/90">
            <div className="grid grid-cols-[120px_1fr_1fr] border-b border-white/8 px-6 py-5 text-xs uppercase tracking-[0.26em] text-slate-500 sm:px-8">
              <div>对比维度</div>
              <div>通用 AI</div>
              <div>noif</div>
            </div>

            {differenceRows.map((row) => (
              <div key={row.label} className="grid grid-cols-[120px_1fr_1fr] gap-6 border-b border-white/8 px-6 py-6 last:border-b-0 sm:px-8">
                <div className="text-sm font-medium text-white">{row.label}</div>
                <div className="text-sm leading-7 text-slate-400">{row.generic}</div>
                <div className="text-sm leading-7 text-cyan-100">{row.noif}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cases" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="flex flex-col gap-6 border-t border-white/8 pt-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Case Preview</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">真实场景，不同的风险结构</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {caseStudies.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveCase(index)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  activeCase === index
                    ? 'border-cyan-300/40 bg-cyan-300/12 text-white'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                案例 {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
          <div className="space-y-5">
            <div className="text-xs uppercase tracking-[0.26em] text-slate-500">案例背景</div>
            <h3 className="text-3xl font-semibold leading-tight text-white">{active.title}</h3>
            <div className="space-y-5 text-base leading-8 text-slate-300">
              {active.background.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="rounded-[2.25rem] border border-white/10 bg-[#091320]/88 p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.26em] text-cyan-300">Noif 专业分析</div>
              <div className="text-xs text-slate-500">动态轮播</div>
            </div>

            <div className="mt-8 space-y-4">
              {active.analysis.map((paragraph, index) => (
                <div key={paragraph} className={`case-line ${index === 0 ? 'case-line-strong' : ''}`}>
                  <div className="case-line-index">0{index + 1}</div>
                  <p className="text-base leading-8">{paragraph}</p>
                </div>
              ))}
            </div>

            {active.evidence ? (
              <div className="mt-8 rounded-[1.75rem] border border-cyan-300/12 bg-cyan-300/[0.06] p-5">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">行业数据</div>
                <p className="mt-3 text-sm leading-7 text-slate-400">{active.evidence}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section id="cta" className="mx-auto max-w-5xl px-5 pb-24 pt-12 text-center sm:px-8">
        <div className="border-t border-white/8 pt-14">
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Final Reminder</div>
          <h2 className="mt-5 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">请记住，现在就是当时</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            少一个如果，比多努力三个月更有价值。那些事后后悔的人，说的话几乎都一样。
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button type="button" className="btn-primary text-lg" onClick={() => navigate(primaryRoute)}>
              试试 noif
            </button>
            <button type="button" className="text-sm text-slate-400 transition hover:text-white" onClick={() => navigate('/login')}>
              我已经有账号
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

import { ArrowRight, CircleAlert, Compass, FileText, Radar, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { dashboardHighlights } from '../data/noif';
import { getPlanLabel } from '../utils/noif';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const report = user?.reports?.[0];

  if (user?.plan === 'FREE') {
    return (
      <div className="noif-panel mx-auto max-w-4xl p-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-300">
          <Sparkles size={14} />
          未解锁
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-[-0.04em] text-white">先解锁版本，再开始你的避坑诊断</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-400">
          noif 的价值不在于给你更多创业鸡汤，而是帮你把未来最容易踩的坑提前摊开。
        </p>
        <button type="button" className="btn-primary mt-8" onClick={() => navigate('/payment')}>
          去选择版本
        </button>
      </div>
    );
  }

  if (!user?.onboardingCompleted) {
    return (
      <div className="noif-panel mx-auto max-w-4xl p-10 text-center">
        <h1 className="text-4xl font-black tracking-[-0.04em] text-white">先完成问诊向导</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-slate-400">
          你的城市、预算、创业类型和现实约束，会直接决定 noif 从哪里开始追问。
        </p>
        <button type="button" className="btn-primary mt-8" onClick={() => navigate('/onboarding')}>
          前往问诊向导
        </button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <section className="noif-panel p-8">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Ready To Diagnose</div>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">现在开始，把你的“如果”提前揪出来</h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
            问诊不会给你一句万能答案，而是会把资金、获客、合规、执行和市场五个维度拉到同一张图里。
          </p>
          <button type="button" className="btn-primary mt-8" onClick={() => navigate('/diagnosis')}>
            开始正式问诊
          </button>
        </section>

        <section className="space-y-4">
          {dashboardHighlights.map((item) => (
            <div key={item} className="noif-panel p-6 text-base leading-8 text-slate-300">
              {item}
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <div className="noif-panel p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Latest Report</div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">{report.projectName}</h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-400">{report.summary}</p>
            </div>
            <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 px-6 py-5 text-center">
              <div className="text-xs uppercase tracking-[0.26em] text-cyan-300">综合避坑评分</div>
              <div className="mt-3 text-5xl font-black tracking-[-0.05em] text-white">{report.readinessScore}</div>
              <div className="mt-2 text-sm text-cyan-100">{report.verdict}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Compass, title: '版本', value: getPlanLabel(user?.plan || 'FREE') },
              { icon: Radar, title: '创业类型', value: report.ventureLabel },
              { icon: FileText, title: '生成时间', value: new Date(report.createdAt).toLocaleDateString('zh-CN') },
            ].map(({ icon: Icon, title, value }) => (
              <div key={title} className="rounded-[1.7rem] border border-white/10 bg-white/5 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                  <Icon size={18} />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">{title}</div>
                <div className="mt-2 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="noif-panel p-8">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">请记住</div>
          <div className="mt-4 text-3xl font-semibold leading-tight text-white">{report.ifQuote}</div>
          <div className="mt-8 space-y-3">
            {report.topWarnings.map((item) => (
              <div key={item} className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                {item}
              </div>
            ))}
          </div>
          <button type="button" className="btn-secondary mt-8 w-full justify-center" onClick={() => navigate('/diagnosis')}>
            继续补充问诊
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="noif-panel p-8">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">五维风险图</div>
          <div className="mt-6 space-y-5">
            {report.dimensionScores.map((item) => (
              <div key={item.key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{item.label}</span>
                  <span className="text-slate-400">{item.score} / 100</span>
                </div>
                <div className="h-3 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7ae5ff,#247cff)]"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-400">{item.summary}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="noif-panel p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                <CircleAlert size={20} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">下一步最该做什么</div>
                <div className="mt-1 text-xl font-semibold text-white">别平均用力，先补最深的坑</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {report.nextMoves.map((item) => (
                <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="noif-panel p-8">
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">90 天路线图</div>
            <div className="mt-6 space-y-4">
              {report.actionPlan.map((item) => (
                <div key={item.week} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                  <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">{item.week}</div>
                  <div className="mt-2 text-lg font-semibold text-white">{item.title}</div>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4 sm:flex-row">
        <button type="button" className="btn-primary" onClick={() => navigate('/cases')}>
          查看行业案例
          <ArrowRight size={18} />
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigate('/profile')}>
          查看我的账户
        </button>
      </section>
    </div>
  );
}

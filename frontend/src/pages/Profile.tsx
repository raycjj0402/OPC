import { Mail, RefreshCcw, Sparkles, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPlanLabel } from '../utils/noif';
import { useAuthStore } from '../store/authStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="space-y-6">
        <div className="noif-panel p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.75rem] bg-[linear-gradient(135deg,#7ae5ff_0%,#247cff_55%,#82b6ff_100%)] text-2xl font-black text-[#02101c]">
              {user?.name?.[0]?.toUpperCase() || 'N'}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">{user?.name || '创业者'}</h1>
              <p className="mt-1 text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: UserRound, label: '当前版本', value: getPlanLabel(user?.plan || 'FREE') },
              { icon: Mail, label: '账号邮箱', value: user?.email || '未设置' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                  <Icon size={18} />
                </div>
                <div className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">{label}</div>
                <div className="mt-2 text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="noif-panel p-8">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">你的创业画像</div>
          {user?.onboarding ? (
            <div className="mt-6 space-y-4">
              {[
                ['目标城市', user.onboarding.city],
                ['创业类型', user.onboarding.ventureType || '-'],
                ['目标行业', user.onboarding.industry || user.onboarding.industries?.join(' / ') || '-'],
                ['预算区间', user.onboarding.budgetRange || '-'],
                ['项目概述', user.onboarding.projectSummary || '-'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.4rem] border border-white/10 bg-white/5 px-5 py-4">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</div>
                  <div className="mt-2 text-base leading-7 text-white">{value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-400">
              你还没有完成问诊向导。完成后这里会显示你的城市、预算和项目画像。
            </div>
          )}
          <button type="button" className="btn-secondary mt-6" onClick={() => navigate('/onboarding')}>
            <RefreshCcw size={16} />
            重新编辑画像
          </button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="noif-panel p-8">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-cyan-300" />
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">历史报告</div>
          </div>
          <div className="mt-6 space-y-4">
            {user?.reports?.length ? (
              user.reports.map((report) => (
                <div key={report.id} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-white">{report.projectName}</div>
                      <div className="mt-1 text-sm text-slate-400">{new Date(report.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
                      评分 {report.readinessScore}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-400">{report.verdict}</p>
                </div>
              ))
            ) : (
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-400">
                你还没有生成报告。完成正式问诊后，所有历史结果都会保存在这里。
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

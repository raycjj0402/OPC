import { useMemo, useState } from 'react';
import { ArrowLeft, BadgeCheck, BrainCircuit, CircleDollarSign, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { pricingPlans } from '../data/noif';
import { useAuthStore } from '../store/authStore';

export default function Payment() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'ADVANCED'>(
    user?.plan === 'ADVANCED' ? 'ADVANCED' : 'BASIC'
  );
  const [submitting, setSubmitting] = useState(false);

  const currentPlan = user?.plan || 'FREE';

  const selected = useMemo(
    () => pricingPlans.find((plan) => plan.id === selectedPlan),
    [selectedPlan]
  );

  const handlePurchase = async () => {
    if (!selected) return;

    setSubmitting(true);
    window.setTimeout(() => {
      updateUser({
        plan: selectedPlan,
        consultationsLeft: selectedPlan === 'ADVANCED' ? 30 : 10,
      });
      toast.success('版本已解锁，开始你的 noif 问诊');
      navigate('/onboarding');
      setSubmitting(false);
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#050b14] px-4 py-8 text-white sm:px-6">
      <div className="noif-grid fixed inset-0 opacity-30 pointer-events-none" />
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => navigate('/')} className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={16} />
          返回首页
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-300">
            <CircleDollarSign size={14} />
            Step 01 · 选择版本
          </div>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
            在真正投入之前，
            <span className="noif-gradient-text block">先把坑看清楚。</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            两个版本都不是买“答案”，而是买一套帮你提前拆风险的问诊与报告系统。
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6 md:grid-cols-2">
            {pricingPlans.map((plan) => {
              const active = selectedPlan === plan.id;
              const owned = currentPlan === plan.id;

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id as 'BASIC' | 'ADVANCED')}
                  className={`noif-panel relative h-full p-7 text-left transition ${
                    active ? 'ring-2 ring-cyan-300/60 shadow-[0_25px_80px_rgba(20,140,255,0.18)]' : 'hover:border-cyan-400/20'
                  }`}
                >
                  {plan.featured && (
                    <div className="absolute right-6 top-6 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-cyan-200">
                      推荐
                    </div>
                  )}
                  {owned && (
                    <div className="absolute left-6 top-6 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-200">
                      当前已拥有
                    </div>
                  )}

                  <div className="mt-10 text-sm uppercase tracking-[0.26em] text-slate-500">{plan.label}</div>
                  <div className="mt-3 flex items-end gap-3">
                    <div className="text-5xl font-black tracking-[-0.04em] text-white">¥{plan.price}</div>
                    <div className="pb-2 text-sm text-slate-500 line-through">¥{plan.originalPrice}</div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-400">{plan.description}</p>

                  <div className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-7 text-slate-200">
                        <BadgeCheck size={16} className="mt-1 shrink-0 text-cyan-300" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="noif-panel h-fit p-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                <BrainCircuit size={22} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-cyan-300">你将解锁</div>
                <div className="mt-1 text-2xl font-semibold text-white">{selected?.label}</div>
              </div>
            </div>

            <div className="mt-8 space-y-5 rounded-[1.9rem] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">本次价格</span>
                <span className="font-semibold text-white">¥{selected?.price}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">问诊方式</span>
                <span className="font-semibold text-white">结构化文字问诊</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">交付结果</span>
                <span className="font-semibold text-white">个性化风险报告</span>
              </div>
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4 text-sm leading-7 text-cyan-100">
                noif 不替你做决定，但会把你没看见的成本、客户、合规和执行风险提前翻出来。
              </div>
            </div>

            <button type="button" className="btn-primary mt-8 w-full justify-center text-base" onClick={handlePurchase} disabled={submitting}>
              <Sparkles size={18} />
              {submitting ? '正在解锁...' : `确认解锁 ${selected?.label}`}
            </button>

            <p className="mt-4 text-center text-xs leading-6 text-slate-500">
              当前为 MVP 演示流程，支付按钮会直接解锁版本并进入问诊向导。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  BrainCircuit,
  CheckCircle2,
  CircleDollarSign,
  ShieldCheck,
  Sparkles,
  TicketPercent,
  WalletCards,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { pricingPlans } from '../data/noif';
import { useAuthStore } from '../store/authStore';
import { authApi, paymentApi } from '../api/client';

const FREE_COUPON_CODE = 'ZY85CJ';

export default function Payment() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<'BASIC' | 'ADVANCED'>(
    user?.plan === 'ADVANCED' ? 'ADVANCED' : 'BASIC'
  );
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ALIPAY' | 'WECHAT'>('ALIPAY');

  const currentPlan = user?.plan || 'FREE';

  const selected = useMemo(
    () => pricingPlans.find((plan) => plan.id === selectedPlan),
    [selectedPlan]
  );

  const displayPrice = couponApplied ? '0' : selected?.price || '0';

  const syncCurrentUser = async () => {
    const { data } = await authApi.me();
    updateUser({
      plan: data.plan,
      consultationsLeft: data.consultationsLeft,
      onboardingCompleted: data.onboardingCompleted,
      onboarding: data.onboarding,
    });
  };

  const submitGatewayForm = (action: string, fields: Record<string, string>) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.style.display = 'none';

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    form.remove();
  };

  const handlePurchase = async () => {
    if (!selected) return;

    setSubmitting(true);

    try {
      const { data } = await paymentApi.createOrder(
        selectedPlan,
        paymentMethod,
        couponApplied ? couponCode : undefined
      );

      if (data.paymentMode === 'free') {
        await syncCurrentUser();
        toast.success('优惠码已生效，已 0 元解锁版本');
        navigate(data.redirectUrl || '/onboarding');
        return;
      }

      if (data.gateway?.action && data.gateway?.fields) {
        submitGatewayForm(data.gateway.action, data.gateway.fields);
        return;
      }

      if (data.paymentMode === 'api_qr' && data.gateway) {
        sessionStorage.setItem(
          `noif_payment_checkout_${data.orderId}`,
          JSON.stringify({
            orderId: data.orderId,
            tradeNo: data.gateway.tradeNo,
            qrcode: data.gateway.qrcode,
            codeUrl: data.gateway.codeUrl,
            type: data.gateway.type,
            pollHint: data.gateway.pollHint,
          })
        );
        navigate(`/payment/checkout?orderId=${data.orderId}`);
        return;
      }

      if (data.payUrl) {
        window.location.href = data.payUrl;
        return;
      }

      throw new Error('支付通道返回异常，请稍后重试');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || '创建订单失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) {
      toast.error('请输入优惠码');
      return;
    }

    setCouponLoading(true);
    try {
      await paymentApi.validateCoupon(normalized);

      setCouponCode(normalized);
      setCouponApplied(normalized === FREE_COUPON_CODE);
      toast.success('优惠码已生效，当前套餐 0 元解锁');
    } catch (error: any) {
      setCouponApplied(false);
      toast.error(error.response?.data?.message || error.message || '优惠码无效');
    } finally {
      setCouponLoading(false);
    }
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
                    <div className="text-5xl font-black tracking-[-0.04em] text-white">
                      ¥{couponApplied ? '0' : plan.price}
                    </div>
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
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                  <WalletCards size={16} className="text-cyan-300" />
                  选择支付方式
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { id: 'ALIPAY', label: '支付宝' },
                    { id: 'WECHAT', label: '微信支付' },
                  ].map((method) => {
                    const active = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as 'ALIPAY' | 'WECHAT')}
                        className={`rounded-2xl border px-4 py-4 text-left text-sm transition ${
                          active
                            ? 'border-cyan-300/60 bg-cyan-400/10 text-white shadow-[0_10px_40px_rgba(0,180,255,0.18)]'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/20'
                        }`}
                      >
                        <div className="font-medium">{method.label}</div>
                        <div className="mt-1 text-xs text-slate-500">点击后跳转到官方支付页面完成付款</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                  <TicketPercent size={16} className="text-cyan-300" />
                  输入优惠码
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    className="noif-input flex-1 uppercase"
                    value={couponCode}
                    onChange={(event) => {
                      setCouponCode(event.target.value.toUpperCase());
                      if (!event.target.value.trim()) setCouponApplied(false);
                    }}
                    placeholder="输入优惠码"
                  />
                  <button
                    type="button"
                    className="btn-secondary justify-center"
                    onClick={applyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? '校验中...' : '应用'}
                  </button>
                </div>
                {couponApplied ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-100">
                    <CheckCircle2 size={14} />
                    优惠码已生效，当前套餐 0 元
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">本次价格</span>
                <span className="font-semibold text-white">¥{displayPrice}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">问诊方式</span>
                <span className="font-semibold text-white">结构化文字问诊</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">交付结果</span>
                <span className="font-semibold text-white">个性化风险报告</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">支付链路</span>
                <span className="font-semibold text-white">{paymentMethod === 'ALIPAY' ? '支付宝跳转支付' : '微信跳转支付'}</span>
              </div>
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4 text-sm leading-7 text-cyan-100">
                noif 不替你做决定，但会把你没看见的成本、客户、合规和执行风险提前翻出来。
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <ShieldCheck size={16} className="text-cyan-300" />
                  支付说明
                </div>
                <p className="mt-2">
                  点击确认后会先创建真实订单，再跳转到第三方支付页。支付完成后会自动回到 noif，并同步开通你的套餐权限。
                </p>
              </div>
            </div>

            <button type="button" className="btn-primary mt-8 w-full justify-center text-base" onClick={handlePurchase} disabled={submitting}>
              <Sparkles size={18} />
              {submitting ? '正在解锁...' : `确认${couponApplied ? '0 元' : ''}解锁 ${selected?.label}`}
            </button>

            <p className="mt-4 text-center text-xs leading-6 text-slate-500">
              使用优惠码 `ZY85CJ` 时会直接 0 元开通；其余情况将跳转真实支付页面。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, paymentApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

type ResultPhase = 'checking' | 'success' | 'pending' | 'failed';

export default function PaymentResult() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { updateUser } = useAuthStore();
  const [phase, setPhase] = useState<ResultPhase>('checking');
  const [message, setMessage] = useState('正在同步支付结果，请稍候...');

  const orderId = params.get('orderId') || '';
  const rawStatus = params.get('status') || '';

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;

    const syncCurrentUser = async () => {
      const { data } = await authApi.me();
      updateUser({
        plan: data.plan,
        consultationsLeft: data.consultationsLeft,
        onboardingCompleted: data.onboardingCompleted,
        onboarding: data.onboarding,
      });
    };

    const checkOrder = async () => {
      if (!orderId) {
        setPhase('failed');
        setMessage('缺少订单信息，请返回套餐页重新发起支付。');
        return;
      }

      try {
        const { data } = await paymentApi.getOrder(orderId);

        if (data.status === 'PAID') {
          await syncCurrentUser();
          if (!cancelled) {
            setPhase('success');
            setMessage('支付已完成，套餐权限已经开通。');
            toast.success('支付成功，套餐已开通');
          }
          return;
        }

        if (['CANCELLED', 'REFUNDED'].includes(data.status)) {
          if (!cancelled) {
            setPhase('failed');
            setMessage('订单未支付成功，请返回重新选择支付方式。');
          }
          return;
        }

        attempts += 1;
        if (attempts >= 15) {
          if (!cancelled) {
            setPhase('pending');
            setMessage('支付结果还在同步中，你可以稍后再回来查看，或刷新页面继续等待。');
          }
          return;
        }

        if (!cancelled) {
          setPhase('checking');
          setMessage('已返回站内，正在等待支付网关回调确认...');
          timer = window.setTimeout(checkOrder, 2000);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPhase('failed');
          setMessage(error.response?.data?.message || '查询订单失败，请稍后重试。');
        }
      }
    };

    if (rawStatus === 'invalid' || rawStatus === 'failed') {
      setPhase('failed');
      setMessage('支付签名校验未通过或支付未完成，请重新发起支付。');
      return () => undefined;
    }

    checkOrder();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, rawStatus, updateUser]);

  const icon =
    phase === 'success' ? (
      <CheckCircle2 size={30} className="text-emerald-300" />
    ) : phase === 'failed' ? (
      <XCircle size={30} className="text-rose-300" />
    ) : phase === 'pending' ? (
      <Clock3 size={30} className="text-amber-300" />
    ) : (
      <LoaderCircle size={30} className="animate-spin text-cyan-300" />
    );

  return (
    <div className="min-h-screen bg-[#050b14] px-4 py-8 text-white sm:px-6">
      <div className="noif-grid fixed inset-0 pointer-events-none opacity-30" />
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => navigate('/payment')}
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          返回套餐页
        </button>

        <div className="noif-panel p-8 text-center sm:p-12">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] border border-white/10 bg-white/5">
            {icon}
          </div>
          <div className="mt-6 text-xs uppercase tracking-[0.28em] text-cyan-300">Payment Status</div>
          <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
            {phase === 'success'
              ? '支付成功'
              : phase === 'failed'
                ? '支付未完成'
                : phase === 'pending'
                  ? '结果同步中'
                  : '正在确认订单'}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-400 sm:text-lg">{message}</p>

          <div className="mt-8 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 text-left text-sm leading-7 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">订单 ID</span>
              <span className="font-medium text-white">{orderId || '未获取'}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-slate-500">当前状态</span>
              <span className="font-medium text-white">
                {phase === 'success'
                  ? '已开通'
                  : phase === 'failed'
                    ? '未完成'
                    : phase === 'pending'
                      ? '等待回调'
                      : '确认中'}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              className="btn-primary justify-center"
              onClick={() => navigate(phase === 'success' ? '/onboarding' : '/payment')}
            >
              {phase === 'success' ? '继续进入问诊' : '返回重新支付'}
            </button>
            <button type="button" className="btn-secondary justify-center" onClick={() => window.location.reload()}>
              刷新状态
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

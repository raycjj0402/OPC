import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Clock3, Copy, ExternalLink, LoaderCircle, QrCode, Smartphone } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi, paymentApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

type CheckoutPayload = {
  orderId: string;
  tradeNo?: string;
  qrcode?: string;
  codeUrl?: string;
  type?: string;
  pollHint?: string;
};

const STORAGE_KEY_PREFIX = 'noif_payment_checkout_';

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { updateUser } = useAuthStore();
  const [phase, setPhase] = useState<'waiting' | 'checking' | 'success' | 'expired'>('waiting');
  const [statusText, setStatusText] = useState('请使用手机扫码完成支付，页面会自动同步结果。');

  const orderId = params.get('orderId') || '';
  const storageKey = `${STORAGE_KEY_PREFIX}${orderId}`;

  const checkoutPayload = useMemo<CheckoutPayload | null>(() => {
    if (!orderId) return null;

    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as CheckoutPayload) : null;
    } catch {
      return null;
    }
  }, [orderId, storageKey]);

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

    const pollOrder = async () => {
      if (!orderId) {
        setPhase('expired');
        setStatusText('缺少订单信息，请返回重新发起支付。');
        return;
      }

      try {
        const { data } = await paymentApi.getOrder(orderId);

        if (data.status === 'PAID') {
          await syncCurrentUser();
          if (!cancelled) {
            setPhase('success');
            setStatusText('支付成功，套餐权限已经开通。');
            sessionStorage.removeItem(storageKey);
            toast.success('支付成功，套餐已开通');
          }
          return;
        }

        attempts += 1;
        if (attempts >= 60) {
          if (!cancelled) {
            setPhase('expired');
            setStatusText('订单仍未确认成功，你可以稍后回来刷新，或重新发起支付。');
          }
          return;
        }

        if (!cancelled) {
          setPhase('checking');
          setStatusText('正在等待支付网关异步通知...');
          timer = window.setTimeout(pollOrder, 3000);
        }
      } catch (error: any) {
        if (!cancelled) {
          setPhase('expired');
          setStatusText(error.response?.data?.message || '查询订单失败，请稍后重试。');
        }
      }
    };

    pollOrder();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [orderId, storageKey, updateUser]);

  const copyContent = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label}已复制`);
    } catch {
      toast.error(`复制${label}失败`);
    }
  };

  const openPaymentLink = () => {
    if (!checkoutPayload?.qrcode) {
      toast.error('当前没有可拉起的支付链接');
      return;
    }
    window.location.href = checkoutPayload.qrcode;
  };

  return (
    <div className="min-h-screen bg-[#050b14] px-4 py-8 text-white sm:px-6">
      <div className="noif-grid fixed inset-0 pointer-events-none opacity-30" />
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/payment')}
          className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          返回套餐页
        </button>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="noif-panel p-7 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.28em] text-cyan-300">
              <QrCode size={14} />
              API Checkout
            </div>
            <h1 className="mt-6 text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">
              扫码完成支付
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-400">
              {checkoutPayload?.pollHint || '支付完成后系统会通过异步通知自动开通套餐，无需手动回跳。'}
            </p>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5">
              <div className="rounded-[1.7rem] border border-dashed border-cyan-300/30 bg-[#081426] p-5">
                {checkoutPayload?.codeUrl ? (
                  <img
                    src={checkoutPayload.codeUrl}
                    alt="支付二维码"
                    className="mx-auto aspect-square w-full max-w-[320px] rounded-[1.5rem] border border-white/10 bg-white object-contain p-3"
                  />
                ) : (
                  <div className="mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-center text-sm leading-7 text-slate-400">
                    网关这次没有直接返回二维码图片。
                    <br />
                    你可以使用右侧的支付链接继续完成付款。
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button type="button" className="btn-primary justify-center" onClick={openPaymentLink}>
                  <Smartphone size={18} />
                  拉起支付链接
                </button>
                <button
                  type="button"
                  className="btn-secondary justify-center"
                  onClick={() => copyContent(checkoutPayload?.qrcode || '', '支付链接')}
                >
                  <Copy size={16} />
                  复制支付链接
                </button>
              </div>
            </div>
          </div>

          <div className="noif-panel p-7 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-200">
                {phase === 'success' ? (
                  <QrCode size={22} />
                ) : (
                  <LoaderCircle size={22} className={phase === 'expired' ? '' : 'animate-spin'} />
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.26em] text-cyan-300">订单同步</div>
                <div className="mt-1 text-2xl font-semibold text-white">
                  {phase === 'success' ? '已确认支付' : phase === 'expired' ? '等待中断' : '轮询订单状态'}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4 rounded-[1.9rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">订单 ID</span>
                <span className="break-all text-right font-medium text-white">{orderId || '未获取'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">网关订单号</span>
                <span className="break-all text-right font-medium text-white">{checkoutPayload?.tradeNo || '待生成'}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">支付方式</span>
                <span className="font-medium text-white">
                  {checkoutPayload?.type === 'wxpay' ? '微信支付' : checkoutPayload?.type === 'alipay' ? '支付宝' : '待确认'}
                </span>
              </div>
              <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4 text-cyan-100">
                {statusText}
              </div>
            </div>

            <div className="mt-6 rounded-[1.9rem] border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Clock3 size={16} className="text-cyan-300" />
                当前建议
              </div>
              <p className="mt-3">
                扫码后不要立刻关闭页面，保留 10-20 秒让异步通知回到你的后端。如果网络较慢，可以点“刷新支付状态”再确认一次。
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="btn-primary justify-center"
                onClick={() => navigate(phase === 'success' ? '/onboarding' : '/payment/result?orderId=' + orderId + '&status=pending')}
              >
                {phase === 'success' ? '继续进入问诊' : '查看支付结果'}
              </button>
              <button type="button" className="btn-secondary justify-center" onClick={() => window.location.reload()}>
                <ExternalLink size={16} />
                刷新支付状态
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

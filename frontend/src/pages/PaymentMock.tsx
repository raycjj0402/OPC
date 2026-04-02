import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi, authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function PaymentMock() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'pending' | 'processing' | 'success'>('pending');

  const orderId = params.get('orderId');
  const amount = params.get('amount');

  const handlePay = async () => {
    if (!orderId) return;
    setStep('processing');
    await new Promise(r => setTimeout(r, 2000));
    try {
      const { data } = await paymentApi.callback(orderId, 'SUCCESS');
      // 刷新用户信息
      const me = await authApi.me();
      const { user: authUser } = useAuthStore.getState();
      if (authUser) {
        setAuth(localStorage.getItem('opc_token')!, { ...authUser, plan: me.data.plan });
      }
      setStep('success');
      toast.success('支付成功！');
      setTimeout(() => navigate(data.redirectUrl || '/onboarding'), 1500);
    } catch {
      setStep('pending');
      toast.error('支付失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-violet-900 to-purple-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl">
        {step === 'success' ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">支付成功！</h2>
            <p className="text-gray-500 text-sm">正在为你生成专属学习计划...</p>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-lg">OPC</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">模拟支付</h2>
            <p className="text-gray-500 text-sm mb-6">（开发环境）</p>

            <div className="bg-gray-50 rounded-2xl p-6 mb-6">
              <div className="text-3xl font-bold text-purple-600 mb-1">¥{amount}</div>
              <div className="text-sm text-gray-500">OPC平台套餐</div>
            </div>

            <button
              onClick={handlePay}
              disabled={step === 'processing'}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {step === 'processing' ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  处理中...
                </>
              ) : (
                '确认支付（模拟）'
              )}
            </button>

            <button
              onClick={() => navigate('/payment')}
              className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
            >
              返回选择套餐
            </button>
          </>
        )}
      </div>
    </div>
  );
}

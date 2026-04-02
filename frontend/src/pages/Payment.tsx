import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowLeft, Shield, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

const plans = [
  {
    id: 'BASIC',
    name: '基础套餐',
    price: 199,
    highlight: false,
    features: [
      '个性化学习模块（全解锁）',
      '政府资源库（7城市）',
      'AI工具指南 + 工作流教程',
      '行业落地方法论',
      '开发资源中心（四阶段）',
      '获客方法论案例库',
      'OPC社区权限',
    ],
  },
  {
    id: 'ADVANCED',
    name: '进阶套餐',
    price: 999,
    highlight: true,
    tag: '推荐',
    features: [
      '✅ 基础套餐全部权益',
      '2次行业专家1对1咨询',
      '每次约60分钟深度陪伴',
      '会后专属总结文档',
      '专家主页+评分+预约日历',
      '咨询全程邮件通知',
      '优先客服通道',
    ],
  },
];

export default function Payment() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [selected, setSelected] = useState('ADVANCED');
  const [payMethod, setPayMethod] = useState('WECHAT');
  const [loading, setLoading] = useState(false);

  const currentPlan = user?.plan || 'FREE';
  const isUpgrade = currentPlan === 'BASIC' && selected === 'ADVANCED';

  const handlePay = async () => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }
    if (currentPlan === selected) {
      return toast.error('您已拥有该套餐');
    }
    setLoading(true);
    try {
      let res;
      if (isUpgrade) {
        res = await paymentApi.upgrade(payMethod);
      } else {
        res = await paymentApi.createOrder(selected, payMethod);
      }
      navigate(`/payment/mock?orderId=${res.data.orderId}&amount=${res.data.amount}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '创建订单失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selected)!;
  const displayPrice = isUpgrade ? 800 : selectedPlan?.price;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
          <ArrowLeft size={16} /> 返回
        </button>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">选择套餐</h1>
          {isUpgrade && (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-4 py-1.5 text-sm">
              <Zap size={14} /> 升级只需补差价 ¥800，历史数据全部保留
            </div>
          )}
        </div>

        {/* Plan selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {plans.map(plan => {
            const isOwned = currentPlan === plan.id;
            const isDisabled = isOwned || (currentPlan === 'ADVANCED') ||
              (currentPlan === 'BASIC' && plan.id === 'BASIC');

            return (
              <div
                key={plan.id}
                onClick={() => !isDisabled && setSelected(plan.id)}
                className={`relative rounded-2xl p-6 border-2 transition-all cursor-pointer ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' :
                  selected === plan.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                {plan.tag && !isDisabled && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    {plan.tag}
                  </div>
                )}
                {isOwned && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    当前套餐
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    <div className="text-2xl font-bold text-purple-600 mt-1">
                      ¥{plan.id === 'ADVANCED' && isUpgrade ? '800' : plan.price}
                      <span className="text-sm text-gray-500 font-normal ml-1">
                        {plan.id === 'ADVANCED' && isUpgrade ? '（补差价）' : '买断'}
                      </span>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selected === plan.id ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {selected === plan.id && <Check size={14} className="text-white" />}
                  </div>
                </div>

                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-purple-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Payment method */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">支付方式</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'WECHAT', label: '微信支付', icon: '💚' },
              { id: 'ALIPAY', label: '支付宝', icon: '💙' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  payMethod === m.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{m.icon}</span>
                <span className="font-medium text-gray-700">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Order summary */}
        <div className="card mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">订单摘要</h3>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{selectedPlan?.name}</span>
            <span>¥{selectedPlan?.price}</span>
          </div>
          {isUpgrade && (
            <div className="flex justify-between text-sm text-green-600 mb-2">
              <span>已付基础套餐抵扣</span>
              <span>-¥199</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
            <span>实付金额</span>
            <span className="text-purple-600 text-xl">¥{displayPrice}</span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={loading || currentPlan === selected}
          className="btn-primary w-full text-lg py-4"
        >
          {loading ? '处理中...' : `确认支付 ¥${displayPrice}`}
        </button>

        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
          <Shield size={14} />
          <span>支付安全加密 · 7天无理由退款 · 买断制无续费</span>
        </div>
      </div>
    </div>
  );
}

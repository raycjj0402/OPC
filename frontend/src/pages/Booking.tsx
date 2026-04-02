import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Clock, Star, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { expertsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const INDUSTRIES = ['电商', '知识付费', '教育', '金融', '开发类产品', '其他'];

export default function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [selectedSlot, setSelectedSlot] = useState('');
  const [step, setStep] = useState<'slot' | 'form' | 'success'>('slot');
  const [form, setForm] = useState({
    name: user?.name || '',
    wechat: '',
    phone: '',
    city: user?.onboarding?.city || '',
    industry: user?.onboarding?.industries?.[0] || '',
    description: '',
  });

  const { data: expert, isLoading } = useQuery({
    queryKey: ['expert', id],
    queryFn: () => expertsApi.getExpert(id!).then(r => r.data),
  });

  const bookMutation = useMutation({
    mutationFn: () => expertsApi.createBooking({
      expertId: id!,
      slotId: selectedSlot,
      ...form,
    }),
    onSuccess: () => setStep('success'),
    onError: (err: any) => toast.error(err.response?.data?.message || '预约失败，请重试'),
  });

  const handleSubmit = () => {
    if (!form.name || !form.wechat || !form.phone || !form.city || !form.industry || !form.description) {
      return toast.error('请填写所有必填信息');
    }
    if (form.description.length > 200) return toast.error('咨询事宜不超过200字');
    bookMutation.mutate();
  };

  if (isLoading) return <div className="p-6 text-center">加载中...</div>;
  if (!expert) return null;

  if (step === 'success') {
    return (
      <div className="p-6 max-w-lg mx-auto text-center pt-20">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">预约提交成功！</h2>
        <p className="text-gray-500 mb-6">
          专家将在24小时内确认，届时您将收到邮件通知。
        </p>
        <div className="card text-left mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold">
              {expert.name[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{expert.name}</p>
              <p className="text-sm text-gray-500">
                {expert.slots?.find((s: any) => s.id === selectedSlot)?.startTime
                  ? dayjs(expert.slots.find((s: any) => s.id === selectedSlot).startTime).format('MM月DD日 HH:mm')
                  : '时间待确认'}
              </p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/profile')} className="btn-primary w-full">
          查看我的预约 →
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <button onClick={() => step === 'slot' ? navigate('/experts') : setStep('slot')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} /> 返回
      </button>

      {/* Expert info */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold text-xl">
            {expert.name[0]}
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{expert.name}</h2>
            <p className="text-gray-500 text-sm">{expert.title}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-sm text-gray-600">{expert.rating} · {expert.totalBookings}次咨询</span>
            </div>
          </div>
        </div>
      </div>

      {step === 'slot' && (
        <>
          <h2 className="font-bold text-gray-900 mb-4">
            <Calendar size={18} className="inline mr-2 text-purple-600" />
            选择咨询时间
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {expert.slots?.length > 0 ? expert.slots.map((slot: any) => (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot.id)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selectedSlot === slot.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="font-medium text-gray-900 text-sm">
                  {dayjs(slot.startTime).format('MM/DD')}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {dayjs(slot.startTime).format('HH:mm')}
                </div>
              </button>
            )) : (
              <div className="col-span-3 text-center py-8 text-gray-400">
                暂无可预约时间，请联系客服
              </div>
            )}
          </div>
          <button
            onClick={() => { if (!selectedSlot) return toast.error('请选择咨询时间'); setStep('form'); }}
            className="btn-primary w-full"
          >
            下一步：填写预约信息 →
          </button>
        </>
      )}

      {step === 'form' && (
        <>
          <h2 className="font-bold text-gray-900 mb-1">填写预约信息</h2>
          <p className="text-sm text-gray-500 mb-4">
            已选时间：{dayjs(expert.slots?.find((s: any) => s.id === selectedSlot)?.startTime).format('MM月DD日 HH:mm')}
          </p>

          <div className="space-y-4">
            {[
              { key: 'name', label: '姓名', placeholder: '你的姓名' },
              { key: 'wechat', label: '微信号', placeholder: '咨询将通过微信进行' },
              { key: 'phone', label: '手机号', placeholder: '联系方式' },
              { key: 'city', label: '所在城市', placeholder: '如：深圳' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label} *</label>
                <input
                  type="text"
                  value={(form as any)[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="input"
                  placeholder={placeholder}
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">咨询行业 *</label>
              <select
                value={form.industry}
                onChange={e => setForm(prev => ({ ...prev, industry: e.target.value }))}
                className="input"
              >
                <option value="">请选择</option>
                {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                咨询事宜 * <span className="text-gray-400 font-normal">({form.description.length}/200字)</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="input resize-none"
                rows={4}
                placeholder="请描述你想咨询的具体问题和背景信息，让专家提前了解你的情况..."
                maxLength={200}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={bookMutation.isPending}
            className="btn-primary w-full mt-6"
          >
            {bookMutation.isPending ? '提交中...' : '提交预约 →'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            提交后系统将自动发送邮件通知，请保持邮箱畅通
          </p>
        </>
      )}
    </div>
  );
}

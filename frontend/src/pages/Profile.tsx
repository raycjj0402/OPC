import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { User, BookOpen, Calendar, Star, Settings, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { expertsApi, authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const TABS = [
  { id: 'overview', label: '个人概览', icon: User },
  { id: 'bookings', label: '我的预约', icon: Calendar },
  { id: 'settings', label: '账号设置', icon: Settings },
];

const statusLabel: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: '待确认', color: 'text-amber-600 bg-amber-50', icon: Clock },
  CONFIRMED: { label: '已确认', color: 'text-blue-600 bg-blue-50', icon: CheckCircle },
  COMPLETED: { label: '已完成', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  CANCELLED: { label: '已取消', color: 'text-gray-500 bg-gray-50', icon: XCircle },
  NO_SHOW: { label: '已爽约', color: 'text-red-500 bg-red-50', icon: XCircle },
};

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [name, setName] = useState(user?.name || '');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => expertsApi.getMyBookings().then(r => r.data),
    enabled: activeTab === 'bookings',
  });

  const updateNameMutation = useMutation({
    mutationFn: () => authApi.updateProfile({ name }),
    onSuccess: () => {
      updateUser({ name });
      toast.success('名称已更新');
    },
    onError: () => toast.error('更新失败'),
  });

  const changePwMutation = useMutation({
    mutationFn: () => authApi.changePassword(oldPw, newPw),
    onSuccess: () => {
      toast.success('密码已修改，请重新登录');
      setOldPw(''); setNewPw('');
      setTimeout(() => { logout(); navigate('/login'); }, 1500);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || '修改失败'),
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => expertsApi.cancelBooking(bookingId),
    onSuccess: (data) => {
      toast.success(data.data.refundCredits ? '已取消，次数已归还' : '已取消');
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || '取消失败'),
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) => expertsApi.rateBooking(id, rating),
    onSuccess: () => {
      toast.success('评价成功！');
      qc.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });

  const planConfig = {
    FREE: { label: '免费版', color: 'bg-gray-100 text-gray-600', desc: '购买套餐解锁全部功能' },
    BASIC: { label: '基础套餐', color: 'bg-purple-100 text-purple-700', desc: '已解锁全部学习内容' },
    ADVANCED: { label: '进阶套餐', color: 'bg-amber-100 text-amber-700', desc: `剩余 ${user?.consultationsLeft || 0} 次专家咨询` },
  };
  const plan = planConfig[user?.plan || 'FREE'];

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{user?.name || user?.email}</h1>
            <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge ${plan.color}`}>{plan.label}</span>
              <span className="text-xs text-gray-500">{plan.desc}</span>
            </div>
          </div>
          {user?.plan !== 'ADVANCED' && (
            <button
              onClick={() => navigate('/payment')}
              className="btn-primary text-sm py-2 px-4 flex-shrink-0"
            >
              {user?.plan === 'FREE' ? '购买套餐' : '升级进阶'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Onboarding info */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">我的学习设置</h3>
              <button
                onClick={() => navigate('/onboarding')}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                修改设置 →
              </button>
            </div>
            {user?.onboarding ? (
              <div className="space-y-3">
                {[
                  { label: '所在城市', value: user.onboarding.city },
                  { label: '创业方向', value: user.onboarding.industries.join('、') },
                  { label: '资源偏好', value: user.onboarding.resourcePrefs.join('、') },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-gray-900 font-medium text-right max-w-[200px]">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-3">尚未完成个性化引导</p>
                <button onClick={() => navigate('/onboarding')} className="btn-primary text-sm py-2 px-4">
                  开始引导
                </button>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: BookOpen, label: '学习路径', value: user?.plan !== 'FREE' ? '已生成' : '-', color: 'text-purple-600' },
              { icon: Calendar, label: '咨询次数', value: user?.plan === 'ADVANCED' ? `${user.consultationsLeft}次` : '-', color: 'text-blue-600' },
              { icon: Star, label: '社区积分', value: '初级', color: 'text-amber-600' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="card text-center py-4">
                <Icon size={20} className={`${color} mx-auto mb-2`} />
                <div className="font-bold text-gray-900 text-sm">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings tab */}
      {activeTab === 'bookings' && (
        <div>
          {user?.plan !== 'ADVANCED' ? (
            <div className="text-center py-12">
              <Calendar size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">专家咨询为进阶套餐专属功能</p>
              <button onClick={() => navigate('/payment')} className="btn-primary">
                升级至进阶套餐
              </button>
            </div>
          ) : bookingsLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="card animate-pulse h-28" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {bookings?.map((booking: any) => {
                const status = statusLabel[booking.status] || statusLabel.PENDING;
                const StatusIcon = status.icon;
                return (
                  <div key={booking.id} className="card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold">
                          {booking.expert?.name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{booking.expert?.name}</p>
                          <p className="text-xs text-gray-500">{booking.expert?.title}</p>
                        </div>
                      </div>
                      <span className={`badge flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={12} /> {status.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                      <div className="text-gray-500">咨询时间</div>
                      <div className="text-gray-900">
                        {dayjs(booking.slot?.startTime).format('MM月DD日 HH:mm')}
                      </div>
                      <div className="text-gray-500">咨询行业</div>
                      <div className="text-gray-900">{booking.industry}</div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Cancel button */}
                      {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                        <button
                          onClick={() => {
                            if (confirm('确认取消此预约？')) cancelMutation.mutate(booking.id);
                          }}
                          className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                        >
                          取消预约
                        </button>
                      )}

                      {/* Summary document */}
                      {booking.summaryDoc && (
                        <a
                          href={booking.summaryDoc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50"
                        >
                          查看总结文档
                        </a>
                      )}

                      {/* Rating */}
                      {booking.status === 'COMPLETED' && !booking.rating && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-500">评分：</span>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => rateMutation.mutate({ id: booking.id, rating: star })}
                              className="text-amber-400 hover:scale-110 transition-transform"
                            >
                              <Star size={20} className="fill-amber-400" />
                            </button>
                          ))}
                        </div>
                      )}
                      {booking.rating && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <span>已评分：</span>
                          {Array.from({ length: booking.rating }).map((_, i) => (
                            <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!bookings || bookings.length === 0) && (
                <div className="text-center py-12">
                  <Calendar size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm mb-4">还没有预约记录</p>
                  <button onClick={() => navigate('/experts')} className="btn-primary text-sm py-2 px-6">
                    预约专家
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">修改名称</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input flex-1"
                placeholder="你的名字"
              />
              <button
                onClick={() => updateNameMutation.mutate()}
                disabled={updateNameMutation.isPending || !name.trim()}
                className="btn-primary px-4"
              >
                保存
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-900 mb-4">修改密码</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={oldPw}
                onChange={e => setOldPw(e.target.value)}
                className="input"
                placeholder="当前密码"
              />
              <input
                type="password"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                className="input"
                placeholder="新密码（至少8位）"
              />
              <button
                onClick={() => changePwMutation.mutate()}
                disabled={changePwMutation.isPending || !oldPw || newPw.length < 8}
                className="btn-primary w-full"
              >
                {changePwMutation.isPending ? '修改中...' : '修改密码'}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-gray-900 mb-2">个性化学习设置</h3>
            <p className="text-sm text-gray-500 mb-3">修改城市、行业和资源偏好，学习路径将自动更新</p>
            <button
              onClick={() => navigate('/onboarding')}
              className="flex items-center justify-between w-full text-sm text-purple-600 hover:text-purple-700"
            >
              <span>进入设置向导</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="card border-red-100">
            <h3 className="font-bold text-gray-900 mb-2">账号操作</h3>
            <button
              onClick={() => {
                logout();
                navigate('/');
                toast.success('已退出登录');
              }}
              className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

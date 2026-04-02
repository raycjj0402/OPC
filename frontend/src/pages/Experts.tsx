import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Star, Users, Calendar, Lock } from 'lucide-react';
import { expertsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

const INDUSTRIES = ['全部', '电商', '知识付费', '教育', '金融', '开发类产品', 'AI工具'];

export default function ExpertsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [industry, setIndustry] = useState('');
  const isAdvanced = user?.plan === 'ADVANCED';

  const { data: experts, isLoading } = useQuery({
    queryKey: ['experts', industry],
    queryFn: () => expertsApi.getExperts(industry || undefined).then(r => r.data),
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">专家咨询</h1>
        <p className="text-gray-500 text-sm mt-1">进阶套餐用户可预约行业专家1对1深度咨询</p>
      </div>

      {/* 权益说明 */}
      {isAdvanced ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <Calendar size={20} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800">你有 <span className="text-2xl font-bold">{user.consultationsLeft}</span> 次预约机会</p>
            <p className="text-sm text-amber-600">已用 {2 - user.consultationsLeft} 次，每次约60分钟，含会后总结文档</p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-gray-400" />
            <div>
              <p className="font-medium text-gray-700">专家咨询为进阶套餐专属功能</p>
              <p className="text-sm text-gray-500">升级至 ¥999 进阶套餐，获得2次1对1咨询机会</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/payment')}
            className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
          >
            升级套餐
          </button>
        </div>
      )}

      {/* Industry filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {INDUSTRIES.map(ind => (
          <button
            key={ind}
            onClick={() => setIndustry(ind === '全部' ? '' : ind)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              (ind === '全部' && !industry) || industry === ind
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {ind}
          </button>
        ))}
      </div>

      {/* Expert cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card animate-pulse h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experts?.map((expert: any) => (
            <div key={expert.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {expert.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900">{expert.name}</h3>
                  <p className="text-sm text-gray-500 truncate">{expert.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-amber-500 text-sm">
                      <Star size={14} className="fill-amber-400" /> {expert.rating}
                    </span>
                    <span className="flex items-center gap-1 text-gray-400 text-sm">
                      <Users size={14} /> {expert.totalBookings}次咨询
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{expert.bio}</p>

              <div className="flex gap-2 flex-wrap mb-4">
                {expert.industries.map((ind: string) => (
                  <span key={ind} className="badge bg-purple-50 text-purple-700 text-xs">
                    {ind}
                  </span>
                ))}
              </div>

              <button
                onClick={() => isAdvanced && user.consultationsLeft > 0 ? navigate(`/experts/${expert.id}/book`) : navigate('/payment')}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                  isAdvanced && user.consultationsLeft > 0
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
                disabled={isAdvanced && user.consultationsLeft <= 0}
              >
                {!isAdvanced ? '升级套餐解锁' :
                  user.consultationsLeft <= 0 ? '次数已用完' : '预约咨询 →'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

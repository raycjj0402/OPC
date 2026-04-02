import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BookOpen, TrendingUp, Award, Calendar, ChevronRight, Flame } from 'lucide-react';
import { learningApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data: path, isLoading: pathLoading } = useQuery({
    queryKey: ['learning-path'],
    queryFn: () => learningApi.getPath().then(r => r.data),
    enabled: user?.plan !== 'FREE',
  });

  const { data: stats } = useQuery({
    queryKey: ['learning-stats'],
    queryFn: () => learningApi.getStats().then(r => r.data),
    enabled: user?.plan !== 'FREE',
  });

  if (user?.plan === 'FREE') {
    return (
      <div className="p-6 max-w-2xl mx-auto pt-16 text-center">
        <div className="text-6xl mb-6">🚀</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">欢迎来到OPC平台</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          购买套餐后，系统将为你生成专属的学习路径，
          整合政府政策、AI工具和行业方法论。
        </p>
        <button onClick={() => navigate('/payment')} className="btn-primary text-lg px-10 py-4">
          立即购买套餐，开启创业之旅 →
        </button>
        <p className="text-sm text-gray-400 mt-4">买断制 · ¥199 起 · 无订阅</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Welcome */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          你好，{user?.name || '创业者'} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {user?.onboarding ? (
            <span>
              {user.onboarding.city} · {user.onboarding.industries.join('/')} · 继续你的创业之路
            </span>
          ) : '完成引导问卷，解锁专属学习路径'}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            icon: BookOpen,
            label: '已完成课时',
            value: stats?.completedLessons || 0,
            unit: '节',
            color: 'text-purple-600',
            bg: 'bg-purple-50',
          },
          {
            icon: Flame,
            label: '连续学习',
            value: stats?.streakDays || 0,
            unit: '天',
            color: 'text-orange-500',
            bg: 'bg-orange-50',
          },
          {
            icon: TrendingUp,
            label: '整体进度',
            value: path?.overallProgress || 0,
            unit: '%',
            color: 'text-green-600',
            bg: 'bg-green-50',
          },
          {
            icon: Calendar,
            label: '剩余咨询',
            value: user?.consultationsLeft || 0,
            unit: '次',
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
        ].map(({ icon: Icon, label, value, unit, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={20} className={color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {value}<span className="text-sm text-gray-500 font-normal ml-1">{unit}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Learning path progress */}
      {pathLoading ? (
        <div className="card animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-2 bg-gray-200 rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      ) : path ? (
        <div className="card">
          {/* Overall progress */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-900">{path.title}</h2>
            <span className="text-sm text-purple-600 font-medium">{path.overallProgress}%</span>
          </div>
          <div className="progress-bar mb-1">
            <div className="progress-bar-fill" style={{ width: `${path.overallProgress}%` }} />
          </div>
          <p className="text-xs text-gray-500 mb-6">
            {path.completedModules}/{path.totalModules} 个模块完成
          </p>

          {/* Module list */}
          <div className="space-y-3">
            {path.modules.slice(0, 4).map((mod: any) => (
              <div
                key={mod.id}
                onClick={() => navigate(`/learning`)}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 cursor-pointer transition-all group"
              >
                <div className="text-2xl">{mod.icon || '📚'}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{mod.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="progress-bar flex-1 h-1.5">
                      <div className="progress-bar-fill h-full" style={{ width: `${mod.progress}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{mod.progress}%</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-purple-500 flex-shrink-0" />
              </div>
            ))}
          </div>

          {path.modules.length > 4 && (
            <button
              onClick={() => navigate('/learning')}
              className="w-full mt-4 text-sm text-purple-600 font-medium py-2 hover:bg-purple-50 rounded-xl transition-colors"
            >
              查看全部 {path.modules.length} 个模块 →
            </button>
          )}
        </div>
      ) : (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">📝</div>
          <h3 className="font-bold text-gray-900 mb-2">尚未生成学习路径</h3>
          <p className="text-gray-500 text-sm mb-4">完成个性化引导问卷，即可生成专属学习路径</p>
          <button onClick={() => navigate('/onboarding')} className="btn-primary">
            开始个性化引导
          </button>
        </div>
      )}

      {/* Recent lessons */}
      {stats?.recentLessons?.length > 0 && (
        <div className="card mt-4">
          <h3 className="font-bold text-gray-900 mb-4">最近学习</h3>
          <div className="space-y-3">
            {stats.recentLessons.slice(0, 3).map((lesson: any) => (
              <div
                key={lesson.lessonId}
                onClick={() => navigate(`/learning/lesson/${lesson.lessonId}`)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Award size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{lesson.title}</div>
                  <div className="text-xs text-gray-500">{lesson.moduleTitle}</div>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        {[
          { label: '政府资源库', icon: '🏛️', path: '/government', desc: '查询城市政策' },
          { label: '专家咨询', icon: '👨‍💼', path: '/experts', desc: `剩余${user?.consultationsLeft || 0}次`, show: user?.plan === 'ADVANCED' },
        ].filter(item => item.show !== false).map(item => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            className="card hover:shadow-md cursor-pointer transition-all group"
          >
            <div className="text-3xl mb-2">{item.icon}</div>
            <div className="font-semibold text-gray-900 text-sm">{item.label}</div>
            <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

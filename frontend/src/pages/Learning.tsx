import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CheckCircle, Circle, Clock, BookOpen } from 'lucide-react';
import { learningApi } from '../api/client';

export default function LearningPage() {
  const navigate = useNavigate();

  const { data: path, isLoading } = useQuery({
    queryKey: ['learning-path'],
    queryFn: () => learningApi.getPath().then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!path) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center pt-20">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">学习路径未生成</h2>
        <p className="text-gray-500 mb-6">请先完成个性化引导问卷</p>
        <button onClick={() => navigate('/onboarding')} className="btn-primary">
          开始引导
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{path.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
          <span>{path.completedModules}/{path.totalModules} 模块</span>
          <span>·</span>
          <span>整体进度 {path.overallProgress}%</span>
        </div>
        <div className="progress-bar mt-3">
          <div className="progress-bar-fill" style={{ width: `${path.overallProgress}%` }} />
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        {path.modules.map((mod: any, idx: number) => (
          <ModuleCard key={mod.id} module={mod} index={idx} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

function ModuleCard({ module, index, navigate }: any) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card overflow-hidden">
      {/* Module header */}
      <div
        className="flex items-center gap-4 cursor-pointer -mx-6 -mt-6 px-6 pt-6 pb-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="text-2xl">{module.icon || '📚'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-mono">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="font-bold text-gray-900 text-sm truncate">{module.title}</h3>
            {module.progress === 100 && (
              <span className="badge bg-green-100 text-green-700">已完成</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{module.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="progress-bar flex-1 h-1.5">
              <div className="progress-bar-fill h-full" style={{ width: `${module.progress}%` }} />
            </div>
            <span className="text-xs text-gray-500">{module.progress}%</span>
            <span className="text-xs text-gray-400">
              {module.completed}/{module.total}节
            </span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className={`text-gray-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
        />
      </div>

      {/* Chapters */}
      {expanded && (
        <div className="border-t border-gray-100 pt-4 -mx-6 px-6 -mb-6 pb-4 space-y-3 bg-gray-50/50">
          {module.chapters.map((chapter: any) => (
            <div key={chapter.id}>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                {chapter.title}
              </div>
              <div className="space-y-1">
                {chapter.lessons.map((lesson: any) => (
                  <div
                    key={lesson.id}
                    onClick={() => navigate(`/learning/lesson/${lesson.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white cursor-pointer transition-colors group"
                  >
                    {lesson.completed ? (
                      <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle size={18} className="text-gray-300 flex-shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${lesson.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {lesson.title}
                    </span>
                    {lesson.duration && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} /> {lesson.duration}分钟
                      </span>
                    )}
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-purple-500 flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Need to import useState
import { useState } from 'react';

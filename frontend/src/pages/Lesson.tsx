import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle, Clock, BookOpen, FileText, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { learningApi } from '../api/client';

const contentTypeIcons: Record<string, any> = {
  ARTICLE: BookOpen,
  VIDEO: Video,
  PDF: FileText,
  TOOL_CARD: BookOpen,
  CASE_STUDY: BookOpen,
};

export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [readProgress, setReadProgress] = useState(0);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => learningApi.getLesson(id!).then(r => r.data),
  });

  const progressMutation = useMutation({
    mutationFn: ({ progress, completed }: { progress: number; completed?: boolean }) =>
      learningApi.updateProgress(id!, progress, completed),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['learning-path'] });
    }
  });

  const completeMutation = useMutation({
    mutationFn: () => learningApi.markComplete(id!),
    onSuccess: () => {
      toast.success('已标记为完成 ✓');
      qc.invalidateQueries({ queryKey: ['lesson', id] });
      qc.invalidateQueries({ queryKey: ['learning-path'] });
    }
  });

  // Track scroll progress for articles
  useEffect(() => {
    if (!scrollRef.current || lesson?.contentType !== 'ARTICLE') return;

    const el = scrollRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const progress = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100));
      setReadProgress(progress);
      if (progress >= 80 && !lesson.completed) {
        progressMutation.mutate({ progress, completed: true });
      }
    };

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [lesson]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-full mb-3" />
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    );
  }

  if (!lesson) return null;

  const Icon = contentTypeIcons[lesson.contentType] || BookOpen;

  return (
    <div className="flex flex-col h-full" ref={scrollRef}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-1">
            <button
              onClick={() => navigate('/learning')}
              className="hover:text-gray-900 flex items-center gap-1"
            >
              <ArrowLeft size={14} /> 返回课程
            </button>
            <span>·</span>
            <span className="truncate">{lesson.chapter.module.title}</span>
            <span>·</span>
            <span className="truncate">{lesson.chapter.title}</span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-tight truncate pr-4">
              {lesson.title}
            </h1>
            <div className="flex items-center gap-2 flex-shrink-0">
              {lesson.duration && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} /> {lesson.duration}分钟
                </span>
              )}
              {lesson.completed ? (
                <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle size={12} /> 已完成
                </span>
              ) : (
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="text-xs text-purple-600 border border-purple-200 px-3 py-1 rounded-full hover:bg-purple-50"
                >
                  标记完成
                </button>
              )}
            </div>
          </div>
          {/* Read progress bar */}
          {lesson.contentType === 'ARTICLE' && (
            <div className="h-0.5 bg-gray-100 mt-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-300"
                style={{ width: `${Math.max(lesson.progress, readProgress)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" ref={scrollRef}>
        <div className="max-w-3xl mx-auto">
          <article className="prose prose-gray max-w-none">
            {lesson.content ? (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {lesson.content}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Icon size={40} className="mx-auto mb-3 opacity-50" />
                <p>内容待上传</p>
              </div>
            )}
          </article>
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          {lesson.prevLesson ? (
            <button
              onClick={() => navigate(`/learning/lesson/${lesson.prevLesson.id}`)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft size={16} />
              <span className="truncate max-w-[200px]">{lesson.prevLesson.title}</span>
            </button>
          ) : <div />}

          {lesson.nextLesson ? (
            <button
              onClick={() => navigate(`/learning/lesson/${lesson.nextLesson.id}`)}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              <span className="truncate max-w-[200px]">{lesson.nextLesson.title}</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => navigate('/learning')}
              className="text-sm text-purple-600 font-medium"
            >
              完成本章 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

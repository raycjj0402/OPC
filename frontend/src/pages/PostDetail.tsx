import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Heart, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { communityApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => communityApi.getPost(id!).then(r => r.data),
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => communityApi.getComments(id!).then(r => r.data),
  });

  const likeMutation = useMutation({
    mutationFn: () => communityApi.likePost(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['post', id] }),
  });

  const commentMutation = useMutation({
    mutationFn: () => communityApi.createComment(id!, comment, replyTo || undefined),
    onSuccess: () => {
      setComment('');
      setReplyTo(null);
      qc.invalidateQueries({ queryKey: ['comments', id] });
      toast.success('评论发布成功');
    },
    onError: () => toast.error('评论失败，请重试'),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/community')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={16} /> 返回社区
      </button>

      {/* Post */}
      <div className="card mb-6">
        {/* Author */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white font-bold">
            {post.author?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-medium text-gray-900">{post.author?.name || '匿名'}</p>
            <p className="text-xs text-gray-500">{dayjs(post.createdAt).fromNow()}</p>
          </div>
          <div className="ml-auto flex gap-2">
            {post.industry && (
              <span className="badge bg-purple-50 text-purple-700">{post.industry}</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-4">{post.title}</h1>

        {/* Content */}
        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm sm:text-base mb-4">
          {post.content}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-4">
            {post.tags.map((tag: string) => (
              <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={() => likeMutation.mutate()}
            className={`flex items-center gap-2 text-sm transition-colors ${
              post.liked ? 'text-red-500' : 'text-gray-500 hover:text-red-400'
            }`}
          >
            <Heart size={18} className={post.liked ? 'fill-red-500' : ''} />
            <span>{post.likeCount} 点赞</span>
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MessageSquare size={18} />
            <span>{post.commentCount} 评论</span>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="card">
        <h2 className="font-bold text-gray-900 mb-4">评论 ({comments?.length || 0})</h2>

        {/* Comment input */}
        <div className="flex gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && comment.trim() && commentMutation.mutate()}
              className="input flex-1"
              placeholder={replyTo ? '回复评论...' : '写下你的评论...'}
            />
            {replyTo && (
              <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                取消回复
              </button>
            )}
            <button
              onClick={() => comment.trim() && commentMutation.mutate()}
              disabled={!comment.trim() || commentMutation.isPending}
              className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Comment list */}
        <div className="space-y-4">
          {comments?.map((c: any) => (
            <CommentItem key={c.id} comment={c} onReply={() => setReplyTo(c.id)} />
          ))}
          {(!comments || comments.length === 0) && (
            <p className="text-center text-gray-400 py-6 text-sm">还没有评论，来第一个发言吧！</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment, onReply }: { comment: any; onReply: () => void }) {
  return (
    <div>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {comment.author?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{comment.author?.name || '匿名'}</span>
            <span className="text-xs text-gray-400">{dayjs(comment.createdAt).fromNow()}</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
          <button
            onClick={onReply}
            className="text-xs text-gray-400 hover:text-purple-600 mt-1 transition-colors"
          >
            回复
          </button>

          {/* Replies */}
          {comment.replies?.length > 0 && (
            <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100">
              {comment.replies.map((reply: any) => (
                <div key={reply.id} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-300 to-violet-400 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                    {reply.author?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-900">{reply.author?.name} </span>
                    <span className="text-xs text-gray-500">{dayjs(reply.createdAt).fromNow()}</span>
                    <p className="text-sm text-gray-700 mt-0.5">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

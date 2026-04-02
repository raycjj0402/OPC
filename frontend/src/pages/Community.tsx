import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageSquare, Pin, Star, Plus, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { communityApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const INDUSTRIES = ['全部', '电商', '知识付费', '教育', '金融', '开发类产品', '其他'];

export default function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [industry, setIndustry] = useState('');
  const [featured, setFeatured] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['posts', industry, featured],
    queryFn: () => communityApi.getPosts({
      ...(industry ? { industry } : {}),
      ...(featured ? { featured: 'true' } : {}),
    }).then(r => r.data),
  });

  const likeMutation = useMutation({
    mutationFn: (postId: string) => communityApi.likePost(postId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OPC 社区</h1>
          <p className="text-gray-500 text-sm mt-1">与同类创业者交流，抱团取暖</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 py-2 text-sm"
        >
          <Plus size={16} /> 发帖
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-wrap flex-1">
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
        <button
          onClick={() => setFeatured(!featured)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            featured ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Star size={14} /> 精华帖
        </button>
      </div>

      {/* Post list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="card animate-pulse h-32" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data?.map((post: any) => (
            <div
              key={post.id}
              onClick={() => navigate(`/community/${post.id}`)}
              className="card hover:shadow-md cursor-pointer transition-shadow group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {post.isPinned && (
                      <span className="badge bg-red-50 text-red-600 flex items-center gap-1">
                        <Pin size={10} /> 置顶
                      </span>
                    )}
                    {post.isFeatured && (
                      <span className="badge bg-amber-50 text-amber-600 flex items-center gap-1">
                        <Star size={10} /> 精华
                      </span>
                    )}
                    {post.industry && (
                      <span className="badge bg-purple-50 text-purple-700">{post.industry}</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors mb-1">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.content}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[9px] font-bold">
                        {post.author?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs text-gray-500">{post.author?.name || '匿名'}</span>
                    </div>
                    <span className="text-xs text-gray-400">{dayjs(post.createdAt).fromNow()}</span>
                    <span className="text-xs text-gray-400">{post.viewCount} 阅读</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-3 flex-shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); likeMutation.mutate(post.id); }}
                    className={`flex flex-col items-center gap-0.5 text-xs transition-colors ${
                      post.liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart size={16} className={post.liked ? 'fill-red-500' : ''} />
                    <span>{post.likeCount}</span>
                  </button>
                  <div className="flex flex-col items-center gap-0.5 text-xs text-gray-400">
                    <MessageSquare size={16} />
                    <span>{post.commentCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {(!data?.data || data.data.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">💬</p>
              <p>还没有帖子，来发第一帖吧！</p>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreatePostModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            qc.invalidateQueries({ queryKey: ['posts'] });
            toast.success('发布成功！');
          }}
        />
      )}
    </div>
  );
}

function CreatePostModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [industry, setIndustry] = useState('');
  const [tags, setTags] = useState('');

  const createMutation = useMutation({
    mutationFn: () => communityApi.createPost({
      title,
      content,
      industry: industry || undefined,
      tags: tags ? tags.split(' ').map(t => t.trim()).filter(Boolean) : [],
    }),
    onSuccess,
    onError: (err: any) => toast.error(err.response?.data?.message || '发布失败'),
  });

  const qc = useQueryClient();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">发表帖子</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">标题 *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input"
              placeholder="一个吸引人的标题..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">内容 *</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="input resize-none"
              rows={5}
              placeholder="分享你的经验、问题或想法..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">行业</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className="input">
                <option value="">不限</option>
                {INDUSTRIES.filter(i => i !== '全部').map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">标签（空格分隔）</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="input"
                placeholder="如：变现 副业"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} className="btn-secondary flex-1">取消</button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !title || !content}
            className="btn-primary flex-1"
          >
            {createMutation.isPending ? '发布中...' : '发布'}
          </button>
        </div>
      </div>
    </div>
  );
}

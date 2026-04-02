import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Bookmark, BookmarkCheck, MapPin, Send, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { governmentApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

const CITIES = ['全部', '北京', '上海', '广州', '深圳', '重庆', '杭州', '南京'];
const CATEGORIES: Record<string, string> = {
  COMPUTE_SUBSIDY: '算力/工具补贴',
  SPACE_SUPPORT: '空间支持',
  STARTUP_FUND: '资金启动',
  TAX_INCENTIVE: '税收优惠',
  SERVICE_ECOSYSTEM: '服务生态',
};

export default function GovernmentPage() {
  const { user } = useAuthStore();
  const [city, setCity] = useState(user?.onboarding?.city || '');
  const [keyword, setKeyword] = useState('');
  const [question, setQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'qa'>('list');
  const qc = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ['policies', city, keyword],
    queryFn: () => governmentApi.getPolicies({
      ...(city && city !== '全部' ? { city } : {}),
      ...(keyword ? { keyword } : {}),
    }).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (id: string) => governmentApi.savePolicy(id),
    onSuccess: (data) => {
      toast.success(data.data.saved ? '已收藏' : '已取消收藏');
      qc.invalidateQueries({ queryKey: ['policies'] });
    }
  });

  const askMutation = useMutation({
    mutationFn: (q: string) => governmentApi.ask({
      question: q,
      city: city && city !== '全部' ? city : undefined,
    }),
    onSuccess: (data) => {
      setQaHistory(prev => [data.data, ...prev]);
      setQuestion('');
    },
    onError: () => toast.error('查询失败，请重试'),
  });

  const handleAsk = () => {
    if (!question.trim()) return toast.error('请输入问题');
    askMutation.mutate(question);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">政府资源库</h1>
        <p className="text-gray-500 text-sm mt-1">7城市创业扶持政策，AI智能问答</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {[{ id: 'list', label: '政策列表' }, { id: 'qa', label: 'AI问答' }].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="搜索政策关键词..."
                className="input pl-10"
              />
            </div>
          </div>

          {/* City filter */}
          <div className="flex gap-2 flex-wrap mb-6">
            {CITIES.map(c => (
              <button
                key={c}
                onClick={() => setCity(c === '全部' ? '' : c)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  (c === '全部' && !city) || city === c
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Policy list */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="card animate-pulse h-28" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {policies?.data?.map((policy: any) => (
                <div key={policy.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge bg-purple-50 text-purple-700 flex items-center gap-1">
                          <MapPin size={10} /> {policy.city}
                        </span>
                        <span className="badge bg-gray-100 text-gray-600">
                          {CATEGORIES[policy.category] || policy.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">{policy.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{policy.summary}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {policy.tags.slice(0, 4).map((tag: string) => (
                          <span key={tag} className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => saveMutation.mutate(policy.id)}
                      className={`flex-shrink-0 p-2 rounded-xl transition-colors ${
                        policy.saved ? 'text-purple-600 bg-purple-50' : 'text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {policy.saved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>
                  </div>
                </div>
              ))}
              {(!policies?.data || policies.data.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  <p>暂无匹配的政策，换个关键词试试</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'qa' && (
        <div>
          {/* Question input */}
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">向AI咨询政策问题</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                placeholder={`关于${city || '各城市'}的创业政策，有什么想问的？`}
                className="input flex-1"
              />
              <button
                onClick={handleAsk}
                disabled={askMutation.isPending}
                className="btn-primary flex items-center gap-2 px-4"
              >
                <Send size={16} />
                {askMutation.isPending ? '查询中...' : '提问'}
              </button>
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {[
                `${city || '北京'}有哪些AI创业补贴？`,
                '如何申请创业担保贷款？',
                '有哪些免费的创业孵化器？',
              ].map(q => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="text-xs text-purple-600 bg-purple-50 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* QA History */}
          {askMutation.isPending && (
            <div className="card mb-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
                <div className="h-3 bg-gray-200 rounded w-4/6" />
              </div>
            </div>
          )}

          {qaHistory.map((qa: any, i: number) => (
            <div key={i} className="card mb-4">
              <div className="flex items-start gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                  Q
                </div>
                <p className="text-gray-900 font-medium text-sm">{qa.question}</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">
                  A
                </div>
                <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap flex-1">
                  {qa.answer}
                </div>
              </div>
              {qa.sources?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">参考来源：</p>
                  <div className="flex gap-2 flex-wrap">
                    {qa.sources.map((s: any, idx: number) => (
                      <span key={idx} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                        {s.city} · {s.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {qaHistory.length === 0 && !askMutation.isPending && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">🤖</p>
              <p>输入问题，AI为你解读政策</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Download, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/client';
import dayjs from 'dayjs';

const PLAN_LABELS: Record<string, string> = {
  FREE: '免费版', BASIC: '基础套餐', ADVANCED: '进阶套餐'
};
const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-gray-100 text-gray-600',
  BASIC: 'bg-purple-100 text-purple-700',
  ADVANCED: 'bg-amber-100 text-amber-700',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '正常', SUSPENDED: '封禁', REFUNDED: '已退款'
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-50 text-green-700',
  SUSPENDED: 'bg-red-50 text-red-600',
  REFUNDED: 'bg-gray-100 text-gray-500',
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [plan, setPlan] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, keyword, plan],
    queryFn: () => adminApi.getUsers({
      page: String(page),
      limit: '20',
      ...(keyword ? { keyword } : {}),
      ...(plan ? { plan } : {}),
    }).then(r => r.data),
  });

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user', selectedUser],
    queryFn: () => adminApi.getUser(selectedUser).then(r => r.data),
    enabled: !!selectedUser,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: () => {
      toast.success('状态已更新');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('操作失败'),
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">用户管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">共 {data?.total || 0} 个注册用户</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索邮箱或用户ID..."
            className="input pl-9 text-sm py-2.5"
          />
        </div>
        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          className="input w-36 py-2.5 text-sm"
        >
          <option value="">全部套餐</option>
          <option value="FREE">免费版</option>
          <option value="BASIC">基础套餐</option>
          <option value="ADVANCED">进阶套餐</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['邮箱', '名称', '套餐', '城市', '行业', '课时数', '注册时间', '状态', '操作'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.map((user: any) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 text-gray-900 font-medium max-w-[200px] truncate">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {user.name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${PLAN_COLORS[user.plan]}`}>
                      {PLAN_LABELS[user.plan]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{user.city || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">
                    {user.industries?.join('、') || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-center">{user.lessonCount}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {dayjs(user.createdAt).format('MM/DD HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[user.status]}`}>
                      {STATUS_LABELS[user.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedUser(user.id)}
                        className="text-purple-600 hover:text-purple-800 p-1 rounded"
                        title="查看详情"
                      >
                        <Eye size={15} />
                      </button>
                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() => statusMutation.mutate({ id: user.id, status: 'SUSPENDED' })}
                          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-0.5 rounded-lg"
                        >
                          封禁
                        </button>
                      ) : user.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => statusMutation.mutate({ id: user.id, status: 'ACTIVE' })}
                          className="text-xs text-green-600 hover:text-green-800 border border-green-200 px-2 py-0.5 rounded-lg"
                        >
                          解封
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              共 {data.total} 条，第 {page}/{data.totalPages} 页
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User detail modal */}
      {selectedUser && userDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900">用户详情</h2>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: '邮箱', value: userDetail.email },
                  { label: '名称', value: userDetail.name || '-' },
                  { label: '套餐', value: PLAN_LABELS[userDetail.subscription?.plan] || '-' },
                  { label: '状态', value: STATUS_LABELS[userDetail.status] },
                  { label: '注册时间', value: dayjs(userDetail.createdAt).format('YYYY/MM/DD HH:mm') },
                  { label: '最近登录', value: userDetail.lastLoginAt ? dayjs(userDetail.lastLoginAt).format('MM/DD HH:mm') : '-' },
                  { label: '城市', value: userDetail.onboarding?.city || '-' },
                  { label: '行业', value: userDetail.onboarding?.industries?.join('、') || '-' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                    <p className="font-medium text-gray-900">{value}</p>
                  </div>
                ))}
              </div>

              {/* Orders */}
              {userDetail.subscription?.orders?.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">订单记录</h4>
                  <div className="space-y-2">
                    {userDetail.subscription.orders.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <span className="font-medium">{o.orderNo}</span>
                          <span className="ml-2 text-gray-500">{PLAN_LABELS[o.plan]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-purple-600">¥{o.amount / 100}</span>
                          <span className={`badge text-xs ${o.status === 'PAID' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {o.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent progress */}
              {userDetail.lessonProgress?.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">最近完成课时（前10条）</h4>
                  <div className="space-y-1">
                    {userDetail.lessonProgress.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs">
                        <span className="text-green-500">✓</span>
                        <span className="text-gray-700 flex-1 truncate">{p.lesson?.title}</span>
                        <span className="text-gray-400 flex-shrink-0">
                          {p.completedAt ? dayjs(p.completedAt).format('MM/DD') : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, DollarSign, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/client';
import dayjs from 'dayjs';

const PLAN_LABELS: Record<string, string> = { FREE: '免费', BASIC: '基础¥199', ADVANCED: '进阶¥999' };
const ORDER_TYPE_LABELS: Record<string, string> = { NEW: '新购', UPGRADE: '升级补差价' };
const STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-50 text-green-700',
  PENDING: 'bg-amber-50 text-amber-700',
  REFUNDING: 'bg-orange-50 text-orange-700',
  REFUNDED: 'bg-gray-100 text-gray-500',
  CANCELLED: 'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, string> = {
  PAID: '已完成', PENDING: '待支付', REFUNDING: '退款中', REFUNDED: '已退款', CANCELLED: '已取消'
};

export default function AdminOrders() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [refundModal, setRefundModal] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, status],
    queryFn: () => adminApi.getOrders({
      page: String(page),
      limit: '20',
      ...(status ? { status } : {}),
    }).then(r => r.data),
  });

  const refundMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.refundOrder(id, reason),
    onSuccess: () => {
      toast.success('退款处理成功，用户权益已关闭');
      setRefundModal(null);
      setRefundReason('');
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || '操作失败'),
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">订单与收入</h1>
          <p className="text-sm text-gray-500">
            共 {data?.total || 0} 笔订单 · 总收入
            <span className="text-purple-600 font-bold ml-1">¥{(data?.totalRevenue || 0).toLocaleString()}</span>
          </p>
        </div>
      </div>

      {/* Revenue summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: '待支付', count: data?.data?.filter((o: any) => o.status === 'PENDING').length || 0, color: 'text-amber-600' },
          { label: '已完成', count: data?.data?.filter((o: any) => o.status === 'PAID').length || 0, color: 'text-green-600' },
          { label: '已退款', count: data?.data?.filter((o: any) => o.status === 'REFUNDED').length || 0, color: 'text-gray-500' },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <DollarSign size={20} className={color} />
            <div>
              <div className={`font-bold text-lg ${color}`}>{count}</div>
              <div className="text-xs text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: '', label: '全部' },
          { value: 'PAID', label: '已完成' },
          { value: 'PENDING', label: '待支付' },
          { value: 'REFUNDED', label: '已退款' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              status === opt.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['订单号', '用户', '套餐', '类型', '金额', '支付方式', '时间', '状态', '操作'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.map((order: any) => (
                <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.orderNo}</td>
                  <td className="px-4 py-3 max-w-[140px] truncate text-gray-700">{order.userEmail}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{PLAN_LABELS[order.plan]}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${order.orderType === 'UPGRADE' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {ORDER_TYPE_LABELS[order.orderType]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-purple-600">¥{order.amount}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {order.paymentMethod === 'WECHAT' ? '💚 微信' : order.paymentMethod === 'ALIPAY' ? '💙 支付宝' : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {dayjs(order.createdAt).format('MM/DD HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.status === 'PAID' && (
                      <button
                        onClick={() => setRefundModal(order.id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 px-2 py-1 rounded-lg"
                      >
                        <RotateCcw size={11} /> 退款
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">共 {data.total} 条，第 {page}/{data.totalPages} 页</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
                className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refund modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">确认退款</h2>
              <p className="text-sm text-gray-500 mt-1">退款后用户权益将立即关闭，此操作不可撤销</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">退款原因 *</label>
              <textarea
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="请填写退款原因..."
              />
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => { setRefundModal(null); setRefundReason(''); }} className="btn-secondary flex-1">
                取消
              </button>
              <button
                onClick={() => refundMutation.mutate({ id: refundModal, reason: refundReason })}
                disabled={!refundReason || refundMutation.isPending}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {refundMutation.isPending ? '处理中...' : '确认退款'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

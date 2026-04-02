import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Mail, MailX, CheckCircle, XCircle, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/client';
import dayjs from 'dayjs';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-50 text-blue-700' },
  COMPLETED: { label: '已完成', color: 'bg-green-50 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
  NO_SHOW: { label: '用户爽约', color: 'bg-red-50 text-red-600' },
};

export default function AdminBookings() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);
  const [summaryModal, setSummaryModal] = useState<string | null>(null);
  const [summaryUrl, setSummaryUrl] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-bookings', page, status],
    queryFn: () => adminApi.getBookings({
      page: String(page),
      limit: '20',
      ...(status ? { status } : {}),
    }).then(r => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateBookingStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(`状态已更新为: ${STATUS_CONFIG[vars.status]?.label}`);
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: () => toast.error('操作失败'),
  });

  const summaryMutation = useMutation({
    mutationFn: ({ id, url }: { id: string; url: string }) =>
      adminApi.uploadSummary(id, url),
    onSuccess: () => {
      toast.success('总结已上传，用户邮件通知已发送');
      setSummaryModal(null);
      setSummaryUrl('');
      qc.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
    onError: () => toast.error('上传失败'),
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">预约管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">共 {data?.total || 0} 条预约记录</p>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { value: '', label: '全部' },
          { value: 'PENDING', label: '待确认' },
          { value: 'CONFIRMED', label: '已确认' },
          { value: 'COMPLETED', label: '已完成' },
          { value: 'CANCELLED', label: '已取消' },
          { value: 'NO_SHOW', label: '爽约' },
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
                {['用户', '专家', '行业', '咨询时间', '咨询事宜', '状态', '邮件', '操作'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.data?.map((booking: any) => {
                const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
                return (
                  <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50/50 align-top">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 font-medium text-xs truncate max-w-[120px]">
                        {booking.userName}
                      </div>
                      <div className="text-gray-500 text-[11px] truncate max-w-[120px]">
                        {booking.userEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{booking.expertName}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-purple-50 text-purple-700 text-[11px]">
                        {booking.industry}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {dayjs(booking.slotTime).format('MM/DD HH:mm')}
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="text-gray-700 text-xs">
                        {expandedDesc === booking.id
                          ? booking.descriptionPreview + '...'
                          : booking.descriptionPreview.slice(0, 30) + (booking.descriptionPreview.length > 30 ? '...' : '')
                        }
                        {booking.descriptionPreview.length > 30 && (
                          <button
                            onClick={() => setExpandedDesc(expandedDesc === booking.id ? null : booking.id)}
                            className="text-purple-600 ml-1"
                          >
                            {expandedDesc === booking.id ? '收起' : '展开'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-[11px] ${sc.color}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {booking.emailStatus === 'PARTIAL_FAILED' ? (
                        <span title="部分邮件发送失败"><MailX size={16} className="text-red-500" /></span>
                      ) : (
                        <span title="邮件已发送"><Mail size={16} className="text-green-500" /></span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {/* Confirm */}
                        {booking.status === 'PENDING' && (
                          <button
                            onClick={() => statusMutation.mutate({ id: booking.id, status: 'CONFIRMED' })}
                            className="flex items-center gap-1 text-[11px] text-green-600 border border-green-200 px-2 py-0.5 rounded-lg hover:bg-green-50 whitespace-nowrap"
                          >
                            <CheckCircle size={11} /> 确认
                          </button>
                        )}
                        {/* Complete */}
                        {booking.status === 'CONFIRMED' && (
                          <>
                            <button
                              onClick={() => setSummaryModal(booking.id)}
                              className="flex items-center gap-1 text-[11px] text-blue-600 border border-blue-200 px-2 py-0.5 rounded-lg hover:bg-blue-50 whitespace-nowrap"
                            >
                              <Upload size={11} /> 上传总结
                            </button>
                            <button
                              onClick={() => statusMutation.mutate({ id: booking.id, status: 'NO_SHOW' })}
                              className="flex items-center gap-1 text-[11px] text-orange-500 border border-orange-200 px-2 py-0.5 rounded-lg hover:bg-orange-50 whitespace-nowrap"
                            >
                              <XCircle size={11} /> 标记爽约
                            </button>
                          </>
                        )}
                        {/* Cancel */}
                        {['PENDING', 'CONFIRMED'].includes(booking.status) && (
                          <button
                            onClick={() => {
                              if (confirm('确认强制取消此预约？')) {
                                statusMutation.mutate({ id: booking.id, status: 'CANCELLED' });
                              }
                            }}
                            className="flex items-center gap-1 text-[11px] text-red-500 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-50 whitespace-nowrap"
                          >
                            <XCircle size={11} /> 取消
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Upload summary modal */}
      {summaryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">上传会后总结</h2>
              <p className="text-sm text-gray-500 mt-1">上传后系统将自动通知用户查阅文档</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">文档链接 *</label>
              <input
                type="url"
                value={summaryUrl}
                onChange={e => setSummaryUrl(e.target.value)}
                className="input"
                placeholder="https://docs.google.com/... 或其他文档链接"
              />
              <p className="text-xs text-gray-400 mt-2">
                支持 Google Docs、腾讯文档、飞书文档等链接
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => { setSummaryModal(null); setSummaryUrl(''); }} className="btn-secondary flex-1">
                取消
              </button>
              <button
                onClick={() => summaryMutation.mutate({ id: summaryModal, url: summaryUrl })}
                disabled={!summaryUrl || summaryMutation.isPending}
                className="btn-primary flex-1"
              >
                {summaryMutation.isPending ? '上传中...' : '确认上传'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

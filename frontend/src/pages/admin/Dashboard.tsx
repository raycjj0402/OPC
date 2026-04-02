import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { adminApi } from '../../api/client';
import { Users, DollarSign, Calendar, TrendingUp, ShoppingBag } from 'lucide-react';

const COLORS = ['#667eea', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then(r => r.data),
    refetchInterval: 30000, // 30秒刷新
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(j => (
              <div key={j} className="bg-white rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const s = data?.summary || {};

  const metricCards = [
    { label: '今日新增用户', value: s.todayNewUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', unit: '人' },
    { label: '今日基础付费', value: s.todayBasicOrders || 0, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', unit: '单' },
    { label: '今日进阶付费', value: s.todayAdvancedOrders || 0, icon: ShoppingBag, color: 'text-violet-600', bg: 'bg-violet-50', unit: '单' },
    { label: '今日收入', value: `¥${(s.todayRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50', unit: '' },
    { label: '累计用户', value: s.totalUsers || 0, icon: Users, color: 'text-gray-600', bg: 'bg-gray-100', unit: '人' },
    { label: '基础套餐用户', value: s.basicUsers || 0, icon: ShoppingBag, color: 'text-purple-600', bg: 'bg-purple-50', unit: '人' },
    { label: '进阶套餐用户', value: s.advancedUsers || 0, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50', unit: '人' },
    { label: '累计总收入', value: `¥${(s.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', unit: '' },
    { label: '待处理预约', value: s.pendingBookings || 0, icon: Calendar, color: 'text-red-600', bg: 'bg-red-50', unit: '个' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">数据概览</h1>
        <p className="text-sm text-gray-500 mt-0.5">实时业务数据监控</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {metricCards.map(({ label, value, icon: Icon, color, bg, unit }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-xl font-bold text-gray-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User & Order trend */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">7天注册 & 付费趋势</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="users" name="注册用户" stroke="#667eea" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="orders" name="付费订单" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue trend */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">7天收入趋势（元）</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any) => `¥${v}`} />
              <Bar dataKey="revenue" name="收入" fill="#667eea" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* City distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">用户城市分布</h3>
          {data?.cityDistribution?.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={data.cityDistribution}
                    dataKey="count"
                    nameKey="city"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {data.cityDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, n: any) => [v + '人', n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.cityDistribution.map((item: any, i: number) => (
                  <div key={item.city} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700">{item.city}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.count}人</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
          )}
        </div>

        {/* Industry distribution */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">行业偏好分布</h3>
          {data?.industryDistribution?.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={data.industryDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {data.industryDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.industryDistribution.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.value}人</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}

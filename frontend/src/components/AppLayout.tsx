import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, BookOpen, Building2, Users, TrendingUp,
  MessageSquare, User, LogOut, Menu, X, ChevronRight, Settings
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: '学习中心' },
  { to: '/learning', icon: BookOpen, label: '我的课程' },
  { to: '/government', icon: Building2, label: '政府资源' },
  { to: '/experts', icon: Users, label: '专家咨询' },
  { to: '/community', icon: MessageSquare, label: 'OPC社区' },
];

const planLabels = {
  FREE: { label: '免费版', color: 'bg-gray-100 text-gray-600' },
  BASIC: { label: '基础套餐', color: 'bg-purple-100 text-purple-700' },
  ADVANCED: { label: '进阶套餐', color: 'bg-amber-100 text-amber-700' },
};

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    navigate('/');
  };

  const plan = user?.plan || 'FREE';
  const planInfo = planLabels[plan];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white border-r border-gray-100 flex flex-col
        transform transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
              OPC
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">一人公司</div>
              <div className="text-xs text-gray-500">服务平台</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span className="text-sm">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* 套餐升级提示 */}
          {plan === 'FREE' && (
            <button
              onClick={() => navigate('/payment')}
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
            >
              立即购买套餐 <ChevronRight size={14} />
            </button>
          )}
          {plan === 'BASIC' && (
            <button
              onClick={() => navigate('/payment')}
              className="w-full bg-amber-50 border border-amber-200 text-amber-700 py-2 rounded-xl text-xs font-medium"
            >
              升级进阶套餐 →
            </button>
          )}

          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-gray-900">{user?.name || user?.email}</div>
              <span className={`badge text-[10px] ${planInfo.color}`}>{planInfo.label}</span>
            </div>
          </NavLink>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin')}
              className="sidebar-link w-full text-left"
            >
              <Settings size={18} />
              <span className="text-sm">后台管理</span>
            </button>
          )}

          <button onClick={handleLogout} className="sidebar-link w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut size={18} />
            <span className="text-sm">退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu size={20} />
          </button>
          <span className="font-bold text-gray-900">OPC平台</span>
          <NavLink to="/profile" className="p-2">
            <User size={20} className="text-gray-600" />
          </NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

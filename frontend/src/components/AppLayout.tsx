import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BarChart3, BookOpenText, CircleUserRound, LogOut, Menu, Sparkles, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPlanLabel } from '../utils/noif';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/dashboard', icon: BarChart3, label: '诊断总览' },
  { to: '/diagnosis', icon: Sparkles, label: '继续问诊' },
  { to: '/cases', icon: BookOpenText, label: '行业案例' },
  { to: '/profile', icon: CircleUserRound, label: '我的账户' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const planLabel = getPlanLabel(user?.plan || 'FREE');

  const handleLogout = () => {
    logout();
    toast.success('已退出 noif');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-white">
      <div className="noif-grid fixed inset-0 opacity-30 pointer-events-none" />
      <div className="noif-glow fixed left-[-8rem] top-24 h-72 w-72 opacity-50 pointer-events-none" />
      <div className="noif-glow fixed bottom-16 right-[-4rem] h-96 w-96 opacity-40 pointer-events-none" />

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#04101b]/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="关闭侧边栏"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#06111d]/95 px-5 py-6 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => navigate('/dashboard')} className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#7ae5ff_0%,#247cff_55%,#82b6ff_100%)] shadow-[0_12px_40px_rgba(36,124,255,0.35)]">
              <span className="text-lg font-black text-[#02101c]">N</span>
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-white">noif</div>
              <div className="text-xs text-slate-400">创业 / 副业避坑导航仪</div>
            </div>
          </button>
          <button type="button" className="rounded-xl p-2 text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">当前版本</div>
          <div className="mt-2 text-xl font-semibold text-white">{planLabel}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {user?.plan === 'FREE'
              ? '完成付费后即可解锁问诊与个性化报告。'
              : '继续补全你的盲区，报告会随着回答不断刷新。'}
          </p>
          {user?.plan === 'FREE' && (
            <button type="button" className="btn-primary mt-4 w-full" onClick={() => navigate('/payment')}>
              选择版本
            </button>
          )}
        </div>

        <nav className="mt-6 space-y-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `noif-nav-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">{user?.name || '创业者'}</div>
            <div className="mt-1 text-sm text-slate-400">{user?.email}</div>
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:bg-white/5 hover:text-white"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#06111d]/72 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-10">
            <div className="flex items-center gap-3">
              <button type="button" className="rounded-xl border border-white/10 p-2 lg:hidden" onClick={() => setMobileOpen(true)}>
                <Menu size={18} />
              </button>
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">No More Ifs</div>
                <div className="text-sm text-slate-300">把未来最容易踩的坑，现在就看清。</div>
              </div>
            </div>
            <button
              type="button"
              className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-400/15 sm:inline-flex"
              onClick={() => navigate('/diagnosis')}
            >
              继续诊断
            </button>
          </div>
        </header>

        <main className="relative px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

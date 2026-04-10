import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { buildDemoToken, buildDemoUser } from '../utils/demoAuth';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDemoMode = import.meta.env.DEV;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      if (isDemoMode) {
        const demoUser = buildDemoUser(email, null, user);
        setAuth(buildDemoToken(email), demoUser);
        toast.success('登录成功');

        if (demoUser.plan === 'FREE') navigate('/payment');
        else if (!demoUser.onboardingCompleted) navigate('/onboarding');
        else navigate('/dashboard');
        return;
      }

      const { data } = await authApi.login(email, password);
      setAuth(data.token, data.user);
      toast.success('欢迎回来');

      if (data.user.plan === 'FREE') navigate('/payment');
      else if (!data.user.onboardingCompleted) navigate('/onboarding');
      else navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] px-4 py-8 text-white sm:px-6">
      <div className="noif-grid fixed inset-0 opacity-30 pointer-events-none" />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="noif-panel hidden p-10 lg:block">
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Back To The Hard Questions</div>
            <h1 className="mt-4 text-5xl font-black tracking-[-0.04em] text-white">你不是回来上课，而是回来继续看清风险。</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-400">
              noif 会记住你的创业画像、诊断进度和历史报告，让你在每次关键决策前都能回到现实里重新校准。
            </p>
          </section>

          <section className="noif-panel p-7 sm:p-10">
            <button type="button" className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white" onClick={() => navigate('/')}>
              <ArrowLeft size={16} />
              返回首页
            </button>

            <div className="mt-8">
            <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Sign In</div>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">登录 noif</h2>
            <p className="mt-3 text-base leading-8 text-slate-400">继续你的问诊、报告与案例库浏览。</p>
            {isDemoMode ? (
              <div className="mt-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/8 px-4 py-2 text-xs tracking-[0.14em] text-cyan-100">
                当前本地环境可直接进入，便于继续调试完整流程
              </div>
            ) : null}
          </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">邮箱</label>
                <input
                  type="email"
                  className="noif-input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="noif-input pr-12"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="请输入密码"
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? '登录中...' : '登录并继续'}
              </button>
            </form>

            <p className="mt-6 text-sm text-slate-400">
              还没有账号？
              <Link className="ml-2 text-cyan-300 transition hover:text-cyan-200" to="/register">
                创建 noif 账号
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

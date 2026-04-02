import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const sendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return toast.error('请输入有效的邮箱地址');
    }
    setLoading(true);
    try {
      const { data } = await authApi.sendCode(email);
      setCodeSent(true);
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timer); return 0; }
          return c - 1;
        });
      }, 1000);
      toast.success('验证码已发送');
      if (data.devCode) toast(`[开发模式] 验证码: ${data.devCode}`, { icon: '🔑' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || '发送失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return toast.error('请输入验证码');
    if (!password || password.length < 8) return toast.error('密码不能少于8位');
    setLoading(true);
    try {
      const { data } = await authApi.register({ email, password, code, name });
      setAuth(data.token, data.user);
      toast.success('注册成功！欢迎加入OPC平台');
      navigate('/payment');
    } catch (err: any) {
      toast.error(err.response?.data?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-violet-900 to-purple-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-purple-300 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={16} /> 返回首页
        </button>

        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold mx-auto mb-4">
              OPC
            </div>
            <h1 className="text-2xl font-bold text-gray-900">创建账号</h1>
            <p className="text-gray-500 text-sm mt-1">开始你的一人公司创业之旅</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">你的名字</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="如何称呼你？"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input flex-1"
                  placeholder="your@email.com"
                />
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={loading || countdown > 0}
                  className="flex-shrink-0 bg-purple-50 border border-purple-200 text-purple-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : (
                    <>
                      {loading ? <RefreshCw size={14} className="animate-spin" /> : null}
                      发送验证码
                    </>
                  )}
                </button>
              </div>
            </div>

            {codeSent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">验证码</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="input tracking-widest text-center text-xl font-mono"
                  placeholder="——  ——  ——  ——  ——  ——"
                  maxLength={6}
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">设置密码</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-12"
                  placeholder="至少8位"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !codeSent}
              className="btn-primary w-full"
            >
              {loading ? '注册中...' : '创建账号'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            注册即表示同意{' '}
            <a href="#" className="text-purple-600">服务条款</a>
            {' '}和{' '}
            <a href="#" className="text-purple-600">隐私政策</a>
          </p>

          <p className="text-center text-sm text-gray-500 mt-4">
            已有账号？{' '}
            <Link to="/login" className="text-purple-600 font-medium hover:text-purple-700">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

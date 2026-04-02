import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Star, Zap, BookOpen, Users, Building2, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const features = [
  { icon: BookOpen, title: '个性化学习路径', desc: '基于城市+行业+资源偏好，生成专属学习模块' },
  { icon: Building2, title: '政府资源库', desc: '7城市创业政策，AI智能问答，一键收藏' },
  { icon: Zap, title: 'AI工具指南', desc: '精选20+AI工具教程，覆盖内容/开发/运营全场景' },
  { icon: TrendingUp, title: '获客方法论', desc: '小红书、私域、直播等全渠道获客实战案例' },
  { icon: Users, title: '专家1对1咨询', desc: '进阶套餐可预约行业专家深度咨询（999元套餐）' },
  { icon: Star, title: 'OPC创业者社区', desc: '与同类创业者交流，精华帖+AMA活动' },
];

const plans = [
  {
    name: '基础套餐',
    price: 199,
    tag: null,
    features: [
      '个性化学习模块（全解锁）',
      '政府资源库（7城市）',
      'AI工具指南',
      '行业落地方法论',
      '开发资源中心',
      '获客方法论案例库',
      'OPC社区权限',
    ],
    cta: '立即购买 ¥199',
    variant: 'secondary',
  },
  {
    name: '进阶套餐',
    price: 999,
    tag: '最受欢迎',
    features: [
      '基础套餐全部权益',
      '2次行业专家1对1咨询',
      '每次约60分钟深度陪伴',
      '会后专属总结文档',
      '专家匹配+日历预约',
      '优先客服通道',
    ],
    cta: '立即购买 ¥999',
    variant: 'primary',
  },
];

const testimonials = [
  { name: '李明', role: '知识付费创业者', city: '北京', content: '通过OPC平台的引导，我在3个月内成功搭建了自己的知识付费体系，月收入突破了2万元。', rating: 5 },
  { name: '王芳', role: '独立开发者', city: '深圳', content: '政府资源库帮我找到了深圳的算力补贴，省了好几万。AI工具教程也超级实用！', rating: 5 },
  { name: '张伟', role: '电商创业者', city: '杭州', content: '专家1对1咨询是真的值，帮我避免了很多弯路，1小时的建议抵得上我自己摸索半年。', rating: 5 },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const handleCTA = () => {
    if (isAuthenticated) {
      if (user?.plan !== 'FREE') navigate('/dashboard');
      else navigate('/payment');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
              OPC
            </div>
            <span className="font-bold text-gray-900">一人公司服务平台</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm py-2">
                进入平台
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2">
                  登录
                </button>
                <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2">
                  免费注册
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-violet-900 to-purple-800 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-violet-400 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
            <Zap size={14} className="text-yellow-300" />
            <span>已帮助 2000+ 创业者走上正轨</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            一人公司的<span className="text-yellow-300">起跑线</span>
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-10 leading-relaxed">
            付费后通过个性化引导，为你生成专属学习路径。
            整合政府补贴、AI工具、行业方法论，让每个创业者第一步就站在巨人的肩膀上。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleCTA}
              className="w-full sm:w-auto bg-white text-purple-700 hover:bg-purple-50 px-8 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-2xl shadow-purple-900/40"
            >
              ¥199 立即开始 <ChevronRight size={20} />
            </button>
            <button
              onClick={() => document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-purple-200 hover:text-white text-sm flex items-center gap-1"
            >
              查看套餐详情 →
            </button>
          </div>
          <p className="mt-6 text-purple-300 text-sm">买断制，无订阅，终身使用</p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">一站式创业资源，开箱即用</h2>
          <p className="text-gray-500">告别信息碎片化，所有创业者需要的资源都在这里</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                <Icon size={22} className="text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">4步，生成你的专属创业路径</h2>
            <p className="text-gray-500">付费后立即进入个性化引导，平均5分钟完成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: '选择城市', desc: '7个城市可选，系统自动识别IP' },
              { step: '02', title: '选择行业', desc: '6大创业方向，最多选2个' },
              { step: '03', title: '资源偏好', desc: '5种资源类型，按需勾选' },
              { step: '04', title: '生成路径', desc: '专属学习模块立即生成' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">创业者真实反馈</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(({ name, role, city, content, rating }) => (
            <div key={name} className="card">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: rating }).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed mb-4">"{content}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  {name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{name}</div>
                  <div className="text-xs text-gray-500">{role} · {city}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="plans" className="bg-gradient-to-br from-gray-900 to-purple-950 text-white py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">买断制，无订阅</h2>
            <p className="text-gray-400">一次付费，终身使用。基础套餐可随时补差价升级。</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 border ${
                  plan.variant === 'primary'
                    ? 'bg-gradient-to-br from-purple-600 to-violet-600 border-purple-500'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {plan.tag && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full">
                    {plan.tag}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">¥{plan.price}</span>
                    <span className="text-sm opacity-70">买断</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <Check size={16} className={plan.variant === 'primary' ? 'text-yellow-300' : 'text-purple-400'} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate(isAuthenticated ? '/payment' : '/register')}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    plan.variant === 'primary'
                      ? 'bg-white text-purple-700 hover:bg-purple-50'
                      : 'bg-purple-600 text-white hover:bg-purple-500'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 text-sm mt-6">
            已是基础套餐用户？补差价 ¥800 即可升级进阶套餐，历史数据全部保留。
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs">
              OPC
            </div>
            <span className="font-bold text-white">一人公司服务平台</span>
          </div>
          <p className="text-sm mb-4">让每一个想创业的人，第一步就站在巨人的肩膀上</p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition-colors">隐私政策</a>
            <a href="#" className="hover:text-white transition-colors">服务条款</a>
            <a href="#" className="hover:text-white transition-colors">联系客服</a>
          </div>
          <p className="mt-6 text-xs text-gray-600">© 2026 OPC一人公司服务平台 · 保留所有权利</p>
        </div>
      </footer>
    </div>
  );
}

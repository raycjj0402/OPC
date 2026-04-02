import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Loader, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { onboardingApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

interface Options {
  cities: { name: string; province: string }[];
  industries: { id: string; label: string; icon: string; desc: string }[];
  resourceTypes: { id: string; label: string; icon: string; desc: string }[];
}

const STEPS = ['选择城市', '创业方向', '资源偏好', '生成路径'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<Options | null>(null);
  const [city, setCity] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [resourcePrefs, setResourcePrefs] = useState<string[]>([]);
  const [otherIndustry, setOtherIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    onboardingApi.getOptions().then(r => setOptions(r.data));
    // IP预选城市（模拟）
    setCity('上海');
  }, []);

  const toggleIndustry = (id: string) => {
    setIndustries(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const toggleResource = (id: string) => {
    setResourcePrefs(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const canNext = () => {
    if (step === 0) return !!city;
    if (step === 1) return industries.length >= 1;
    if (step === 2) return resourcePrefs.length >= 1;
    return true;
  };

  const handleSubmit = async () => {
    setGenerating(true);
    try {
      await onboardingApi.submit({ city, industries, resourcePrefs, otherIndustry });
      updateUser({ onboardingCompleted: true });
      setStep(3);
      setTimeout(() => {
        navigate('/dashboard');
        toast.success('🎉 专属学习路径已生成！');
      }, 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || '生成失败，请重试');
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-violet-900 to-purple-800">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center text-white mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 text-2xl">
            🚀
          </div>
          <h1 className="text-2xl font-bold mb-1">生成你的专属学习路径</h1>
          <p className="text-purple-300 text-sm">只需3步，个性化内容为你定制</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                i < step ? 'bg-green-400 text-white' :
                i === step ? 'bg-white text-purple-700' :
                'bg-white/20 text-white/60'
              }`}>
                {i < step ? <Check size={16} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 transition-all ${i < step ? 'bg-green-400' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-3xl p-6 shadow-2xl">
          {step === 0 && options && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">你在哪个城市？</h2>
              <p className="text-gray-500 text-sm mb-6">
                系统将根据城市为你匹配当地政府补贴政策
                <span className="inline-flex items-center gap-1 ml-2 text-purple-600">
                  <MapPin size={12} /> 已自动识别
                </span>
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {options.cities.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setCity(c.name)}
                    className={`p-3 rounded-2xl border-2 text-center transition-all ${
                      city === c.name
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{c.province}</div>
                    {city === c.name && (
                      <Check size={14} className="text-purple-500 mx-auto mt-1" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && options && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">你的创业方向？</h2>
              <p className="text-gray-500 text-sm mb-6">最多选择 2 个方向，选满后其余置灰</p>
              <div className="grid grid-cols-2 gap-3">
                {options.industries.map(ind => {
                  const isSelected = industries.includes(ind.id);
                  const isDisabled = !isSelected && industries.length >= 2;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => !isDisabled && toggleIndustry(ind.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${
                        isSelected ? 'border-purple-500 bg-purple-50' :
                        isDisabled ? 'border-gray-100 opacity-40 cursor-not-allowed' :
                        'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">{ind.icon}</div>
                      <div className="font-semibold text-gray-900 text-sm">{ind.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ind.desc}</div>
                    </button>
                  );
                })}
              </div>
              {industries.includes('其他') && (
                <input
                  type="text"
                  value={otherIndustry}
                  onChange={e => setOtherIndustry(e.target.value)}
                  className="input mt-3"
                  placeholder="请描述你的创业方向..."
                />
              )}
            </>
          )}

          {step === 2 && options && (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">你需要哪些资源？</h2>
              <p className="text-gray-500 text-sm mb-6">多选，至少选1个。这决定你的学习模块内容</p>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (resourcePrefs.length === options.resourceTypes.length) {
                      setResourcePrefs([]);
                    } else {
                      setResourcePrefs(options.resourceTypes.map(r => r.id));
                    }
                  }}
                  className="text-sm text-purple-600 font-medium"
                >
                  {resourcePrefs.length === options.resourceTypes.length ? '取消全选' : '全选'}
                </button>
                {options.resourceTypes.map(r => (
                  <div
                    key={r.id}
                    onClick={() => toggleResource(r.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      resourcePrefs.includes(r.id)
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                      resourcePrefs.includes(r.id)
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-300'
                    }`}>
                      {resourcePrefs.includes(r.id) && <Check size={14} className="text-white" />}
                    </div>
                    <span className="text-2xl">{r.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{r.label}</div>
                      <div className="text-xs text-gray-500">{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="text-center py-8">
              {generating ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-4">
                    <Loader size={30} className="text-purple-600 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">正在为你生成专属学习计划</h3>
                  <p className="text-gray-500 text-sm">根据你的城市、行业和资源偏好进行智能匹配...</p>
                </>
              ) : (
                <>
                  <div className="text-5xl mb-4">🎉</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">生成成功！</h3>
                  <p className="text-gray-500 text-sm">即将跳转到你的学习中心...</p>
                </>
              )}
            </div>
          )}

          {/* Nav buttons */}
          {step < 3 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <ChevronLeft size={18} /> 上一步
                </button>
              )}
              <button
                onClick={step === 2 ? handleSubmit : () => setStep(s => s + 1)}
                disabled={!canNext() || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {step === 2 ? '生成我的学习路径 🚀' : '下一步'}
                {step < 2 && <ChevronRight size={18} />}
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {step > 0 && step < 3 && (
          <div className="mt-4 flex items-center gap-3 text-white/60 text-sm justify-center">
            {city && <span className="bg-white/10 px-3 py-1 rounded-full">{city}</span>}
            {industries.map(ind => (
              <span key={ind} className="bg-white/10 px-3 py-1 rounded-full">{ind}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

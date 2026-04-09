import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Mic, Sparkles, Type } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  commonProfileFields,
  defaultProfileValues,
  interactionModes,
  resourcePreferenceOptions,
  ventureFieldMap,
  ventureTypeCards,
} from '../data/noif';
import { OnboardingProfile, ProfileField, VentureType } from '../types/noif';
import { useAuthStore } from '../store/authStore';

const steps = ['类型选择', '用户画像', '交互方式'];

const requiredProfileFields = ['city', 'familyStatus', 'occupationStatus', 'experience', 'skills', 'industry', 'budgetRange', 'projectSummary'];

function FieldBlock({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string | string[];
  onChange: (fieldId: string, nextValue: string | string[]) => void;
}) {
  if (field.type === 'text') {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-200">{field.label}</label>
        <textarea
          className="noif-input min-h-[120px]"
          value={typeof value === 'string' ? value : ''}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.id, event.target.value)}
        />
      </div>
    );
  }

  if (field.type === 'multiselect') {
    const current = Array.isArray(value) ? value : [];
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-200">{field.label}</label>
          {field.maxSelect ? <span className="text-xs text-slate-500">最多 {field.maxSelect} 项</span> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {field.options?.map((option) => {
            const selected = current.includes(option.value);
            const disableSelect = !selected && !!field.maxSelect && current.length >= field.maxSelect;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disableSelect}
                onClick={() =>
                  onChange(
                    field.id,
                    selected
                      ? current.filter((item) => item !== option.value)
                      : [...current, option.value]
                  )
                }
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  selected
                    ? 'border-cyan-300/50 bg-cyan-300/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/25 hover:text-white'
                } ${disableSelect ? 'cursor-not-allowed opacity-35' : ''}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-200">{field.label}</label>
      <div className="grid gap-3 sm:grid-cols-2">
        {field.options?.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(field.id, option.value)}
              className={`rounded-[1.5rem] border p-4 text-left transition ${
                selected
                  ? 'border-cyan-300/50 bg-cyan-300/12'
                  : 'border-white/10 bg-white/5 hover:border-cyan-400/25 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-medium text-white">{option.label}</div>
              {option.hint ? <div className="mt-2 text-xs leading-6 text-slate-500">{option.hint}</div> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [step, setStep] = useState(0);
  const [ventureType, setVentureType] = useState<VentureType>((user?.onboarding?.ventureType as VentureType) || 'SIDE_HUSTLE');
  const [profile, setProfile] = useState<Partial<OnboardingProfile>>({
    ...defaultProfileValues,
    ...(user?.onboarding || {}),
  });

  const profileFields = useMemo(
    () => [...commonProfileFields, ...ventureFieldMap[ventureType]],
    [ventureType]
  );

  const canProceed = useMemo(() => {
    if (step === 0) return !!ventureType;
    if (step === 1) {
      return requiredProfileFields.every((fieldId) => {
        const value = profile[fieldId as keyof OnboardingProfile];
        return Array.isArray(value) ? value.length > 0 : !!value;
      });
    }
    return !!profile.interactionMode;
  }, [profile, step, ventureType]);

  const setFieldValue = (fieldId: string, nextValue: string | string[]) => {
    setProfile((current) => ({
      ...current,
      [fieldId]: nextValue,
      industries: fieldId === 'industry' && typeof nextValue === 'string' ? [nextValue] : current.industries,
    }));
  };

  const handleFinish = () => {
    const completedProfile: OnboardingProfile = {
      ventureType,
      city: profile.city || '上海',
      familyStatus: profile.familyStatus || '',
      occupationStatus: profile.occupationStatus || '',
      experience: profile.experience || '',
      skills: (profile.skills as string[]) || [],
      budgetRange: profile.budgetRange || '',
      industry: profile.industry || '',
      projectSummary: profile.projectSummary || '',
      targetCustomer: profile.targetCustomer,
      channelOrLocation: profile.channelOrLocation,
      timeCommitment: profile.timeCommitment,
      sideHustlePolicy: profile.sideHustlePolicy,
      franchisePreference: profile.franchisePreference,
      seedUsers: profile.seedUsers,
      interactionMode: (profile.interactionMode || 'TEXT') as OnboardingProfile['interactionMode'],
      resourcePrefs: (profile.resourcePrefs as string[]) || [],
      industries: profile.industry ? [profile.industry] : [],
    };

    updateUser({
      onboardingCompleted: true,
      onboarding: completedProfile,
    });
    toast.success('用户画像已完成，开始正式问诊');
    navigate('/diagnosis');
  };

  return (
    <div className="min-h-screen bg-[#050b14] px-4 py-8 text-white sm:px-6">
      <div className="noif-grid fixed inset-0 opacity-30 pointer-events-none" />
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => navigate('/payment')} className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft size={16} />
          返回版本选择
        </button>

        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="space-y-6">
            <div className="noif-panel p-7">
              <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Step 02 · 问诊向导</div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">先把你的现实背景说清楚</h1>
              <p className="mt-4 text-base leading-8 text-slate-400">
                noif 不是让你填一个模板问卷，而是先拿到最关键的背景信息，再开始真正有针对性的追问。
              </p>
            </div>

            <div className="noif-panel p-6">
              <div className="space-y-4">
                {steps.map((item, index) => (
                  <div key={item} className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold ${
                        index < step
                          ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100'
                          : index === step
                            ? 'border-cyan-300/40 bg-cyan-300/10 text-white'
                            : 'border-white/10 bg-white/5 text-slate-500'
                      }`}
                    >
                      {index < step ? <Check size={16} /> : index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{item}</div>
                      <div className="text-xs text-slate-500">
                        {index === 0 && '选择你的创业 / 副业场景'}
                        {index === 1 && '补齐城市、预算、技能和项目画像'}
                        {index === 2 && '确定当前交互方式与信息偏好'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="noif-panel p-6 sm:p-8">
            {step === 0 && (
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Step 1</div>
                <h2 className="mt-3 text-3xl font-semibold text-white">你现在最接近哪一种场景？</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {ventureTypeCards.map((card) => {
                    const selected = ventureType === card.id;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => setVentureType(card.id)}
                        className={`rounded-[1.8rem] border p-5 text-left transition ${
                          selected
                            ? 'border-cyan-300/50 bg-cyan-300/12'
                            : 'border-white/10 bg-white/5 hover:border-cyan-400/25 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs uppercase tracking-[0.22em] text-cyan-300">{card.label}</div>
                        <div className="mt-3 text-xl font-semibold text-white">{card.title}</div>
                        <p className="mt-3 text-sm leading-7 text-slate-400">{card.description}</p>
                        <div className="mt-5 inline-flex rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                          {card.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Step 2</div>
                <h2 className="mt-3 text-3xl font-semibold text-white">补齐你的创业画像</h2>
                <div className="mt-8 space-y-8">
                  {profileFields.map((field) => (
                    <FieldBlock
                      key={field.id}
                      field={field}
                      value={(profile[field.id as keyof OnboardingProfile] as string | string[]) || (field.type === 'multiselect' ? [] : '')}
                      onChange={setFieldValue}
                    />
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Step 3</div>
                <h2 className="mt-3 text-3xl font-semibold text-white">选择交互方式与关注重点</h2>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {interactionModes.map((mode) => {
                    const selected = profile.interactionMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setFieldValue('interactionMode', mode.value)}
                        className={`rounded-[1.7rem] border p-5 text-left transition ${
                          selected
                            ? 'border-cyan-300/50 bg-cyan-300/12'
                            : 'border-white/10 bg-white/5 hover:border-cyan-400/25 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-cyan-200">
                            {mode.value === 'TEXT' ? <Type size={18} /> : <Mic size={18} />}
                          </div>
                          <div className="text-lg font-semibold text-white">{mode.label}</div>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-400">{mode.hint}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8">
                  <div className="mb-3 text-sm font-medium text-slate-200">你更想优先看到哪些信息？</div>
                  <div className="flex flex-wrap gap-3">
                    {resourcePreferenceOptions.map((item) => {
                      const current = (profile.resourcePrefs as string[]) || [];
                      const selected = current.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() =>
                            setFieldValue(
                              'resourcePrefs',
                              selected ? current.filter((value) => value !== item) : [...current, item]
                            )
                          }
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            selected
                              ? 'border-cyan-300/50 bg-cyan-300/15 text-white'
                              : 'border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/25 hover:text-white'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-8 rounded-[1.8rem] border border-cyan-400/20 bg-cyan-400/10 p-5">
                  <div className="flex items-center gap-3 text-cyan-200">
                    <Sparkles size={18} />
                    <span className="font-medium">你完成后将立即进入正式问诊</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-cyan-100/90">
                    noif 会根据你的类型、预算、城市、技能和当前约束，优先追问最容易让你事后说“如果”的部分。
                  </p>
                </div>
              </div>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {step > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setStep((current) => current - 1)}>
                  上一步
                </button>
              )}

              <button
                type="button"
                className="btn-primary flex-1 justify-center"
                disabled={!canProceed}
                onClick={() => {
                  if (step === steps.length - 1) {
                    handleFinish();
                    return;
                  }
                  setStep((current) => current + 1);
                }}
              >
                {step === steps.length - 1 ? '开始正式问诊' : '下一步'}
                {step === steps.length - 1 ? <Sparkles size={18} /> : <ArrowRight size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { caseStudies } from '../data/noif';

export default function CaseLibrary() {
  return (
    <div className="space-y-6">
      <section className="noif-panel p-8">
        <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">Case Library</div>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white">别人踩过的坑，最适合在你决定之前看</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-slate-400">
          这些案例不是为了制造焦虑，而是让你看见创业失败通常不是输在大方向，而是输在那些“我以为没问题”的细节上。
        </p>
      </section>

      <section className="space-y-6">
        {caseStudies.map((caseStudy) => (
          <article key={caseStudy.id} className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <div className="noif-panel p-7">
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">案例背景</div>
              <h2 className="mt-4 text-3xl font-semibold leading-tight text-white">{caseStudy.title}</h2>
              <div className="mt-6 space-y-5">
                {caseStudy.background.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-8 text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="noif-panel p-7">
              <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Noif 专业分析</div>
              <div className="mt-6 space-y-4">
                {caseStudy.analysis.map((item, index) => (
                  <div key={item} className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">动态 {index + 1}</div>
                    <p className="mt-3 text-base leading-8 text-white">{item}</p>
                  </div>
                ))}
              </div>
              {caseStudy.evidence ? (
                <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-[#091625] p-5">
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">行业数据</div>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{caseStudy.evidence}</p>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

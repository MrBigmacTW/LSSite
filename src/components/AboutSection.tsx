export default function AboutSection() {
  return (
    <section id="about" className="px-5 md:px-12 py-24 md:py-32 border-t border-bg3">
      <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
        {/* Left — Text */}
        <div>
          <span className="font-mono text-[11px] text-gold tracking-[3px] uppercase">
            About the Project
          </span>
          <h2 className="font-display text-[28px] md:text-[40px] leading-[1.3] mt-6">
            <span className="font-bold text-fg">原創設計，</span>
            <br />
            <span className="font-bold text-fg">嚴選策展，</span>
            <br />
            <span className="font-light text-fg2">台灣製造。</span>
          </h2>
          <div className="mt-8 space-y-4 font-body text-[15px] text-fg2 font-light leading-[2]">
            <p>
              龍蝦藝術網匯集多元風格的原創藝術設計，
              經過策展團隊精心挑選後，將每一款設計印製在高品質台灣製機能運動服上。
            </p>
            <p>
              每一件作品都經過嚴格的美學篩選，
              確保每個設計既有無限創意，又符合穿著者的品味。
            </p>
          </div>
        </div>

        {/* Right — Stats grid */}
        <div className="grid grid-cols-2 gap-4 md:gap-8">
          {[
            { number: "8", unit: "種", label: "Art Styles" },
            { number: "24/7", unit: "", label: "Always Creating" },
            { number: "100%", unit: "", label: "Made in Taiwan" },
            { number: "1/1", unit: "", label: "Unique Designs" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-bg2 border border-bg3 p-6 md:p-8"
            >
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[36px] md:text-[48px] font-bold text-fg">
                  {stat.number}
                </span>
                {stat.unit && (
                  <span className="font-display text-[16px] md:text-[20px] font-light text-fg3">
                    {stat.unit}
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-fg3 uppercase tracking-[1px] mt-2 block">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

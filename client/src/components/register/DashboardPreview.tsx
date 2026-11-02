const CARDS = [
  { value: '0', label: 'Saturdays attended', desc: 'Goes up each time you run with us.' },
  { value: 'Week 1', label: 'Your 5K program', desc: "Tick off this week's runs." },
  { value: 'Next', label: 'Upcoming event', desc: 'Your next event and your ticket.' },
  { value: 'You', label: 'Your zone captain', desc: 'Their name and number.' },
]

export default function DashboardPreview() {
  return (
    <section className="bg-ash light:bg-ash-light px-6 py-[72px] max-sm:px-4 max-sm:py-12">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-barlow-condensed font-bold text-[40px] max-sm:text-[32px] leading-[1.05] text-chalk light:text-chalk-light">
            Your dashboard
          </h2>
          <p className="m-0 text-fog light:text-fog-light">Everything about you in one place.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          {CARDS.map((card) => (
            <div
              key={card.label}
              className="flex-[1_1_220px] min-w-0 bg-ink light:bg-white border border-white/10 light:border-black/10 rounded-xl p-[22px] max-sm:p-[18px]"
            >
              <div className="font-barlow-condensed font-bold text-[38px] leading-tight text-chalk light:text-chalk-light">{card.value}</div>
              <div className="font-semibold text-chalk light:text-chalk-light">{card.label}</div>
              <div className="text-base text-fog light:text-fog-light">{card.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function MembershipTeaser() {
  return (
    <section className="px-6 md:px-10 py-20 bg-ash light:bg-ash-light border-y border-white/5 light:border-black/8">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light before:inline-block">
          Coming in 2027
        </div>
        <h2 className="font-bebas text-4xl md:text-5xl tracking-tight text-chalk light:text-chalk-light m-0">
          Next year we start a paid membership.
        </h2>
        <p className="text-lg text-fog light:text-fog-light m-0 leading-relaxed">
          Members will pay less for early Fit Fest tickets and book hike seats before everyone else. They will also get a discount on our programs and on TRFC clothes.
        </p>
        <p className="text-lg text-chalk light:text-chalk-light m-0 leading-relaxed">
          We will tell you when it opens, by text and email, through your account. Nobody has to join. Your free account stays free.
        </p>
      </div>
    </section>
  )
}

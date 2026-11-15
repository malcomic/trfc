interface DashboardTabsProps<T extends string> {
  tabs: Record<T, string>
  active: T
  onChange: (tab: T) => void
  /** Labels of tabs shown disabled and marked "Coming soon". */
  comingSoon?: string[]
}

export default function DashboardTabs<T extends string>({ tabs, active, onChange, comingSoon = [] }: DashboardTabsProps<T>) {
  return (
    <div className="flex gap-1 border-b border-white/10 light:border-black/10 mb-5 overflow-x-auto" role="tablist">
      {(Object.keys(tabs) as T[]).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={active === t}
          onClick={() => onChange(t)}
          className={`px-4 py-2.5 whitespace-nowrap font-barlow-condensed font-bold text-sm tracking-widest uppercase border-b-2 -mb-px transition ${
            active === t
              ? 'border-accent light:border-accent-light text-accent light:text-accent-light'
              : 'border-transparent text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light'
          }`}
        >
          {tabs[t]}
        </button>
      ))}
      {comingSoon.map((label) => (
        <button
          key={label}
          type="button"
          role="tab"
          aria-disabled="true"
          disabled
          title="Coming soon"
          className="px-4 py-2.5 whitespace-nowrap font-barlow-condensed font-bold text-sm tracking-widest uppercase border-b-2 border-transparent -mb-px text-fog/50 light:text-fog-light/50 cursor-not-allowed"
        >
          {label}
          <span className="ml-1.5 text-[10px] font-normal normal-case tracking-normal">Coming soon</span>
        </button>
      ))}
    </div>
  )
}

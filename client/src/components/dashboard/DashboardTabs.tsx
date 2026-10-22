interface DashboardTabsProps<T extends string> {
  tabs: Record<T, string>
  active: T
  onChange: (tab: T) => void
}

export default function DashboardTabs<T extends string>({ tabs, active, onChange }: DashboardTabsProps<T>) {
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
    </div>
  )
}

type AuthMode = 'new' | 'existing'

export default function AuthModeTabs({
  mode,
  onChange,
}: {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
}) {
  const tabClass = (active: boolean) =>
    `flex-1 min-h-11 px-3 rounded-lg font-barlow-condensed font-bold text-sm tracking-widest uppercase transition-colors duration-200 ${
      active
        ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
        : 'bg-ash light:bg-smoke-light text-chalk light:text-chalk-light hover:bg-ash/80 light:hover:bg-black/5'
    }`

  return (
    <div
      role="tablist"
      aria-label="Account options"
      className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-ash/50 light:bg-black/[0.04] border border-white/10 light:border-black/10"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'new'}
        id="auth-tab-new"
        onClick={() => onChange('new')}
        className={tabClass(mode === 'new')}
      >
        I'm new here
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'existing'}
        id="auth-tab-existing"
        onClick={() => onChange('existing')}
        className={tabClass(mode === 'existing')}
      >
        I have an account
      </button>
    </div>
  )
}

export type { AuthMode }

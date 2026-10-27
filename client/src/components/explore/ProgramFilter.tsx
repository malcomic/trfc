import { EXPLORE_COPY, EXPLORE_FILTERS, type ExploreFilter } from '../../content/explore'

const chip =
  'min-h-[44px] px-5 rounded-full font-barlow text-[17px] font-semibold border-[1.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cta'
const chipOn =
  'bg-chalk text-night border-chalk light:bg-chalk-light light:text-night-light light:border-chalk-light'
const chipOff =
  'bg-ink text-chalk border-mist hover:border-fog light:bg-white light:text-chalk-light light:border-fog-light light:hover:border-chalk-light'

export default function ProgramFilter({
  value,
  onChange,
}: {
  value: ExploreFilter
  onChange: (filter: ExploreFilter) => void
}) {
  return (
    <div role="group" aria-label={EXPLORE_COPY.programs.filterLabel} className="flex flex-wrap gap-2.5">
      {EXPLORE_FILTERS.map((f) => {
        const on = f.id === value
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(f.id)}
            className={`${chip} ${on ? chipOn : chipOff}`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

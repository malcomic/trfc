import type { ReactNode } from 'react'
import { Check, UserX } from 'lucide-react'
import CaptainAvatar from './CaptainAvatar'

export interface CaptainCardOption {
  id: string
  name: string
  zone: string
  photo_url: string | null
}

interface CaptainCardPickerProps {
  captains: CaptainCardOption[]
  value: string
  onChange: (id: string) => void
  /** Accessible name for the group, e.g. "Choose your captain". */
  label: string
  /** Show each captain's zone; off when every captain is in the same zone. */
  showZone?: boolean
  /** Adds a last card for "no captain", e.g. "I don't have one yet". */
  noneOption?: { value: string; label: string }
}

const cardBase =
  'relative flex flex-col items-center gap-2 p-3 pt-4 text-center border cursor-pointer transition-colors duration-150 clip-angled-sm focus-within:ring-2 focus-within:ring-accent light:focus-within:ring-accent-light'
const cardIdle =
  'bg-ash light:bg-smoke-light border-white/10 light:border-black/10 hover:border-accent/40 light:hover:border-accent-light/40'
const cardSelected = 'bg-accent/10 light:bg-accent-light/10 border-accent light:border-accent-light'

/** Captains as selectable photo cards (a radio group), so members can see who they are choosing. */
export default function CaptainCardPicker({
  captains,
  value,
  onChange,
  label,
  showZone = true,
  noneOption,
}: CaptainCardPickerProps) {
  const groupName = `captain-${label.replace(/\W+/g, '-').toLowerCase()}`

  const card = (id: string, selected: boolean, content: ReactNode) => (
    <label key={id} className={`${cardBase} ${selected ? cardSelected : cardIdle}`}>
      <input
        type="radio"
        name={groupName}
        value={id}
        checked={selected}
        onChange={() => onChange(id)}
        className="sr-only"
      />
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-accent light:bg-accent-light">
          <Check size={12} strokeWidth={3} className="text-black light:text-white" aria-hidden="true" />
        </span>
      )}
      {content}
    </label>
  )

  return (
    <div role="radiogroup" aria-label={label} className="max-h-[22rem] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {captains.map((captain) =>
          card(
            captain.id,
            value === captain.id,
            <>
              <CaptainAvatar name={captain.name} photoUrl={captain.photo_url} size="lg" />
              <span className="font-barlow font-semibold text-chalk light:text-chalk-light leading-tight">
                {captain.name}
              </span>
              {showZone && (
                <span className="text-xs text-fog light:text-fog-light leading-tight">Team {captain.zone}</span>
              )}
            </>
          )
        )}
        {noneOption &&
          card(
            noneOption.value,
            value === noneOption.value,
            <>
              <span className="w-20 h-20 rounded-full flex items-center justify-center bg-mist/40 light:bg-mist-light/40 text-fog light:text-fog-light">
                <UserX size={28} aria-hidden="true" />
              </span>
              <span className="font-barlow font-semibold text-fog light:text-fog-light leading-tight">{noneOption.label}</span>
            </>
          )}
      </div>
    </div>
  )
}

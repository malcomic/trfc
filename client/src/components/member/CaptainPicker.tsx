import { useEffect, useState, type FormEvent } from 'react'
import { AlertCircle, Loader } from 'lucide-react'
import { getMyCaptainOptions, updateMyCaptain, type CaptainOptions, type MemberCaptainSummary } from '../../api/users'
import { DASHBOARD_COPY } from '../../content/dashboard'
import { inputField } from '../../utils/themeClasses'
import { formatDate } from '../../utils/captainDisplay'
import CtaButton from '../programs/CtaButton'
import { dashLink, dashMuted } from './dashboard/ui'

const copy = DASHBOARD_COPY.zone
const labelClass = 'block font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2'

interface CaptainPickerProps {
  /** Show the picker straight away instead of behind a "Change captain" button. */
  startOpen?: boolean
  onChanged: (captain: MemberCaptainSummary | null) => void
}

export default function CaptainPicker({ startOpen = false, onChanged }: CaptainPickerProps) {
  const [options, setOptions] = useState<CaptainOptions | null>(null)
  const [open, setOpen] = useState(startOpen)
  const [selected, setSelected] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMyCaptainOptions()
      .then(setOptions)
      .catch((err: any) => setError(err.response?.data?.error || copy.failed))
  }, [])

  if (!options) {
    return error ? (
      <p className="mt-4 text-sm text-red-400 light:text-red-600">{error}</p>
    ) : (
      <Loader className="mt-4 w-5 h-5 animate-spin text-cta" aria-label="Loading captains" />
    )
  }

  const hasCaptain = Boolean(options.current_captain_id)
  const choices = options.captains.filter((c) => c.id !== options.current_captain_id)

  if (options.next_change_at) {
    return <p className={`${dashMuted} mt-4`}>{copy.nextChange(formatDate(options.next_change_at))}</p>
  }

  if (!open) {
    return (
      <button type="button" className={`${dashLink} mt-4 inline-block bg-transparent border-0 p-0 cursor-pointer`} onClick={() => setOpen(true)}>
        {copy.changeCaptain}
      </button>
    )
  }

  const save = async () => {
    if (!selected || saving) return
    setSaving(true)
    setError('')
    try {
      const result = await updateMyCaptain(selected)
      setOptions(result.options)
      setOpen(false)
      setSelected('')
      onChanged(result.captain)
    } catch (err: any) {
      setError(err.response?.data?.error || copy.failed)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="mt-5 space-y-3"
      onSubmit={(e: FormEvent) => {
        e.preventDefault()
        save()
      }}
    >
      <p className={dashMuted}>
        {options.zone ? copy.zoneOnly(options.zone.name) : copy.anyZone}
        {hasCaptain && ` ${copy.limitNote(options.change_days)}`}
      </p>
      {choices.length === 0 ? (
        <p className={dashMuted}>{copy.noCaptains}</p>
      ) : (
        <div>
          <label htmlFor="captain-picker" className={labelClass}>
            {copy.pickerLabel}
          </label>
          <select
            id="captain-picker"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={`w-full px-4 py-2.5 clip-angled-sm ${inputField}`}
          >
            <option value="">{copy.pickerPlaceholder}</option>
            {choices.map((c) => (
              <option key={c.id} value={c.id}>
                {options.zone ? c.name : `${c.name} (${c.zone})`}
              </option>
            ))}
          </select>
        </div>
      )}
      {error && (
        <p className="flex items-center gap-2 text-sm text-red-400 light:text-red-600" role="alert">
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {choices.length > 0 && (
          <CtaButton size="sm" disabled={!selected || saving} onClick={save}>
            {saving ? copy.saving : copy.save}
          </CtaButton>
        )}
        {hasCaptain && (
          <button type="button" className={`${dashLink} bg-transparent border-0 p-0 cursor-pointer`} onClick={() => setOpen(false)}>
            {copy.cancel}
          </button>
        )}
      </div>
    </form>
  )
}

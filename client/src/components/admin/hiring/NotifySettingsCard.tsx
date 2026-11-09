import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, Check } from 'lucide-react'
import { saveHiringSettings, type HiringSettings } from '../../../api/admin/hiring'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { adminName } from './hiringDisplay'

export default function NotifySettingsCard({
  settings,
  onSaved,
}: {
  settings: HiringSettings | null
  onSaved: (settings: HiringSettings) => void
}) {
  const [choice, setChoice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setChoice(settings?.notifyUserId ?? '')
  }, [settings?.notifyUserId])

  const current = settings?.notifyUserId ?? ''
  const changed = choice !== current

  const save = async () => {
    try {
      setSaving(true)
      setError('')
      const next = await saveHiringSettings(choice || null)
      onSaved(next)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-5 mb-6 text-gray-900 dark:text-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <Bell size={18} className="text-primary dark:text-primary-dark" aria-hidden="true" />
        <h2 className="text-base font-semibold m-0">New application emails</h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0 mb-3">
        Choose which admin gets an email each time someone applies to coach.
      </p>
      {settings && !settings.notifyUserId && (
        <div className="flex items-start gap-2 mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
          Nobody is getting these emails yet. Applications are still saved here.
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <label className="sr-only" htmlFor="hiring-notify">Send new application emails to</label>
        <select
          id="hiring-notify"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          disabled={!settings}
          className={`${adminSelectClass} sm:max-w-md`}
        >
          <option value="">Nobody</option>
          {settings?.admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {adminName(admin)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!changed || saving}
          className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50"
        >
          {saved ? <><Check size={16} /> Saved</> : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2 mb-0">{error}</p>}
    </section>
  )
}

import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader } from 'lucide-react'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { getMembershipSettings, saveMembershipSettings, type MembershipSettings } from '../../../api/admin/membership'
import { fromNairobiInput, toNairobiInput } from './membershipAdmin'

interface Form {
  standardPrice: string
  foundingPrice: string
  renewalPrice: string
  foundingLimit: string
  foundingDeadline: string
  renewalGraceDays: string
  salesOpenAt: string
  salesPaused: boolean
}

const toForm = (s: MembershipSettings): Form => ({
  standardPrice: String(s.standardPrice),
  foundingPrice: String(s.foundingPrice),
  renewalPrice: String(s.renewalPrice),
  foundingLimit: String(s.foundingLimit),
  foundingDeadline: toNairobiInput(s.foundingDeadline),
  renewalGraceDays: String(s.renewalGraceDays),
  salesOpenAt: toNairobiInput(s.salesOpenAt),
  salesPaused: s.salesPaused,
})

export default function SettingsTab() {
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getMembershipSettings()
      .then((s) => setForm(toForm(s)))
      .catch(() => setError('Failed to load membership settings'))
  }, [])

  if (!form) {
    return error ? (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 text-red-700 dark:text-red-400">
        <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
      </div>
    ) : (
      <div className="flex items-center justify-center h-48">
        <Loader className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f))

  const save = async () => {
    const foundingDeadline = fromNairobiInput(form.foundingDeadline)
    const salesOpenAt = fromNairobiInput(form.salesOpenAt)
    if (!foundingDeadline || !salesOpenAt) return setError('Choose valid dates')
    try {
      setSaving(true)
      setError('')
      const next = await saveMembershipSettings({
        standardPrice: Number(form.standardPrice),
        foundingPrice: Number(form.foundingPrice),
        renewalPrice: Number(form.renewalPrice),
        foundingLimit: Number(form.foundingLimit),
        foundingDeadline,
        renewalGraceDays: Number(form.renewalGraceDays),
        salesOpenAt,
        salesPaused: form.salesPaused,
      })
      setForm(toForm(next))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const number = (key: keyof Form, label: string, help?: string, step = '1') => (
    <label className="block">
      <span className="block mb-1">{label}</span>
      <input type="number" min={0} step={step} value={form[key] as string} onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)} className={adminSelectClass} />
      {help && <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">{help}</span>}
    </label>
  )

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 md:p-5 text-gray-900 dark:text-gray-100 text-sm">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {number('standardPrice', 'Standard price (KSh)', 'Full price for new members and anyone who comes back after the renewal window.')}
        {number('foundingPrice', 'Founding price (KSh)', 'For the first members, up to the limit and deadline.')}
        {number('renewalPrice', 'Renewal price (KSh)', 'For current members, and for the days after it ends set below.')}
        {number('foundingLimit', 'Founding places')}
        <label className="block">
          <span className="block mb-1">Founding price ends (Nairobi time)</span>
          <input type="datetime-local" value={form.foundingDeadline} onChange={(e) => set({ foundingDeadline: e.target.value })} className={adminSelectClass} />
        </label>
        {number('renewalGraceDays', 'Renewal days after it ends', 'How long the renewal price stays open after a membership ends.')}
        <label className="block">
          <span className="block mb-1">Sales open (Nairobi time)</span>
          <input type="datetime-local" value={form.salesOpenAt} onChange={(e) => set({ salesOpenAt: e.target.value })} className={adminSelectClass} />
        </label>
        <label className="flex items-center gap-3 md:col-span-2 min-h-[44px]">
          <input type="checkbox" checked={form.salesPaused} onChange={(e) => set({ salesPaused: e.target.checked })} className="w-5 h-5" />
          <span>
            <span className="font-semibold">Pause sales</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Nobody can pay while this is on. Current members are not affected.</span>
          </span>
        </label>
      </div>
      <div className="flex items-center justify-end gap-3 mt-4">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50">
          {saved ? <><Check size={16} /> Saved</> : saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { AlertCircle, ArrowDown, ArrowUp, Check, ChevronDown, Loader, Plus, Trash2 } from 'lucide-react'
import { adminSelectClass } from '../reachOut/ReachOutFilters'
import { getAdminPerks, reorderPerks, updatePerk } from '../../../api/admin/membership'
import type { MemberPerk, PerkStatus } from '../../../api/membership'
import { PERK_ICONS } from '../../member/membership/PerkList'
import { PERK_STATUS_LABELS, moveItem, rowsToSettings, settingsToRows, type SettingRow } from './membershipAdmin'

const STATUS_STYLES: Record<PerkStatus, string> = {
  on: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  coming_soon: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  hidden: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

function PerkCard({
  perk,
  index,
  count,
  onMove,
  onSaved,
}: {
  perk: MemberPerk
  index: number
  count: number
  onMove: (delta: -1 | 1) => void
  onSaved: (perk: MemberPerk) => void
}) {
  const [form, setForm] = useState({
    title: perk.title,
    description: perk.description,
    status: perk.status,
    icon: perk.icon ?? '',
    linkUrl: perk.linkUrl ?? '',
    buttonLabel: perk.buttonLabel ?? '',
  })
  const [rows, setRows] = useState<SettingRow[]>(() => settingsToRows(perk.settings))
  const [advanced, setAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }))

  const save = async () => {
    try {
      setSaving(true)
      setError('')
      const next = await updatePerk(perk.key, {
        title: form.title,
        description: form.description,
        status: form.status,
        icon: form.icon || null,
        linkUrl: form.linkUrl || null,
        buttonLabel: form.buttonLabel || null,
        settings: rowsToSettings(rows),
      })
      onSaved(next)
      setRows(settingsToRows(next.settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[perk.status]}`}>{PERK_STATUS_LABELS[perk.status]}</span>
        <code className="text-xs text-gray-500 dark:text-gray-400">{perk.key}</code>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up" className="p-2 min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30">
            <ArrowUp size={16} />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down" className="p-2 min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-30">
            <ArrowDown size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <label className="block md:col-span-2">
          <span className="block mb-1">Shown to members as</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Status">
            {(Object.keys(PERK_STATUS_LABELS) as PerkStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={form.status === s}
                onClick={() => set({ status: s })}
                className={`px-4 min-h-[44px] rounded-lg border text-sm font-semibold ${
                  form.status === s
                    ? 'bg-primary dark:bg-primary-dark text-white dark:text-black border-transparent'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                {PERK_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </label>
        <label className="block">
          <span className="block mb-1">Title</span>
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={160} className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Icon</span>
          <select value={form.icon} onChange={(e) => set({ icon: e.target.value })} className={adminSelectClass}>
            <option value="">Default</option>
            {Object.keys(PERK_ICONS).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="block mb-1">Description</span>
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={2} maxLength={1000} className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Link (optional)</span>
          <input value={form.linkUrl} onChange={(e) => set({ linkUrl: e.target.value })} placeholder="https://… or /dashboard/…" className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Button label</span>
          <input value={form.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} maxLength={60} placeholder="Open" className={adminSelectClass} />
        </label>
      </div>

      <button type="button" onClick={() => setAdvanced((v) => !v)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300 min-h-[44px]">
        <ChevronDown size={16} className={advanced ? 'rotate-180' : ''} /> Advanced settings
      </button>
      {advanced && (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400 m-0">Names and values used by this perk, such as a Zoom link or a percentage. Leave a value empty to clear it.</p>
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input aria-label="Setting name" value={row.key} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className={`${adminSelectClass} flex-1`} placeholder="name" />
              <input aria-label="Setting value" value={row.value} onChange={(e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={`${adminSelectClass} flex-[2]`} placeholder="value" />
              <button type="button" aria-label="Remove setting" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} className="p-2 min-h-[44px] min-w-[44px] text-red-600 dark:text-red-400">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setRows((r) => [...r, { key: '', value: '' }])} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 dark:text-gray-300 min-h-[44px]">
            <Plus size={16} /> Add a setting
          </button>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 mt-3">
        {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-lg bg-primary dark:bg-primary-dark text-white dark:text-black font-semibold disabled:opacity-50">
          {saved ? <><Check size={16} /> Saved</> : saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  )
}

export default function PerksTab() {
  const [perks, setPerks] = useState<MemberPerk[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getAdminPerks().then(setPerks).catch(() => setError('Failed to load perks'))
  }, [])

  const move = async (index: number, delta: -1 | 1) => {
    if (!perks) return
    const next = moveItem(perks, index, delta)
    if (next === perks) return
    setPerks(next)
    try {
      setPerks(await reorderPerks(next.map((p) => p.key)))
    } catch {
      setError('Could not save the new order')
      setPerks(perks)
    }
  }

  if (!perks) {
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 m-0">
        On shows the perk to members. Coming soon shows it with a tag. Hidden keeps it off every page.
      </p>
      {error && <p className="text-sm text-red-600 dark:text-red-400 m-0">{error}</p>}
      {perks.map((perk, i) => (
        <PerkCard
          key={perk.key}
          perk={perk}
          index={i}
          count={perks.length}
          onMove={(delta) => void move(i, delta)}
          onSaved={(updated) => setPerks((list) => list?.map((p) => (p.key === updated.key ? updated : p)) ?? list)}
        />
      ))}
    </div>
  )
}

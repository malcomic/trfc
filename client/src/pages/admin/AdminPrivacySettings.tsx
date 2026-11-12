import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import { getPrivacySettings, updatePrivacySettings, type PrivacySettings } from '../../api/admin/policies'

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
const labelClass = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1'
const hintClass = 'text-xs text-gray-500 dark:text-gray-400 mt-1'

type NumberKey =
  | 'purchase_retention_months'
  | 'coach_app_retention_months'
  | 'coach_file_retention_months_after'
  | 'account_delete_grace_days'
type TextKey =
  | 'contact_email'
  | 'contact_phone'
  | 'ticket_photo_notice'
  | 'application_cookie_notice'
  | 'cross_border_notice'
  | 'box1_text'
  | 'box2_text'
  | 'age_box_text'
  | 'applicant_box_text'
type BoolKey = 'show_ticket_photo_notice' | 'show_application_cookie_notice'

const NUMBER_FIELDS: { key: NumberKey; label: string; hint: string }[] = [
  { key: 'purchase_retention_months', label: 'Payment records (months)', hint: 'Names and contacts are removed from payment records older than this.' },
  { key: 'coach_app_retention_months', label: 'Unhired coach applications (months)', hint: 'Applications not hired are deleted after this.' },
  { key: 'coach_file_retention_months_after', label: 'Hired coach files after coaching ends (months)', hint: 'Kept while they coach, then for this long.' },
  { key: 'account_delete_grace_days', label: 'Account deletion (days)', hint: 'Personal details are removed within this many days of a delete request.' },
]

const BOX_FIELDS: { key: TextKey; label: string; hint: string }[] = [
  { key: 'box1_text', label: 'Box 1: terms and privacy (required)', hint: 'The words "Terms" and "Privacy and Confidentiality Terms" become links.' },
  { key: 'age_box_text', label: 'Age box (required)', hint: 'Shown with Box 1 at sign-up.' },
  { key: 'box2_text', label: 'Box 2: promotion emails (optional, never ticked)', hint: '' },
  { key: 'applicant_box_text', label: 'Coach application box (required)', hint: 'The words "Privacy and Confidentiality Terms" link to the applicant page.' },
]

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
      {children}
    </section>
  )
}

export default function AdminPrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getPrivacySettings()
      .then(setSettings)
      .catch((err) => setError(err?.response?.data?.error || 'Failed to load privacy settings'))
  }, [])

  const set = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) =>
    setSettings((s) => (s ? { ...s, [key]: value } : s))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!settings) return
    try {
      setSaving(true)
      setError('')
      setMessage('')
      setSettings(await updatePrivacySettings(settings))
      setMessage('Saved. New wording shows on the next page load.')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save privacy settings')
    } finally {
      setSaving(false)
    }
  }

  const text = (key: TextKey, label: string, hint = '', rows = 2) => (
    <div key={key}>
      <label className={labelClass} htmlFor={key}>{label}</label>
      <textarea id={key} rows={rows} className={inputClass} value={settings?.[key] ?? ''} onChange={(e) => set(key, e.target.value)} />
      {hint && <p className={hintClass}>{hint}</p>}
    </div>
  )

  const toggle = (key: BoolKey, label: string) => (
    <label className="flex items-center gap-3 text-gray-900 dark:text-gray-100 cursor-pointer">
      <input type="checkbox" className="w-4 h-4" checked={settings?.[key] === true} onChange={(e) => set(key, e.target.checked)} />
      {label}
    </label>
  )

  return (
    <div>
      <AdminPageHeader
        title="Privacy settings"
        subtitle="Wording, notices and how long we keep information. Changes apply without new code."
        actions={
          <Link
            to="/admin/policies"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Privacy & Terms pages
          </Link>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg mb-6" role="status">
          {message}
        </div>
      )}

      {!settings ? (
        !error && <div className="text-lg text-gray-600 dark:text-gray-400">Loading…</div>
      ) : (
        <form onSubmit={save} className="space-y-6">
          <Card title="Checkbox wording">{BOX_FIELDS.map((f) => text(f.key, f.label, f.hint, 3))}</Card>

          <Card title="How long we keep information">
            <div className="grid gap-4 md:grid-cols-2">
              {NUMBER_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className={labelClass} htmlFor={f.key}>{f.label}</label>
                  <input
                    id={f.key}
                    type="number"
                    min={1}
                    max={120}
                    className={inputClass}
                    value={settings[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                  <p className={hintClass}>{f.hint}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Notices">
            {toggle('show_ticket_photo_notice', 'Show the ticket photo notice')}
            {text('ticket_photo_notice', 'Ticket photo notice', 'Shown on the privacy page when turned on.')}
            {toggle('show_application_cookie_notice', 'Show the cookie notice on the coach application form')}
            {text('application_cookie_notice', 'Cookie notice')}
            {text('cross_border_notice', 'Information leaving Kenya', 'Shown on the privacy page when filled in. Leave blank to hide.', 3)}
          </Card>

          <Card title="Privacy contact">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="contact_email">Email</label>
                <input id="contact_email" type="email" className={inputClass} value={settings.contact_email} onChange={(e) => set('contact_email', e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="contact_phone">Phone</label>
                <input id="contact_phone" className={inputClass} value={settings.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} />
              </div>
            </div>
          </Card>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50 min-h-[44px]"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      )}
    </div>
  )
}

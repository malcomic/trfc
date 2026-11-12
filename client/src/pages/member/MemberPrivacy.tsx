import { FormEvent, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Download, History, Loader, Mail, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import { useAuth } from '../../context/AuthContext'
import { Button, FormInput, PasswordToggle } from '../../components/ui'
import { cardSurface } from '../../utils/themeClasses'
import {
  deleteMyAccount,
  describeConsent,
  downloadMyData,
  formatConsentTime,
  getMyPrivacy,
  setMyMarketing,
  setMyWhatsappShare,
  type MyPrivacy,
} from '../../api/privacy'

function Card({ icon: Icon, title, subtitle, children }: { icon: typeof Mail; title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <section className={`${cardSurface} p-6 space-y-4`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className="text-accent light:text-accent-light mt-1 flex-none" />
        <div>
          <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter">{title}</h2>
          <div className="text-sm text-fog light:text-fog-light">{subtitle}</div>
        </div>
      </div>
      {children}
    </section>
  )
}

function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${
        checked ? 'bg-accent light:bg-accent-light' : 'bg-mist light:bg-mist-light'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function MemberPrivacy() {
  const { notify } = useMemberDashboard()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<MyPrivacy | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSecret, setDeleteSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = () =>
    getMyPrivacy()
      .then((result) => {
        setData(result)
        setLoadError('')
      })
      .catch((err) => setLoadError(err?.response?.data?.error || 'Could not load your privacy settings'))

  useEffect(() => {
    load()
  }, [])

  const toggleMarketing = async (on: boolean) => {
    setBusy('marketing')
    try {
      await setMyMarketing(on)
      notify('success', on ? 'Promotion emails on' : 'Promotion emails off')
      await load()
    } catch (err: any) {
      notify('error', 'Could not save', err?.response?.data?.error)
    } finally {
      setBusy(null)
    }
  }

  const toggleWhatsapp = async (captainId: string, name: string, on: boolean) => {
    setBusy(captainId)
    try {
      await setMyWhatsappShare(captainId, on)
      notify('success', on ? `${name} can see your WhatsApp` : `${name} can no longer see your WhatsApp`)
      await load()
    } catch (err: any) {
      notify('error', 'Could not save', err?.response?.data?.error)
    } finally {
      setBusy(null)
    }
  }

  const download = async () => {
    setDownloading(true)
    try {
      await downloadMyData()
    } catch (err: any) {
      notify('error', 'Could not prepare your file', err?.response?.status === 429 ? 'Please wait a little and try again.' : undefined)
    } finally {
      setDownloading(false)
    }
  }

  const confirmDelete = async (e: FormEvent) => {
    e.preventDefault()
    if (!data) return
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteMyAccount(data.has_password ? { password: deleteSecret } : { confirm: deleteSecret.trim() })
      await logout()
      navigate('/', { replace: true, state: { accountDeleted: true } })
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || 'Could not delete your account')
    } finally {
      setDeleting(false)
    }
  }

  if (!data) {
    return (
      <>
        <MemberPageHeader title="MY" highlight="PRIVACY" />
        {loadError ? (
          <p className="text-sm text-red-500 flex items-center gap-2" role="alert">
            <AlertCircle size={15} /> {loadError}
          </p>
        ) : (
          <div className="flex justify-center py-10">
            <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
          </div>
        )}
      </>
    )
  }

  const canDelete = user?.role === 'member'

  return (
    <>
      <MemberPageHeader
        title="MY"
        highlight="PRIVACY"
        subtitle={
          <>
            Control who can reach you and what we keep. Read the{' '}
            <Link to="/privacy" className="text-accent light:text-accent-light no-underline hover:underline">
              Privacy and Confidentiality Terms
            </Link>
            .
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Card icon={Mail} title="Promotion emails" subtitle="News, events, offers and the 2027 membership. Receipts and account emails still reach you.">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">{data.marketing_opt_in ? 'On' : 'Off'}</span>
            <Switch
              checked={data.marketing_opt_in === true}
              disabled={busy === 'marketing'}
              onChange={toggleMarketing}
              label="Promotion emails"
            />
          </div>
        </Card>

        <Card
          icon={MessageCircle}
          title="Captain WhatsApp"
          subtitle="Off until you turn it on. A captain only sees your WhatsApp number while it is on, and it is never used for promotions."
        >
          {data.captains.length === 0 ? (
            <p className="text-sm text-fog light:text-fog-light">There are no captains in your zone yet.</p>
          ) : (
            <ul className="space-y-3">
              {data.captains.map((captain) => (
                <li key={captain.id} className="flex items-center gap-3">
                  {captain.photo_url ? (
                    <img src={captain.photo_url} alt="" className="w-9 h-9 rounded-full object-cover flex-none" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-mist light:bg-mist-light flex-none" aria-hidden="true" />
                  )}
                  <span className="flex-1 min-w-0 text-sm">
                    <strong>{captain.name}</strong>
                    <span className="block text-fog light:text-fog-light">
                      {captain.zone}
                      {captain.is_my_captain ? ' · Your captain' : ''}
                    </span>
                  </span>
                  <Switch
                    checked={captain.whatsapp_shared}
                    disabled={busy === captain.id}
                    onChange={(on) => toggleWhatsapp(captain.id, captain.name, on)}
                    label={`Share my WhatsApp with ${captain.name}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card icon={Download} title="Download my information" subtitle="A file with your account details, tickets, payments, programs and consent history.">
          <Button variant="secondary" onClick={download} isLoading={downloading}>
            <Download size={16} /> Download
          </Button>
        </Card>

        <Card
          icon={ShieldCheck}
          title="What you agreed to"
          subtitle={
            data.privacy_accepted_at
              ? `Version ${data.privacy_version_accepted ?? '–'}, agreed on ${formatConsentTime(data.privacy_accepted_at)}.`
              : 'You have not agreed to the current terms yet.'
          }
        >
          {data.history.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer flex items-center gap-2 text-accent light:text-accent-light">
                <History size={14} /> Consent history
              </summary>
              <ul className="mt-3 space-y-1.5 text-fog light:text-fog-light">
                {data.history.map((entry, i) => (
                  <li key={i}>
                    <span className="text-chalk light:text-chalk-light">{formatConsentTime(entry.created_at)}</span> · {describeConsent(entry)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </Card>

        <Card
          icon={Trash2}
          title="Delete my account"
          subtitle={
            canDelete
              ? `You are signed out at once. Your personal details are removed within ${data.delete_grace_days} days. Payment records are kept for the period the law needs, without your name.`
              : 'Captain and staff accounts are closed by the TRFC team. Please contact us.'
          }
        >
          {canDelete &&
            (deleteOpen ? (
              <form onSubmit={confirmDelete} className="space-y-3">
                <FormInput
                  label={data.has_password ? 'Enter your password to confirm' : 'Type DELETE to confirm'}
                  type={data.has_password && !showSecret ? 'password' : 'text'}
                  value={deleteSecret}
                  onChange={(e) => setDeleteSecret(e.target.value)}
                  autoComplete={data.has_password ? 'current-password' : 'off'}
                  endAdornment={data.has_password ? <PasswordToggle visible={showSecret} onToggle={() => setShowSecret((v) => !v)} /> : undefined}
                />
                {deleteError && (
                  <p className="text-sm text-red-500 flex items-center gap-2" role="alert">
                    <AlertCircle size={15} /> {deleteError}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" isLoading={deleting} disabled={!deleteSecret.trim()} className="!bg-red-600 !text-white !shadow-none">
                    Delete my account
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDeleteOpen(false)
                      setDeleteSecret('')
                      setDeleteError('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={16} /> Delete my account
              </Button>
            ))}
        </Card>
      </div>
    </>
  )
}

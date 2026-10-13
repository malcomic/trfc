import { Fragment, useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, Link2, Plus } from 'lucide-react'
import {
  createFlashShareLink,
  getFlashShareLinks,
  revokeFlashShareLink,
  type CreatedFlashShareLink,
} from '../../api/admin/flashSales'
import { getRegions, type Region } from '../../api/admin/regions'
import type { FlashShareLink } from '../../types'
import { formatTimeLeft } from '../../utils/flashAccess'
import AdminConfirmDialog from '../AdminConfirmDialog'
import AdminMobileCard, { AdminMobileCardRow } from './AdminMobileCard'
import AdminResponsiveData from './AdminResponsiveData'

const DEFAULT_USES = 3
const MAX_USES = 100

type LinkStatus = 'Active' | 'Used up' | 'Expired' | 'Revoked'

const STATUS_STYLES: Record<LinkStatus, string> = {
  Active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  'Used up': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  Expired: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  Revoked: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'

function linkStatus(link: FlashShareLink, now = Date.now()): LinkStatus {
  if (link.revoked_at) return 'Revoked'
  if (new Date(link.expires_at).getTime() <= now) return 'Expired'
  if (link.use_count >= link.max_uses) return 'Used up'
  return 'Active'
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link', text)
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-2"
      aria-label="Copy link"
    >
      {copied ? <Check size={18} /> : <Copy size={18} />}
      <span className="text-sm">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

function Redemptions({ link }: { link: FlashShareLink }) {
  if (link.redemptions.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Nobody has used this link yet.</p>
  }
  return (
    <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
      {link.redemptions.map((r) => (
        <li key={r.id}>
          {r.phone} · {r.email} · {formatDateTime(r.created_at)}
          {r.has_paid_order && (
            <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-400">Paid order</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function FlashShareLinksPanel() {
  const [links, setLinks] = useState<FlashShareLink[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [zoneId, setZoneId] = useState('')
  const [email, setEmail] = useState('')
  const [maxUses, setMaxUses] = useState(String(DEFAULT_USES))
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<CreatedFlashShareLink | null>(null)
  const [createError, setCreateError] = useState('')
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLinks = async () => {
    try {
      setLoading(true)
      const data = await getFlashShareLinks()
      setLinks(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to fetch share links')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLinks()
    getRegions()
      .then((data) => setRegions(Array.isArray(data) ? data.filter((r) => r.is_active) : []))
      .catch((err) => console.error(err))
  }, [])

  const openModal = () => {
    setZoneId('')
    setEmail('')
    setMaxUses(String(DEFAULT_USES))
    setCreated(null)
    setCreateError('')
    setShowModal(true)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const uses = Number(maxUses)
    if (!Number.isInteger(uses) || uses < 1 || uses > MAX_USES) {
      setCreateError(`Number of people must be a whole number from 1 to ${MAX_USES}`)
      return
    }
    try {
      setCreating(true)
      setCreateError('')
      const result = await createFlashShareLink({
        zone_id: zoneId || null,
        max_uses: uses,
        ...(email.trim() ? { email: email.trim() } : {}),
      })
      setCreated(result)
      fetchLinks()
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Failed to create share link')
    } finally {
      setCreating(false)
    }
  }

  const confirmRevoke = async () => {
    if (!revokeId) return
    try {
      setError('')
      await revokeFlashShareLink(revokeId)
      fetchLinks()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke share link')
    } finally {
      setRevokeId(null)
    }
  }

  const statusBadge = (link: FlashShareLink, small?: boolean) => {
    const status = linkStatus(link)
    return (
      <span className={`${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-semibold ${STATUS_STYLES[status]}`}>
        {status}
      </span>
    )
  }

  const timeLeft = (link: FlashShareLink) =>
    linkStatus(link) === 'Active' ? formatTimeLeft(link.expires_at) : '—'

  const revokeButton = (link: FlashShareLink) =>
    !link.revoked_at && new Date(link.expires_at).getTime() > Date.now() ? (
      <button
        type="button"
        onClick={() => setRevokeId(link.id)}
        className="text-red-600 dark:text-red-400 min-h-[44px] px-2 text-sm"
      >
        Revoke
      </button>
    ) : null

  return (
    <section className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 size={20} /> Share links
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Give flash deal access to people without a ticket. Each link works for 24 hours and can be used by the number
            of people you choose. Each person can place one flash order paid from the phone number they entered.
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto shrink-0"
        >
          <Plus size={20} />
          Share access link
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600 dark:text-gray-400">Loading share links...</div>
      ) : (
        <AdminResponsiveData
          isEmpty={links.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
              No share links yet
            </div>
          }
          desktop={
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Sent to</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Zone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Uses</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Time left</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <Fragment key={link.id}>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                      <td className="px-6 py-4 text-sm">
                        {formatDateTime(link.created_at)}
                        {link.created_by_name && (
                          <span className="block text-xs text-gray-500 dark:text-gray-400">by {link.created_by_name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{link.sent_to || '—'}</td>
                      <td className="px-6 py-4 text-sm">{link.zone_name || 'Everyone'}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => setExpandedId(expandedId === link.id ? null : link.id)}
                          className="flex items-center gap-1 text-sm"
                          aria-label="Show who used this link"
                        >
                          {link.use_count} / {link.max_uses}
                          {expandedId === link.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm">{timeLeft(link)}</td>
                      <td className="px-6 py-4">{statusBadge(link)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <CopyButton text={link.url} />
                          {revokeButton(link)}
                        </div>
                      </td>
                    </tr>
                    {expandedId === link.id && (
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-900/40">
                          <Redemptions link={link} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          }
          mobile={links.map((link) => (
            <AdminMobileCard
              key={link.id}
              footer={
                <>
                  <CopyButton text={link.url} />
                  {revokeButton(link)}
                </>
              }
            >
              <p className="font-semibold text-gray-900 dark:text-white">{link.sent_to || 'Shared link'}</p>
              <AdminMobileCardRow label="Created" value={formatDateTime(link.created_at)} />
              <AdminMobileCardRow label="Zone" value={link.zone_name || 'Everyone'} />
              <AdminMobileCardRow label="Uses" value={`${link.use_count} / ${link.max_uses}`} />
              <AdminMobileCardRow label="Time left" value={timeLeft(link)} />
              <AdminMobileCardRow label="Status" value={statusBadge(link, true)} />
              <div className="pt-2">
                <Redemptions link={link} />
              </div>
            </AdminMobileCard>
          ))}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Share access link</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Valid for 24 hours.</p>
            </div>

            {created ? (
              <div className="p-6 space-y-4">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Link</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={created.url} className={inputClass} onFocus={(e) => e.target.select()} />
                  <CopyButton text={created.url} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Up to {created.maxUses} {created.maxUses === 1 ? 'person' : 'people'}. Expires{' '}
                  {formatDateTime(created.expiresAt)}.
                </p>
                {created.emailSent && (
                  <p className="text-sm text-green-700 dark:text-green-400">Emailed to {email.trim()}.</p>
                )}
                {created.emailError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    The email could not be sent ({created.emailError}). Copy the link and send it manually.
                  </p>
                )}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Zone</label>
                  <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={inputClass}>
                    <option value="">Everyone (deals with no zone)</option>
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    A zone also unlocks that zone's deals, as it would for a ticket holder from there.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">
                    Number of people *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_USES}
                    step={1}
                    required
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How many different people can unlock deals with this link (1 to {MAX_USES}). Each person gets one
                    flash order.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Email (optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Send the link to this address"
                    className={inputClass}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave blank to just copy the link and share it on WhatsApp or SMS.
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={revokeId !== null}
        title="Revoke share link"
        message="Anyone using this link loses access to flash deals straight away, including at checkout."
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeId(null)}
      />
    </section>
  )
}

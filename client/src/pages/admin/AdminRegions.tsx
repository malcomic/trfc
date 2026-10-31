import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Edit2, Plus, Power, Wallet } from 'lucide-react'
import { createRegion, deactivateRegion, getRegions, updateRegion, type Region } from '../../api/admin/regions'
import { getAdminCaptains, type AdminCaptain } from '../../api/admin/captains'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import CaptainsSectionTabs from '../../components/admin/CaptainsSectionTabs'
import { formatKes, formatRate } from '../../utils/captainDisplay'

interface RegionFormValues {
  name: string
  code: string
  referral_code: string
  rate_percent: string
  lead_captain_id: string
  is_active: boolean
}

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'

function StatusBadge({ active, small }: { active: boolean; small?: boolean }) {
  return (
    <span
      className={`${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-semibold ${
        active
          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

/** `standalone` renders the page at /admin/zones without the Captains tabs. */
export default function AdminRegions({ standalone = false }: { standalone?: boolean }) {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [zoneCaptains, setZoneCaptains] = useState<AdminCaptain[]>([])
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegionFormValues>()

  const fetchRegions = async () => {
    try {
      setLoading(true)
      setRegions(await getRegions())
    } catch (err) {
      setError('Failed to fetch zones')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRegions()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setZoneCaptains([])
    reset({ name: '', code: '', referral_code: '', rate_percent: '10', lead_captain_id: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = async (region: Region) => {
    let captains: AdminCaptain[] = []
    try {
      captains = await getAdminCaptains({ regionId: region.id, status: 'active' })
    } catch {
      setError('Failed to load this zone’s captains')
      return
    }
    setZoneCaptains(captains)
    setEditingId(region.id)
    reset({
      name: region.name,
      code: region.code,
      referral_code: region.referral_code,
      rate_percent: String(Math.round(region.commission_rate * 1000) / 10),
      lead_captain_id: region.lead_captain_id ?? '',
      is_active: region.is_active,
    })
    setShowModal(true)
  }

  const onSubmit = async (data: RegionFormValues) => {
    const rate = Number(data.rate_percent)
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      setError('Commission rate must be between 0 and 100%')
      return
    }
    try {
      setSaving(true)
      setError('')
      const payload = {
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        is_active: Boolean(data.is_active),
        referral_code: data.referral_code.trim().toUpperCase() || undefined,
        commission_rate: rate / 100,
      }
      if (editingId) {
        await updateRegion(editingId, { ...payload, lead_captain_id: data.lead_captain_id || null })
      } else {
        await createRegion(payload)
      }
      setShowModal(false)
      fetchRegions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save zone')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateId) return
    try {
      await deactivateRegion(deactivateId)
      fetchRegions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate zone')
    } finally {
      setDeactivateId(null)
    }
  }

  const leadLabel = (region: Region) => region.lead_captain_name ?? <span className="text-amber-600 dark:text-amber-400">Not set</span>

  const payLink = (region: Region, mobile = false) =>
    region.approved_amount > 0 && (
      <Link
        to={`/admin/captains?view=payouts&region=${region.id}`}
        className={`flex items-center gap-1 text-green-700 dark:text-green-400 min-h-[44px] ${mobile ? 'px-3' : ''}`}
        aria-label={`Pay ${region.name}`}
      >
        <Wallet size={18} /> {mobile ? 'Pay zone' : ''}
      </Link>
    )

  return (
    <div>
      <AdminPageHeader
        title={standalone ? 'Zones & Regions' : 'Captains'}
        subtitle="Each zone has one referral link and commission rate. Everything its link earns goes to the zone and is paid to its lead captain. Ticket buyers also pick their zone, and products can be limited to zones."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            New Zone
          </button>
        }
      />

      {!standalone && <CaptainsSectionTabs />}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading zones...</div>
      ) : (
        <AdminResponsiveData
          isEmpty={regions.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
              No zones yet.
            </div>
          }
          desktop={
            <table className="w-full min-w-[1000px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Zone', 'Code', 'Referral code', 'Rate', 'Lead captain', 'Captains', 'Referred', 'Sales', 'Owed', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr
                    key={region.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <td className="px-4 py-3 font-medium">{region.name}</td>
                    <td className="px-4 py-3 font-mono">{region.code}</td>
                    <td className="px-4 py-3 font-mono">{region.referral_code}</td>
                    <td className="px-4 py-3">{formatRate(region.commission_rate)}</td>
                    <td className="px-4 py-3">{leadLabel(region)}</td>
                    <td className="px-4 py-3">{region.captain_count}</td>
                    <td className="px-4 py-3">{region.referred_customers}</td>
                    <td className="px-4 py-3">{formatKes(region.referred_sales)}</td>
                    <td className="px-4 py-3">{formatKes(region.pending_amount + region.approved_amount)}</td>
                    <td className="px-4 py-3"><StatusBadge active={region.is_active} small /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 items-center">
                        <button onClick={() => openEdit(region)} className="text-blue-600 dark:text-blue-400 min-h-[44px]" aria-label={`Edit ${region.name}`}>
                          <Edit2 size={18} />
                        </button>
                        {payLink(region)}
                        {region.is_active && (
                          <button onClick={() => setDeactivateId(region.id)} className="text-red-600 dark:text-red-400 min-h-[44px]" aria-label={`Deactivate ${region.name}`}>
                            <Power size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={regions.map((region) => (
            <AdminMobileCard
              key={region.id}
              footer={
                <>
                  <button onClick={() => openEdit(region)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3">
                    <Edit2 size={18} /> Edit
                  </button>
                  {payLink(region, true)}
                  {region.is_active && (
                    <button onClick={() => setDeactivateId(region.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                      <Power size={18} /> Deactivate
                    </button>
                  )}
                </>
              }
            >
              <div className="font-semibold text-gray-900 dark:text-white">{region.name}</div>
              <AdminMobileCardRow label="Referral code" value={region.referral_code} />
              <AdminMobileCardRow label="Rate" value={formatRate(region.commission_rate)} />
              <AdminMobileCardRow label="Lead captain" value={leadLabel(region)} />
              <AdminMobileCardRow label="Captains" value={region.captain_count} />
              <AdminMobileCardRow label="Sales / Owed" value={`${formatKes(region.referred_sales)} / ${formatKes(region.pending_amount + region.approved_amount)}`} />
              <AdminMobileCardRow label="Status" value={<StatusBadge active={region.is_active} small />} />
            </AdminMobileCard>
          ))}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Zone' : 'New Zone'}</h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Name *</label>
                <input
                  type="text"
                  maxLength={100}
                  {...register('name', { required: 'Name is required' })}
                  placeholder="e.g. Nairobi"
                  className={inputClass}
                />
                {errors.name && <span className="text-red-600 dark:text-red-400 text-sm">{errors.name.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Code *</label>
                <input
                  type="text"
                  maxLength={5}
                  {...register('code', {
                    required: 'Code is required',
                    pattern: { value: /^[A-Za-z]{2,5}$/, message: '2-5 letters, e.g. NRB' },
                  })}
                  placeholder="e.g. NRB"
                  className={`${inputClass} font-mono uppercase`}
                />
                {errors.code && <span className="text-red-600 dark:text-red-400 text-sm">{errors.code.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Referral code</label>
                <input
                  type="text"
                  maxLength={20}
                  {...register('referral_code', {
                    pattern: { value: /^[A-Za-z0-9-]{3,20}$/, message: '3-20 letters, numbers or dashes' },
                  })}
                  placeholder={editingId ? '' : 'Leave blank to use the zone code'}
                  className={`${inputClass} font-mono uppercase`}
                />
                {errors.referral_code && <span className="text-red-600 dark:text-red-400 text-sm">{errors.referral_code.message}</span>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Shared by every captain in the zone. Changing it breaks zone links already shared; captains' old personal links keep working.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Commission rate (%)</label>
                <input type="number" step="0.1" min="0" max="100" {...register('rate_percent')} className={inputClass} />
                {editingId && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A new rate only applies to future commissions.</p>}
              </div>
              {editingId && (
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Lead captain</label>
                  <select {...register('lead_captain_id')} className={inputClass}>
                    <option value="">No lead captain</option>
                    {zoneCaptains.map((c) => (
                      <option key={c.user_id} value={c.user_id}>
                        {c.name} · {c.payout_phone || c.phone}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Receives the zone's payouts by M-Pesa. Only active captains in this zone can lead it.
                  </p>
                </div>
              )}
              <label className="flex items-center gap-2">
                <input type="checkbox" {...register('is_active')} className="w-4 h-4" />
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</span>
              </label>
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
                  disabled={saving}
                  className="px-4 py-2 bg-primary dark:bg-primary-dark text-white dark:text-black rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deactivateId !== null}
        title="Deactivate zone"
        message="Existing captains, tickets and products keep this zone, but it can no longer be picked for new captains, ticket purchases or products, and its referral link stops earning."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  )
}

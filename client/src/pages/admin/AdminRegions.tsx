import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Edit2, Plus, Power } from 'lucide-react'
import { createRegion, deactivateRegion, getRegions, updateRegion, type Region } from '../../api/admin/regions'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import CaptainsSectionTabs from '../../components/admin/CaptainsSectionTabs'

interface RegionFormValues {
  name: string
  code: string
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
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegionFormValues>()

  const fetchRegions = async () => {
    try {
      setLoading(true)
      setRegions(await getRegions())
    } catch (err) {
      setError('Failed to fetch regions')
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
    reset({ name: '', code: '', is_active: true })
    setShowModal(true)
  }

  const openEdit = (region: Region) => {
    setEditingId(region.id)
    reset({ name: region.name, code: region.code, is_active: region.is_active })
    setShowModal(true)
  }

  const onSubmit = async (data: RegionFormValues) => {
    try {
      setSaving(true)
      setError('')
      const payload = { name: data.name.trim(), code: data.code.trim().toUpperCase(), is_active: Boolean(data.is_active) }
      if (editingId) {
        await updateRegion(editingId, payload)
      } else {
        await createRegion(payload)
      }
      setShowModal(false)
      fetchRegions()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save region')
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
      setError(err.response?.data?.error || 'Failed to deactivate region')
    } finally {
      setDeactivateId(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title={standalone ? 'Zones & Regions' : 'Captains'}
        subtitle="One shared list: captains are assigned a region (its code prefixes referral codes), ticket buyers pick their zone, and products can be limited to zones for flash deals."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            New Region
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
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading regions...</div>
      ) : (
        <AdminResponsiveData
          isEmpty={regions.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
              No regions yet.
            </div>
          }
          desktop={
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  {['Region', 'Code', 'Active captains', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => (
                  <tr
                    key={region.id}
                    className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100"
                  >
                    <td className="px-6 py-4 font-medium">{region.name}</td>
                    <td className="px-6 py-4 font-mono text-sm">{region.code}</td>
                    <td className="px-6 py-4">{region.captain_count}</td>
                    <td className="px-6 py-4"><StatusBadge active={region.is_active} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(region)} className="text-blue-600 dark:text-blue-400 min-h-[44px]" aria-label={`Edit ${region.name}`}>
                          <Edit2 size={18} />
                        </button>
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
                  {region.is_active && (
                    <button onClick={() => setDeactivateId(region.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                      <Power size={18} /> Deactivate
                    </button>
                  )}
                </>
              }
            >
              <div className="font-semibold text-gray-900 dark:text-white">{region.name}</div>
              <AdminMobileCardRow label="Code" value={region.code} />
              <AdminMobileCardRow label="Active captains" value={region.captain_count} />
              <AdminMobileCardRow label="Status" value={<StatusBadge active={region.is_active} small />} />
            </AdminMobileCard>
          ))}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Region' : 'New Region'}</h2>
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
        title="Deactivate region"
        message="Existing captains, tickets and products keep this region, but it can no longer be picked for new captains, ticket purchases or products."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateId(null)}
      />
    </div>
  )
}

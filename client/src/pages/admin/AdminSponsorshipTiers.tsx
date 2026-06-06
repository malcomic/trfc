import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus, X } from 'lucide-react'
import {
  getSponsorshipTiersForAdmin,
  createSponsorshipTier,
  updateSponsorshipTier,
  deleteSponsorshipTier,
} from '../../api/admin/sponsorshipTiers'
import type { SponsorshipTier } from '../../api/sponsorshipTiers'
import { SPONSORSHIP_ICON_OPTIONS, getSponsorshipIcon } from '../../utils/sponsorshipIcons'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'

export default function AdminSponsorshipTiers() {
  const [tiers, setTiers] = useState<SponsorshipTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [benefits, setBenefits] = useState<string[]>([''])
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    fetchTiers()
  }, [])

  const fetchTiers = async () => {
    try {
      setLoading(true)
      const data = await getSponsorshipTiersForAdmin()
      setTiers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Failed to fetch sponsorship tiers')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openCreateModal = () => {
    setEditingId(null)
    setBenefits([''])
    reset({
      slug: '',
      name: '',
      price_display: '',
      icon: 'Handshake',
      sort_order: tiers.length + 1,
      is_active: true,
    })
    setShowModal(true)
  }

  const handleEdit = (tier: SponsorshipTier) => {
    setEditingId(tier.id)
    setBenefits(tier.benefits.length > 0 ? [...tier.benefits] : [''])
    reset({
      slug: tier.slug,
      name: tier.name,
      price_display: tier.price_display,
      icon: tier.icon,
      sort_order: tier.sort_order,
      is_active: tier.is_active,
    })
    setShowModal(true)
  }

  const addBenefit = () => setBenefits((prev) => [...prev, ''])

  const removeBenefit = (index: number) => {
    setBenefits((prev) => (prev.length <= 1 ? [''] : prev.filter((_, i) => i !== index)))
  }

  const updateBenefit = (index: number, value: string) => {
    setBenefits((prev) => prev.map((b, i) => (i === index ? value : b)))
  }

  const onSubmit = async (data: Record<string, unknown>) => {
    const normalizedBenefits = benefits.map((b) => b.trim()).filter(Boolean)
    if (normalizedBenefits.length === 0) {
      setError('At least one benefit is required')
      return
    }

    try {
      setSaving(true)
      setError('')
      const payload = {
        slug: String(data.slug || '').trim(),
        name: String(data.name || '').trim(),
        price_display: String(data.price_display || '').trim(),
        benefits: normalizedBenefits,
        icon: String(data.icon || 'Handshake'),
        sort_order: parseInt(String(data.sort_order || '0'), 10) || 0,
      }

      if (editingId) {
        await updateSponsorshipTier(editingId, {
          ...payload,
          is_active: data.is_active === 'on' || data.is_active === true,
        })
      } else {
        await createSponsorshipTier(payload)
      }

      setShowModal(false)
      setEditingId(null)
      reset()
      setBenefits([''])
      fetchTiers()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save sponsorship tier')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteSponsorshipTier(deleteId)
      fetchTiers()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete sponsorship tier')
      console.error(err)
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading sponsorship tiers...</div>
  }

  return (
    <div>
      <AdminPageHeader
        title="Sponsorship Tiers"
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            New Tier
          </button>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <AdminResponsiveData
        isEmpty={tiers.length === 0}
        empty={
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
            No sponsorship tiers yet
          </div>
        }
        desktop={
          <table className="w-full min-w-[720px]">
            <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Slug</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Benefits</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Order</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => {
                const Icon = getSponsorshipIcon(tier.icon)
                return (
                  <tr key={tier.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon size={18} className="text-primary dark:text-primary-dark shrink-0" />
                        {tier.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{tier.slug}</td>
                    <td className="px-6 py-4">{tier.price_display}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{tier.benefits.length} listed</td>
                    <td className="px-6 py-4">{tier.sort_order}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        tier.is_active
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {tier.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => handleEdit(tier)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px]">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => setDeleteId(tier.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px]">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        }
        mobile={tiers.map((tier) => {
          const Icon = getSponsorshipIcon(tier.icon)
          return (
            <AdminMobileCard
              key={tier.id}
              footer={
                <>
                  <button onClick={() => handleEdit(tier)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3">
                    <Edit2 size={18} /> Edit
                  </button>
                  <button onClick={() => setDeleteId(tier.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                    <Trash2 size={18} /> Delete
                  </button>
                </>
              }
            >
              <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <Icon size={18} className="text-primary dark:text-primary-dark" />
                {tier.name}
              </div>
              <AdminMobileCardRow label="Slug" value={tier.slug} />
              <AdminMobileCardRow label="Price" value={tier.price_display} />
              <AdminMobileCardRow label="Benefits" value={`${tier.benefits.length} listed`} />
              <AdminMobileCardRow label="Order" value={tier.sort_order} />
              <AdminMobileCardRow
                label="Status"
                value={
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    tier.is_active
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                  }`}>
                    {tier.is_active ? 'Active' : 'Inactive'}
                  </span>
                }
              />
            </AdminMobileCard>
          )
        })}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Sponsorship Tier' : 'New Sponsorship Tier'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Name *</label>
                <input
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.name && <span className="text-red-600 dark:text-red-400 text-sm">{errors.name.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Slug *</label>
                <input
                  type="text"
                  {...register('slug', { required: 'Slug is required' })}
                  placeholder="e.g. community-partner"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
                {errors.slug && <span className="text-red-600 dark:text-red-400 text-sm">{errors.slug.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Price Display *</label>
                <input
                  type="text"
                  {...register('price_display', { required: 'Price is required' })}
                  placeholder="KES 50,000"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.price_display && <span className="text-red-600 dark:text-red-400 text-sm">{errors.price_display.message as string}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Icon</label>
                <select
                  {...register('icon')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {SPONSORSHIP_ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Sort Order</label>
                <input
                  type="number"
                  {...register('sort_order')}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100">Benefits *</label>
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="text-sm text-primary dark:text-primary-dark font-semibold hover:underline"
                  >
                    + Add benefit
                  </button>
                </div>
                <div className="space-y-2">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => updateBenefit(index, e.target.value)}
                        placeholder="Benefit description"
                        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="p-2 text-gray-500 hover:text-red-500"
                        aria-label="Remove benefit"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      {...register('is_active')}
                      defaultChecked={tiers.find((t) => t.id === editingId)?.is_active}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active (visible on public page)</span>
                  </label>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    reset()
                    setBenefits([''])
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary dark:bg-primary-dark text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={deleteId !== null}
        title="Delete sponsorship tier"
        message="Are you sure you want to delete this tier? Tiers with existing inquiries cannot be deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

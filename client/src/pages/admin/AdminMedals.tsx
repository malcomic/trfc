import { useState, useEffect } from 'react'
import { Edit2, Plus, Trash2, X } from 'lucide-react'
import {
  getAdminMedals,
  updateAdminMedalTier,
  upsertAdminMedalOption,
  deleteAdminMedalOption,
  getAdminMedalPurchases,
  AdminMedalPurchase,
} from '../../api/admin/medals'
import type { MedalTier, MedalOption } from '../../api/medals'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'

export default function AdminMedals() {
  const [tiers, setTiers] = useState<MedalTier[]>([])
  const [purchases, setPurchases] = useState<AdminMedalPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'tiers' | 'purchases'>('tiers')

  const [editingTier, setEditingTier] = useState<MedalTier | null>(null)
  const [tierForm, setTierForm] = useState({
    name: '',
    description: '',
    benefits: [''],
    image_url: '',
    sort_order: 0,
    is_active: true,
  })
  const [saving, setSaving] = useState(false)

  const [optionTierId, setOptionTierId] = useState<string | null>(null)
  const [editingOption, setEditingOption] = useState<MedalOption | null>(null)
  const [optionForm, setOptionForm] = useState({
    distance_km: 10,
    price: 0,
    capacity: '' as string | number,
    is_active: true,
  })
  const [deleteOption, setDeleteOption] = useState<{ tierId: string; optionId: string } | null>(
    null
  )

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      setLoading(true)
      const [tierData, purchaseData] = await Promise.all([
        getAdminMedals(),
        getAdminMedalPurchases(),
      ])
      setTiers(Array.isArray(tierData) ? tierData : [])
      setPurchases(Array.isArray(purchaseData) ? purchaseData : [])
    } catch (err) {
      setError('Failed to load medals')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const openEditTier = (tier: MedalTier) => {
    setEditingTier(tier)
    setTierForm({
      name: tier.name,
      description: tier.description || '',
      benefits: tier.benefits?.length ? [...tier.benefits] : [''],
      image_url: tier.image_url || '',
      sort_order: tier.sort_order,
      is_active: tier.is_active,
    })
  }

  const saveTier = async () => {
    if (!editingTier) return
    const benefits = tierForm.benefits.map((b) => b.trim()).filter(Boolean)
    try {
      setSaving(true)
      setError('')
      await updateAdminMedalTier(editingTier.id, {
        name: tierForm.name.trim(),
        description: tierForm.description.trim() || null,
        benefits,
        image_url: tierForm.image_url.trim() || null,
        sort_order: Number(tierForm.sort_order) || 0,
        is_active: tierForm.is_active,
      })
      setEditingTier(null)
      await fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save tier')
    } finally {
      setSaving(false)
    }
  }

  const openOptionModal = (tierId: string, option?: MedalOption) => {
    setOptionTierId(tierId)
    setEditingOption(option || null)
    setOptionForm({
      distance_km: option?.distance_km ?? 10,
      price: option?.price ?? 0,
      capacity: option?.capacity ?? '',
      is_active: option?.is_active ?? true,
    })
  }

  const saveOption = async () => {
    if (!optionTierId) return
    try {
      setSaving(true)
      setError('')
      await upsertAdminMedalOption(optionTierId, {
        id: editingOption?.id,
        distance_km: Number(optionForm.distance_km),
        price: Number(optionForm.price),
        capacity:
          optionForm.capacity === '' || optionForm.capacity === null
            ? null
            : Number(optionForm.capacity),
        is_active: optionForm.is_active,
      })
      setOptionTierId(null)
      setEditingOption(null)
      await fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save option')
    } finally {
      setSaving(false)
    }
  }

  const confirmDeleteOption = async () => {
    if (!deleteOption) return
    try {
      await deleteAdminMedalOption(deleteOption.tierId, deleteOption.optionId)
      await fetchAll()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete option')
    } finally {
      setDeleteOption(null)
    }
  }

  if (loading) {
    return <div className="text-lg text-gray-600 dark:text-gray-400">Loading medals...</div>
  }

  return (
    <div>
      <AdminPageHeader title="Medals" />

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('tiers')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'tiers'
              ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          Tiers & Options
        </button>
        <button
          type="button"
          onClick={() => setTab('purchases')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${
            tab === 'purchases'
              ? 'bg-primary dark:bg-primary-dark text-white dark:text-black'
              : 'bg-gray-100 dark:bg-gray-800'
          }`}
        >
          Purchases ({purchases.length})
        </button>
      </div>

      {tab === 'tiers' && (
        <div className="space-y-6">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    {tier.name}
                    <span className="text-xs font-normal text-gray-500">/{tier.slug}</span>
                    {!tier.is_active && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {tier.description || 'No description'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditTier(tier)}
                  className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 hover:opacity-90"
                >
                  <Edit2 size={16} /> Edit tier
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2 pr-4">Distance</th>
                      <th className="py-2 pr-4">Price (KES)</th>
                      <th className="py-2 pr-4">Capacity</th>
                      <th className="py-2 pr-4">Active</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tier.options || []).map((opt) => (
                      <tr key={opt.id} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-2 pr-4">{opt.distance_km} km</td>
                        <td className="py-2 pr-4">{Number(opt.price).toLocaleString()}</td>
                        <td className="py-2 pr-4">{opt.capacity ?? '—'}</td>
                        <td className="py-2 pr-4">{opt.is_active ? 'Yes' : 'No'}</td>
                        <td className="py-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openOptionModal(tier.id, opt)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteOption({ tierId: tier.id, optionId: opt.id })
                            }
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => openOptionModal(tier.id)}
                className="mt-3 flex items-center gap-1 text-sm text-primary dark:text-primary-dark"
              >
                <Plus size={16} /> Add distance option
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'purchases' && (
        <AdminResponsiveData
          mobile={
            <div className="space-y-3">
              {purchases.map((p) => (
                <AdminMobileCard key={p.id}>
                  <p className="font-semibold text-gray-900 dark:text-white">{p.tier_name}</p>
                  <AdminMobileCardRow label="Distance" value={`${p.distance_km} km`} />
                  <AdminMobileCardRow label="Buyer" value={p.buyer_name || '—'} />
                  <AdminMobileCardRow label="Status" value={p.payment_status} />
                  <AdminMobileCardRow
                    label="Amount"
                    value={`KES ${Number(p.price).toLocaleString()}`}
                  />
                </AdminMobileCard>
              ))}
              {purchases.length === 0 && (
                <p className="text-gray-500">No medal purchases yet.</p>
              )}
            </div>
          }
          desktop={
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Distance</th>
                    <th className="py-2 pr-3">Buyer</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Receipt</th>
                    <th className="py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-2 pr-3">{p.tier_name}</td>
                      <td className="py-2 pr-3">{p.distance_km} km</td>
                      <td className="py-2 pr-3">{p.buyer_name || '—'}</td>
                      <td className="py-2 pr-3">{p.email || '—'}</td>
                      <td className="py-2 pr-3">{p.payment_status}</td>
                      <td className="py-2 pr-3">{p.mpesa_receipt || '—'}</td>
                      <td className="py-2">
                        {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {purchases.length === 0 && (
                <p className="text-gray-500 py-6">No medal purchases yet.</p>
              )}
            </div>
          }
        />
      )}

      {editingTier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Edit {editingTier.name}</h3>
              <button type="button" onClick={() => setEditingTier(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                  value={tierForm.name}
                  onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                  rows={3}
                  value={tierForm.description}
                  onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Image URL</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                  value={tierForm.image_url}
                  onChange={(e) => setTierForm({ ...tierForm, image_url: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Benefits</label>
                {tierForm.benefits.map((b, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      className="flex-1 border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                      value={b}
                      onChange={(e) => {
                        const next = [...tierForm.benefits]
                        next[i] = e.target.value
                        setTierForm({ ...tierForm, benefits: next })
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTierForm({
                          ...tierForm,
                          benefits:
                            tierForm.benefits.length <= 1
                              ? ['']
                              : tierForm.benefits.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-sm text-primary"
                  onClick={() =>
                    setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] })
                  }
                >
                  + Add benefit
                </button>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm mb-1">Sort order</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                    value={tierForm.sort_order}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, sort_order: Number(e.target.value) })
                    }
                  />
                </div>
                <label className="flex items-end gap-2 pb-2">
                  <input
                    type="checkbox"
                    checked={tierForm.is_active}
                    onChange={(e) =>
                      setTierForm({ ...tierForm, is_active: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={saveTier}
                className="w-full bg-primary dark:bg-primary-dark text-white dark:text-black py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save tier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {optionTierId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingOption ? 'Edit option' : 'Add distance option'}
              </h3>
              <button type="button" onClick={() => setOptionTierId(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Distance (km)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                  value={optionForm.distance_km}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, distance_km: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Price (KES)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                  value={optionForm.price}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, price: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Capacity (blank = unlimited)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-900 dark:border-gray-600"
                  value={optionForm.capacity}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, capacity: e.target.value })
                  }
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={optionForm.is_active}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, is_active: e.target.checked })
                  }
                />
                Active
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={saveOption}
                className="w-full bg-primary dark:bg-primary-dark text-white dark:text-black py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save option'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={!!deleteOption}
        title="Remove distance option?"
        message="If this option has purchases it will be deactivated instead of deleted."
        onConfirm={confirmDeleteOption}
        onCancel={() => setDeleteOption(null)}
      />
    </div>
  )
}

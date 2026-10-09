import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { Trash2, Edit2, Plus } from 'lucide-react'
import {
  getFlashSalesForAdmin,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
} from '../../api/admin/flashSales'
import { getProductsForAdmin } from '../../api/admin/products'
import type { FlashSale } from '../../types'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import ProductsSectionTabs from '../../components/admin/ProductsSectionTabs'
import ZoneChips from '../../components/admin/ZoneChips'

interface AdminProductOption {
  id: string
  name: string
  price: number | string
  is_active: boolean
}

interface FlashSaleFormValues {
  product_id: string
  sale_price: string
  quantity_limit: string
  starts_at: string
  ends_at: string
  sort_order: string
  is_active: boolean
}

type FlashStatus = 'Scheduled' | 'Live' | 'Sold out' | 'Ended' | 'Inactive'

const STATUS_STYLES: Record<FlashStatus, string> = {
  Live: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  Scheduled: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  'Sold out': 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300',
  Ended: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  Inactive: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
}

function flashStatus(sale: FlashSale, now = Date.now()): FlashStatus {
  if (!sale.is_active) return 'Inactive'
  if (sale.ends_at && new Date(sale.ends_at).getTime() <= now) return 'Ended'
  if (new Date(sale.starts_at).getTime() > now) return 'Scheduled'
  if (sale.sold_out) return 'Sold out'
  return 'Live'
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function discountPercent(regular: number, sale: number): number | null {
  if (!regular || sale >= regular) return null
  return Math.round(((regular - sale) / regular) * 100)
}

function StatusBadge({ status, small }: { status: FlashStatus; small?: boolean }) {
  return (
    <span className={`${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'} rounded-full font-semibold ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

export default function AdminFlashSales() {
  const [sales, setSales] = useState<FlashSale[]>([])
  const [products, setProducts] = useState<AdminProductOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FlashSaleFormValues>()

  const selectedProductId = watch('product_id')
  const salePriceValue = watch('sale_price')

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  )
  const regularPrice = selectedProduct ? Number(selectedProduct.price) : null
  const priceTooHigh =
    regularPrice != null && salePriceValue !== '' && salePriceValue != null && Number(salePriceValue) >= regularPrice

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [salesData, productData] = await Promise.all([getFlashSalesForAdmin(), getProductsForAdmin()])
      setSales(Array.isArray(salesData) ? salesData : [])
      setProducts(Array.isArray(productData) ? productData : [])
    } catch (err) {
      setError('Failed to fetch flash sales')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    reset()
  }

  const openCreateModal = () => {
    setEditingId(null)
    reset({
      product_id: '',
      sale_price: '',
      quantity_limit: '',
      starts_at: toLocalInput(new Date().toISOString()),
      ends_at: '',
      sort_order: String(sales.length + 1),
      is_active: true,
    })
    setShowModal(true)
  }

  const handleEdit = (sale: FlashSale) => {
    setEditingId(sale.id)
    reset({
      product_id: sale.product_id,
      sale_price: String(Number(sale.sale_price)),
      quantity_limit: sale.quantity_limit != null ? String(sale.quantity_limit) : '',
      starts_at: toLocalInput(sale.starts_at),
      ends_at: toLocalInput(sale.ends_at),
      sort_order: String(sale.sort_order ?? 0),
      is_active: sale.is_active,
    })
    setShowModal(true)
  }

  const onSubmit = async (data: FlashSaleFormValues) => {
    try {
      setSaving(true)
      setError('')
      const payload = {
        product_id: data.product_id,
        sale_price: Number(data.sale_price),
        quantity_limit: data.quantity_limit.trim() ? parseInt(data.quantity_limit, 10) : null,
        starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : new Date().toISOString(),
        ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : null,
        sort_order: parseInt(data.sort_order || '0', 10) || 0,
        is_active: Boolean(data.is_active),
      }

      if (editingId) {
        await updateFlashSale(editingId, payload)
      } else {
        await createFlashSale(payload)
      }

      closeModal()
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save flash sale')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      setError('')
      await deleteFlashSale(deleteId)
      fetchData()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete flash sale')
      console.error(err)
    } finally {
      setDeleteId(null)
    }
  }

  const priceCell = (sale: FlashSale) => {
    const regular = Number(sale.regular_price ?? 0)
    const flash = Number(sale.sale_price)
    const pct = discountPercent(regular, flash)
    return (
      <span>
        KES {flash.toLocaleString()}
        {pct != null && <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-400">-{pct}%</span>}
      </span>
    )
  }

  const stockLabel = (sale: FlashSale) =>
    sale.quantity_limit == null ? `${sale.sold_units} sold · no limit` : `${sale.sold_units} / ${sale.quantity_limit}`

  return (
    <div>
      <AdminPageHeader
        title="Products"
        actions={
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-6 py-2 rounded-lg hover:opacity-90 transition w-full sm:w-auto"
          >
            <Plus size={20} />
            New Flash Sale
          </button>
        }
      />

      <ProductsSectionTabs />

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Flash deals are only shown to customers for 24 hours after they buy an event ticket. A deal is shown to ticket
        holders from the product's zones, or to everyone if the product has no zones (set zones on the product).
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading flash sales...</div>
      ) : (
        <AdminResponsiveData
          isEmpty={sales.length === 0}
          empty={
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-600 dark:text-gray-400">
              No flash sales yet
            </div>
          }
          desktop={
            <table className="w-full min-w-[900px]">
              <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Zones</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Normal</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Flash</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Sold / Limit</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Starts</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Ends</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100">
                    <td className="px-6 py-4 font-medium">{sale.product_name}</td>
                    <td className="px-6 py-4"><ZoneChips zones={sale.product_zones} /></td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">KES {Number(sale.regular_price ?? 0).toLocaleString()}</td>
                    <td className="px-6 py-4">{priceCell(sale)}</td>
                    <td className="px-6 py-4">{stockLabel(sale)}</td>
                    <td className="px-6 py-4 text-sm">{formatDateTime(sale.starts_at)}</td>
                    <td className="px-6 py-4 text-sm">{sale.ends_at ? formatDateTime(sale.ends_at) : 'No end date'}</td>
                    <td className="px-6 py-4"><StatusBadge status={flashStatus(sale)} /></td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(sale)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px]" aria-label={`Edit flash sale for ${sale.product_name}`}>
                          <Edit2 size={18} />
                        </button>
                        <button onClick={() => setDeleteId(sale.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px]" aria-label={`Delete flash sale for ${sale.product_name}`}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
          mobile={sales.map((sale) => (
            <AdminMobileCard
              key={sale.id}
              footer={
                <>
                  <button onClick={() => handleEdit(sale)} className="flex items-center gap-1 text-blue-600 dark:text-blue-400 min-h-[44px] px-3">
                    <Edit2 size={18} /> Edit
                  </button>
                  <button onClick={() => setDeleteId(sale.id)} className="flex items-center gap-1 text-red-600 dark:text-red-400 min-h-[44px] px-3">
                    <Trash2 size={18} /> Delete
                  </button>
                </>
              }
            >
              <p className="font-semibold text-gray-900 dark:text-white">{sale.product_name}</p>
              <AdminMobileCardRow label="Zones" value={<ZoneChips zones={sale.product_zones} />} />
              <AdminMobileCardRow label="Normal" value={`KES ${Number(sale.regular_price ?? 0).toLocaleString()}`} />
              <AdminMobileCardRow label="Flash" value={priceCell(sale)} />
              <AdminMobileCardRow label="Sold / Limit" value={stockLabel(sale)} />
              <AdminMobileCardRow label="Starts" value={formatDateTime(sale.starts_at)} />
              <AdminMobileCardRow label="Ends" value={sale.ends_at ? formatDateTime(sale.ends_at) : 'No end date'} />
              <AdminMobileCardRow label="Status" value={<StatusBadge status={flashStatus(sale)} small />} />
            </AdminMobileCard>
          ))}
        />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingId ? 'Edit Flash Sale' : 'New Flash Sale'}
              </h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Product *</label>
                <select
                  {...register('product_id', { required: 'Product is required' })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — KES {Number(p.price).toLocaleString()}{p.is_active ? '' : ' (inactive)'}
                    </option>
                  ))}
                </select>
                {errors.product_id && <span className="text-red-600 dark:text-red-400 text-sm">{errors.product_id.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Flash price (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('sale_price', {
                    required: 'Flash price is required',
                    validate: (v) => Number(v) > 0 || 'Flash price must be greater than 0',
                  })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {regularPrice != null && (
                  <p className={`text-xs mt-1 ${priceTooHigh ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    Normal price: KES {regularPrice.toLocaleString()}
                    {priceTooHigh
                      ? ' — the flash price must be lower'
                      : salePriceValue && discountPercent(regularPrice, Number(salePriceValue)) != null
                        ? ` — ${discountPercent(regularPrice, Number(salePriceValue))}% off`
                        : ''}
                  </p>
                )}
                {errors.sale_price && <span className="text-red-600 dark:text-red-400 text-sm">{errors.sale_price.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Total quantity at flash price</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  {...register('quantity_limit')}
                  placeholder="Leave blank for no limit"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Starts *</label>
                  <input
                    type="datetime-local"
                    {...register('starts_at', { required: 'Start date is required' })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {errors.starts_at && <span className="text-red-600 dark:text-red-400 text-sm">{errors.starts_at.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Ends</label>
                  <input
                    type="datetime-local"
                    {...register('ends_at')}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Optional</p>
                </div>
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
                <label className="flex items-center gap-2">
                  <input type="checkbox" {...register('is_active')} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</span>
                </label>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || priceTooHigh}
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
        open={deleteId !== null}
        title="Delete flash sale"
        message="Are you sure you want to delete this flash sale? Sales that already have orders cannot be deleted — deactivate them instead."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}

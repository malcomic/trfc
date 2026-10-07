import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import type { ProductVariant } from '../../types'
import { DISTANCE_PRESETS, SIZE_PRESETS } from '../../utils/productOptions'

export interface SizeRow {
  size: string
  stock: string
}

export interface ProductOptionsFormValue {
  sizesEnabled: boolean
  sizes: SizeRow[]
  inactiveSizes: SizeRow[]
  distancesEnabled: boolean
  distances: string[]
}

export const EMPTY_OPTIONS_FORM: ProductOptionsFormValue = {
  sizesEnabled: false,
  sizes: [],
  inactiveSizes: [],
  distancesEnabled: false,
  distances: [],
}

export function optionsFormFromProduct(product: {
  variants?: ProductVariant[]
  distance_options?: string[]
}): ProductOptionsFormValue {
  const variants = product.variants ?? []
  const active = variants.filter((v) => v.is_active)
  const distances = product.distance_options ?? []
  return {
    sizesEnabled: active.length > 0,
    sizes: active.map((v) => ({ size: v.size, stock: String(v.stock) })),
    inactiveSizes: variants.filter((v) => !v.is_active).map((v) => ({ size: v.size, stock: String(v.stock) })),
    distancesEnabled: distances.length > 0,
    distances,
  }
}

/** Returns an error message, or null when the sizes and distances are valid to save. */
export function validateOptionsForm(value: ProductOptionsFormValue): string | null {
  if (value.sizesEnabled) {
    if (value.sizes.length === 0) return 'Add at least one size, or turn off sizes'
    const seen = new Set<string>()
    for (const row of value.sizes) {
      const size = row.size.trim()
      if (!size) return 'Every size needs a name'
      if (size.length > 20) return `Size "${size}" is too long (max 20 characters)`
      if (seen.has(size.toLowerCase())) return `Size "${size}" is listed twice`
      seen.add(size.toLowerCase())
      const stock = Number(row.stock)
      if (row.stock.trim() === '' || !Number.isInteger(stock) || stock < 0) {
        return `Stock for size "${size}" must be a whole number of 0 or more`
      }
    }
  }
  if (value.distancesEnabled && value.distances.length === 0) {
    return 'Add at least one distance, or turn off distance options'
  }
  return null
}

export function optionsPayload(value: ProductOptionsFormValue) {
  const variants = value.sizesEnabled
    ? value.sizes.map((row) => ({ size: row.size.trim(), stock: Number(row.stock) }))
    : []
  return {
    variants,
    distance_options: value.distancesEnabled ? value.distances : [],
    totalSizeStock: variants.reduce((sum, v) => sum + v.stock, 0),
  }
}

const inputClass =
  'border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
const chipButton =
  'text-xs px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'

interface ProductOptionsEditorProps {
  value: ProductOptionsFormValue
  onChange: (value: ProductOptionsFormValue) => void
}

export default function ProductOptionsEditor({ value, onChange }: ProductOptionsEditorProps) {
  const [distanceDraft, setDistanceDraft] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const update = (patch: Partial<ProductOptionsFormValue>) => onChange({ ...value, ...patch })

  const setSize = (index: number, patch: Partial<SizeRow>) =>
    update({ sizes: value.sizes.map((row, i) => (i === index ? { ...row, ...patch } : row)) })

  const moveSize = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= value.sizes.length) return
    const sizes = [...value.sizes]
    ;[sizes[index], sizes[target]] = [sizes[target], sizes[index]]
    update({ sizes })
  }

  const removeSize = (index: number) => update({ sizes: value.sizes.filter((_, i) => i !== index) })

  const applyPreset = (preset: string[]) => {
    const existing = new Set(value.sizes.map((row) => row.size.trim().toLowerCase()))
    const additions = preset.filter((s) => !existing.has(s.toLowerCase())).map((size) => ({ size, stock: '0' }))
    update({ sizes: [...value.sizes, ...additions] })
  }

  const restoreSize = (row: SizeRow) =>
    update({
      sizes: [...value.sizes, row],
      inactiveSizes: value.inactiveSizes.filter((r) => r.size !== row.size),
    })

  const addDistances = (raw: string[]) => {
    const existing = new Set(value.distances.map((d) => d.toLowerCase()))
    const additions: string[] = []
    for (const entry of raw) {
      const distance = entry.trim()
      if (!distance || distance.length > 20 || existing.has(distance.toLowerCase())) continue
      existing.add(distance.toLowerCase())
      additions.push(distance)
    }
    if (additions.length) update({ distances: [...value.distances, ...additions] })
  }

  const totalStock = value.sizes.reduce((sum, row) => sum + (Number(row.stock) || 0), 0)

  return (
    <div className="space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.sizesEnabled}
            onChange={(e) => update({ sizesEnabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Has sizes (stock per size)</span>
        </label>

        {value.sizesEnabled && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {SIZE_PRESETS.map((preset) => (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset.sizes)} className={chipButton}>
                  + {preset.label}
                </button>
              ))}
            </div>

            {value.sizes.map((row, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.size}
                  onChange={(e) => setSize(index, { size: e.target.value })}
                  placeholder="Size"
                  maxLength={20}
                  aria-label="Size name"
                  className={`${inputClass} w-24`}
                />
                <input
                  type="number"
                  min={0}
                  value={row.stock}
                  onChange={(e) => setSize(index, { stock: e.target.value })}
                  placeholder="Stock"
                  aria-label={`Stock for size ${row.size}`}
                  className={`${inputClass} w-24`}
                />
                <button type="button" onClick={() => moveSize(index, -1)} disabled={index === 0} aria-label="Move up" className="text-gray-500 disabled:opacity-30">
                  <ArrowUp size={16} />
                </button>
                <button type="button" onClick={() => moveSize(index, 1)} disabled={index === value.sizes.length - 1} aria-label="Move down" className="text-gray-500 disabled:opacity-30">
                  <ArrowDown size={16} />
                </button>
                <button type="button" onClick={() => removeSize(index)} aria-label={`Remove size ${row.size}`} className="text-red-600 dark:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => update({ sizes: [...value.sizes, { size: '', stock: '0' }] })}
              className="flex items-center gap-1 text-sm text-primary dark:text-primary-dark font-semibold"
            >
              <Plus size={14} /> Add size
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total stock across sizes: <strong>{totalStock}</strong>. Removed sizes are hidden from customers, not deleted.
            </p>

            {value.inactiveSizes.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowInactive((s) => !s)}
                  className="text-xs text-gray-600 dark:text-gray-400 underline"
                >
                  {showInactive ? 'Hide' : 'Show'} inactive sizes ({value.inactiveSizes.length})
                </button>
                {showInactive && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {value.inactiveSizes.map((row) => (
                      <button key={row.size} type="button" onClick={() => restoreSize(row)} className={`${chipButton} flex items-center gap-1`}>
                        <RotateCcw size={12} /> {row.size}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.distancesEnabled}
            onChange={(e) => update({ distancesEnabled: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Has distance options</span>
        </label>

        {value.distancesEnabled && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => addDistances(DISTANCE_PRESETS)} className={chipButton}>
                + {DISTANCE_PRESETS.join(', ')}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {value.distances.map((distance) => (
                <span key={distance} className="flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {distance}
                  <button
                    type="button"
                    onClick={() => update({ distances: value.distances.filter((d) => d !== distance) })}
                    aria-label={`Remove distance ${distance}`}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={distanceDraft}
                maxLength={20}
                onChange={(e) => setDistanceDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addDistances([distanceDraft])
                    setDistanceDraft('')
                  }
                }}
                placeholder="e.g. 15K"
                aria-label="New distance"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={() => {
                  addDistances([distanceDraft])
                  setDistanceDraft('')
                }}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

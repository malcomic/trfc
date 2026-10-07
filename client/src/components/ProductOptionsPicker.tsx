import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShoppingCart, X } from 'lucide-react'
import type { ProductSelection } from '../types'
import {
  EMPTY_SELECTION,
  LOW_STOCK_THRESHOLD,
  ProductOptionsSource,
  availableStock,
  isSelectionComplete,
  requiresDistance,
  requiresSize,
} from '../utils/productOptions'
import { cardSurface, inputField } from '../utils/themeClasses'

interface ProductOptionsPickerProps {
  source: ProductOptionsSource
  selection: ProductSelection
  onChange: (selection: ProductSelection) => void
}

const labelClass =
  'block font-barlow-condensed font-bold text-xs tracking-widest uppercase text-fog light:text-fog-light mb-2'

function chipClass(selected: boolean, disabled = false) {
  if (disabled) {
    return 'px-4 py-2 clip-angled-sm font-barlow-condensed font-bold text-sm tracking-wider border border-white/5 light:border-black/8 text-fog/50 light:text-fog-light/50 line-through cursor-not-allowed'
  }
  return `px-4 py-2 clip-angled-sm font-barlow-condensed font-bold text-sm tracking-wider border transition-all duration-200 cursor-pointer ${
    selected
      ? 'bg-accent light:bg-accent-light text-black light:text-white border-accent light:border-accent-light'
      : 'bg-transparent text-chalk light:text-chalk-light border-white/15 light:border-black/15 hover:border-accent light:hover:border-accent-light'
  }`
}

export default function ProductOptionsPicker({ source, selection, onChange }: ProductOptionsPickerProps) {
  const selectedVariant = source.variants.find((v) => v.id === selection.variantId)
  const selectedStock = selectedVariant ? Number(selectedVariant.stock) : null

  return (
    <div className="flex flex-col gap-5">
      {requiresSize(source) && (
        <div>
          <span className={labelClass}>Size</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {source.variants.map((variant) => {
              const soldOut = Number(variant.stock) <= 0
              const selected = variant.id === selection.variantId
              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={soldOut}
                  title={soldOut ? 'Sold out' : undefined}
                  onClick={() => onChange({ ...selection, variantId: variant.id, size: variant.size })}
                  className={chipClass(selected, soldOut)}
                >
                  {variant.size}
                </button>
              )
            })}
          </div>
          {selectedStock != null && selectedStock > 0 && selectedStock <= LOW_STOCK_THRESHOLD && (
            <p className="mt-2 text-xs font-barlow-condensed font-bold tracking-widest uppercase text-amber-400 light:text-amber-700">
              Only {selectedStock} left in size {selectedVariant?.size}
            </p>
          )}
        </div>
      )}

      {requiresDistance(source) && (
        <div>
          <span className={labelClass}>Distance</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Distance">
            {source.distanceOptions.map((distance) => {
              const selected = distance === selection.distance
              return (
                <button
                  key={distance}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ ...selection, distance })}
                  className={chipClass(selected)}
                >
                  {distance}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProductOptionsModalProps {
  open: boolean
  title: string
  priceLabel?: string
  source: ProductOptionsSource
  productStock: number
  /** Extra cap on quantity, e.g. units left at a flash price. */
  maxQuantity?: number | null
  confirmLabel?: string
  onClose: () => void
  onConfirm: (selection: ProductSelection, quantity: number) => void
}

export function ProductOptionsModal({
  open,
  title,
  priceLabel,
  source,
  productStock,
  maxQuantity,
  confirmLabel = 'Add to cart',
  onClose,
  onConfirm,
}: ProductOptionsModalProps) {
  const [selection, setSelection] = useState<ProductSelection>(EMPTY_SELECTION)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (open) {
      setSelection(EMPTY_SELECTION)
      setQuantity(1)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const stock = availableStock(source, selection, productStock)
  const cap = Math.max(0, maxQuantity != null ? Math.min(stock, maxQuantity) : stock)
  const complete = isSelectionComplete(source, selection)
  const canConfirm = complete && cap > 0 && quantity >= 1 && quantity <= cap

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Choose options for ${title}`}
    >
      <div
        className={`${cardSurface} w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6 clip-angled-sm`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="font-bebas text-3xl text-chalk light:text-chalk-light leading-none">{title}</h3>
            {priceLabel && (
              <p className="font-bebas text-2xl text-accent light:text-accent-light mt-1">{priceLabel}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="bg-transparent border-0 cursor-pointer text-fog light:text-fog-light hover:text-chalk light:hover:text-chalk-light"
          >
            <X size={20} />
          </button>
        </div>

        <ProductOptionsPicker source={source} selection={selection} onChange={setSelection} />

        <div className="flex items-center gap-4 mt-5">
          <label htmlFor="options-qty" className="text-sm text-fog light:text-fog-light">Qty</label>
          <input
            id="options-qty"
            type="number"
            min={1}
            max={cap || 1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(cap || 1, parseInt(e.target.value) || 1)))}
            className={`w-20 px-3 py-2 ${inputField}`}
          />
        </div>

        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => onConfirm(selection, quantity)}
          className="mt-6 w-full py-3.5 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase flex items-center justify-center gap-2 bg-accent light:bg-accent-light text-black light:text-white hover:bg-accent/90 light:hover:bg-accent-light/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingCart size={16} />
          {complete ? confirmLabel : 'Choose your options'}
        </button>
      </div>
    </div>,
    document.body
  )
}

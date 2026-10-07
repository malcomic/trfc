import type { CartItem, FlashSaleOffer, Product, ProductSelection, ProductVariant } from '../types'

export const LOW_STOCK_THRESHOLD = 5

export const SIZE_PRESETS: { label: string; sizes: string[] }[] = [
  { label: 'Apparel XS-XXL', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { label: 'Shoes 38-45', sizes: ['38', '39', '40', '41', '42', '43', '44', '45'] },
]

export const DISTANCE_PRESETS = ['5K', '10K', '21K', '42K']

export interface ProductOptionsSource {
  variants: ProductVariant[]
  distanceOptions: string[]
}

export const EMPTY_SELECTION: ProductSelection = { variantId: null, size: null, distance: null }

export function optionsFromProduct(product: Pick<Product, 'variants' | 'distance_options'>): ProductOptionsSource {
  return {
    variants: (product.variants ?? []).filter((v) => v.is_active !== false),
    distanceOptions: product.distance_options ?? [],
  }
}

export function optionsFromOffer(offer: Pick<FlashSaleOffer, 'product_variants' | 'distance_options'>): ProductOptionsSource {
  return {
    variants: (offer.product_variants ?? []).filter((v) => v.is_active !== false),
    distanceOptions: offer.distance_options ?? [],
  }
}

export const requiresSize = (source: ProductOptionsSource) => source.variants.length > 0
export const requiresDistance = (source: ProductOptionsSource) => source.distanceOptions.length > 0
export const productHasOptions = (source: ProductOptionsSource) => requiresSize(source) || requiresDistance(source)

export function isSelectionComplete(source: ProductOptionsSource, selection: ProductSelection): boolean {
  if (requiresSize(source) && !selection.variantId) return false
  if (requiresDistance(source) && !selection.distance) return false
  return true
}

/** Stock available for the current choice: the selected size's stock, or the product total. */
export function availableStock(source: ProductOptionsSource, selection: ProductSelection, productStock: number): number {
  if (requiresSize(source)) {
    const variant = source.variants.find((v) => v.id === selection.variantId)
    return variant ? Number(variant.stock) : 0
  }
  return Number(productStock)
}

export function allSizesSoldOut(source: ProductOptionsSource): boolean {
  return requiresSize(source) && source.variants.every((v) => Number(v.stock) <= 0)
}

export function formatSelectedOptions(item: Pick<CartItem, 'size' | 'distance'>): string {
  return [item.size ? `Size: ${item.size}` : '', item.distance ? `Distance: ${item.distance}` : '']
    .filter(Boolean)
    .join(' · ')
}

/** True when a saved cart line is missing a size or distance the product now requires. */
export function cartItemNeedsOptions(item: CartItem): boolean {
  const source = optionsFromProduct(item.product)
  if (requiresSize(source) && !item.variantId) return true
  if (requiresDistance(source) && !item.distance) return true
  return false
}

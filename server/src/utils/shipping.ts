export function getShipping(subtotal: number): number {
  return subtotal >= 3000 ? 0 : 250
}

export function getGrandTotal(subtotal: number): number {
  return subtotal + getShipping(subtotal)
}

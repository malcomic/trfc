export function getShipping(_subtotal: number): number {
  return 0
}

export function getGrandTotal(subtotal: number): number {
  return subtotal + getShipping(subtotal)
}

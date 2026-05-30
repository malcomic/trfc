import { describe, it, expect } from 'vitest'
import { getShipping, getGrandTotal } from '../../utils/shipping'

describe('shipping', () => {
  it('charges KES 250 below free-delivery threshold', () => {
    expect(getShipping(2999)).toBe(250)
    expect(getGrandTotal(2999)).toBe(3249)
  })

  it('waives delivery at KES 3000 and above', () => {
    expect(getShipping(3000)).toBe(0)
    expect(getGrandTotal(3000)).toBe(3000)
  })
})

describe('shop filter logic', () => {
  const products = [
    { id: '1', name: 'Jersey', category: 'Apparel', price: 2000 },
    { id: '2', name: 'Bottle', category: 'Accessories', price: 500 },
  ]

  it('filters by category', () => {
    const activeCategory = 'Apparel'
    const filtered = products.filter((p) =>
      activeCategory === 'All' || (p.category || '').toLowerCase() === activeCategory.toLowerCase()
    )
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe('Jersey')
  })
})

describe('events filter logic', () => {
  const events = [
    { id: '1', title: 'Marathon', category: 'Race' },
    { id: '2', title: 'Social Run', category: 'Social' },
  ]

  it('filters by category', () => {
    const activeFilter = 'Race'
    const filtered = events.filter((e) => {
      const category = (e as any).category || ''
      return activeFilter === 'All' || category.toLowerCase() === activeFilter.toLowerCase()
    })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].title).toBe('Marathon')
  })
})

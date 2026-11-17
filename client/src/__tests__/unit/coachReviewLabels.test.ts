import { describe, it, expect } from 'vitest'
import { REVIEW_STATUS_LABELS, type ReviewStatus } from '../../api/coaches'

describe('REVIEW_STATUS_LABELS', () => {
  it.each([
    ['reviewed', 'Reviewed'],
    ['needs_clarification', 'Needs clarification'],
    ['flagged', 'Flagged'],
  ] as [ReviewStatus, string][])('labels %s', (status, label) => {
    expect(REVIEW_STATUS_LABELS[status]).toBe(label)
  })
})

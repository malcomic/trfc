import { describe, it, expect } from 'vitest'
import { ENGAGEMENT_STATUS_LABELS, type EngagementStatus } from '../../api/coaches'

describe('ENGAGEMENT_STATUS_LABELS', () => {
  it.each([
    ['on_track', 'On Track'],
    ['needs_attention', 'Needs Attention'],
    ['inactive', 'Inactive'],
    ['completed', 'Completed'],
  ] as [EngagementStatus, string][])('labels %s', (status, label) => {
    expect(ENGAGEMENT_STATUS_LABELS[status]).toBe(label)
  })
})

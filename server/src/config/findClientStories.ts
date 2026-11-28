/** Curated “What past clients say” cards on Find My Program. */
export const FIND_CLIENT_SLOTS = ['find_client_1', 'find_client_2', 'find_client_3'] as const
export type FindClientSlot = (typeof FIND_CLIENT_SLOTS)[number]

export function isFindClientSlot(value: unknown): value is FindClientSlot {
  return typeof value === 'string' && (FIND_CLIENT_SLOTS as readonly string[]).includes(value)
}

export const FIND_CLIENT_DEFAULTS: Record<
  FindClientSlot,
  { title: string; category: string }
> = {
  find_client_1: { title: 'Past client 1', category: 'Fat loss' },
  find_client_2: { title: 'Past client 2', category: 'Running' },
  find_client_3: { title: 'Past client 3', category: 'Hiking' },
}

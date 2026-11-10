import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}))
vi.mock('../../utils/emailService.js', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }))

import { query, getClient } from '../../config/db.js'
import { evaluateTransfer, transferTicket, TransferError, type TransferableTicket } from '../../utils/ticketTransfer.js'

const NOW = new Date('2026-11-10T09:00:00Z')
const ctx = { perkOn: true, senderIsMember: true, cancelDeadlineDays: 3 }

const ticket = (over: Partial<TransferableTicket> = {}): TransferableTicket => ({
  id: 'ticket-1',
  user_id: 'sender',
  payment_status: 'paid',
  checked_in_at: null,
  event_title: 'Ngong Hills Hike',
  event_starts_at: '2026-11-21T03:00:00Z',
  event_day: '2026-11-21',
  event_cancelled_at: null,
  members_only: false,
  transferred: false,
  ...over,
})

describe('evaluateTransfer', () => {
  it('allows a paid, unused ticket before the cancel deadline', () => {
    expect(evaluateTransfer(ticket(), 'sender', ctx, NOW)).toEqual({ allowed: true })
  })

  it.each([
    ['someone else', ticket({ user_id: 'other' }), ctx, 'Ticket not found'],
    ['perk off', ticket(), { ...ctx, perkOn: false }, 'Ticket transfer is not available right now'],
    ['not a member', ticket(), { ...ctx, senderIsMember: false }, 'Free ticket transfer is for TRFC members'],
    ['already transferred', ticket({ transferred: true }), ctx, 'This ticket has already been transferred once'],
    ['given up', ticket({ payment_status: 'cancelled' }), ctx, 'This ticket was given up'],
    ['paying in parts', ticket({ payment_status: 'reserved' }), ctx, 'Only fully paid tickets can be transferred'],
    ['checked in', ticket({ checked_in_at: '2026-11-09' }), ctx, 'This ticket has already been used'],
    ['event cancelled', ticket({ event_cancelled_at: '2026-11-09' }), ctx, 'This event was cancelled by TRFC'],
  ])('blocks when %s', (_label, t, c, reason) => {
    expect(evaluateTransfer(t, 'sender', c, NOW)).toEqual({ allowed: false, reason })
  })

  it('blocks after the cancel deadline', () => {
    const result = evaluateTransfer(ticket(), 'sender', ctx, new Date('2026-11-19T09:00:00Z'))
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/^You could transfer this ticket until/)
  })
})

describe('transferTicket', () => {
  const calls: { sql: string; params: unknown[] }[] = []

  function mockDb(opts: {
    ticket?: Partial<TransferableTicket>
    recipient?: { id: string; name: string; email: string } | null
    recipientMember?: boolean
    insertError?: { code: string }
  }) {
    calls.length = 0
    const handler = async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params })
      if (sql.includes('FROM member_perks')) return { rows: [{ status: 'on', settings: {} }] }
      if (sql.includes('member_until > NOW()')) {
        return { rows: [{ active: params[0] === 'sender' ? true : Boolean(opts.recipientMember) }] }
      }
      if (sql.includes('FROM ticket_rules_settings')) return { rows: [] }
      if (sql.includes('FROM tickets t')) {
        return { rows: [{ ...ticket(), event_starts_at: '2099-01-10T03:00:00Z', event_day: '2099-01-10', ...opts.ticket }] }
      }
      if (sql.includes('WHERE LOWER(email)')) return { rows: opts.recipient ? [opts.recipient] : [] }
      if (sql.includes('INSERT INTO ticket_transfers') && opts.insertError) throw opts.insertError
      if (sql.includes('SELECT name, email FROM users')) return { rows: [{ name: 'Sender Person', email: 'sender@example.com' }] }
      return { rows: [] }
    }
    vi.mocked(query).mockImplementation(handler as any)
    vi.mocked(getClient).mockResolvedValue({ query: vi.fn(handler), release: vi.fn() } as any)
  }

  beforeEach(() => vi.clearAllMocks())

  it('moves the ticket to the recipient and records the transfer', async () => {
    mockDb({ recipient: { id: 'friend', name: 'Friend Runner', email: 'Friend@Example.com' } })
    const result = await transferTicket('ticket-1', 'sender', ' friend@example.com ')
    expect(result).toEqual({ ticketId: 'ticket-1', recipientName: 'Friend Runner', eventTitle: 'Ngong Hills Hike' })
    const update = calls.find((c) => c.sql.includes('UPDATE tickets SET user_id'))!
    expect(update.params).toEqual(['ticket-1', 'friend', 'friend@example.com', 'Friend Runner'])
    const insert = calls.find((c) => c.sql.includes('INSERT INTO ticket_transfers'))!
    expect(insert.params).toEqual(['ticket-1', 'sender', 'friend'])
    expect(calls.some((c) => c.sql === 'COMMIT')).toBe(true)
  })

  it('needs an existing account', async () => {
    mockDb({ recipient: null })
    await expect(transferTicket('ticket-1', 'sender', 'nobody@example.com')).rejects.toThrow(/No TRFC account uses that email/)
    expect(calls.some((c) => c.sql.includes('UPDATE tickets'))).toBe(false)
  })

  it('refuses to transfer to yourself', async () => {
    mockDb({ recipient: { id: 'sender', name: 'Me', email: 'sender@example.com' } })
    await expect(transferTicket('ticket-1', 'sender', 'sender@example.com')).rejects.toThrow('This ticket is already yours')
  })

  it('sends members-only tickets to members only', async () => {
    mockDb({ ticket: { members_only: true }, recipient: { id: 'friend', name: 'F', email: 'f@example.com' }, recipientMember: false })
    await expect(transferTicket('ticket-1', 'sender', 'f@example.com')).rejects.toThrow(/members-only ticket/)

    mockDb({ ticket: { members_only: true }, recipient: { id: 'friend', name: 'F', email: 'f@example.com' }, recipientMember: true })
    await expect(transferTicket('ticket-1', 'sender', 'f@example.com')).resolves.toMatchObject({ recipientName: 'F' })
  })

  it('rejects a second transfer', async () => {
    mockDb({ ticket: { transferred: true }, recipient: { id: 'friend', name: 'F', email: 'f@example.com' } })
    await expect(transferTicket('ticket-1', 'sender', 'f@example.com')).rejects.toThrow('already been transferred once')

    mockDb({ recipient: { id: 'friend', name: 'F', email: 'f@example.com' }, insertError: { code: '23505' } })
    const error = await transferTicket('ticket-1', 'sender', 'f@example.com').catch((e) => e)
    expect(error).toBeInstanceOf(TransferError)
    expect(error.message).toBe('This ticket has already been transferred once')
  })

  it('validates the email first', async () => {
    await expect(transferTicket('ticket-1', 'sender', 'not-an-email')).rejects.toThrow('Enter the email')
    expect(getClient).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))

import { query } from '../../config/db.js'
import {
  MEMBER_CODE_ALPHABET,
  MEMBER_CODE_LENGTH,
  ensureMemberCode,
  findMemberByCode,
  generateMemberCode,
  memberQrPayload,
  normalizeMemberCode,
  regenerateMemberCode,
} from '../../utils/memberPass.js'
import { parseScanPayload } from '../../utils/qrCodeGenerator.js'
import { allowRegenerate } from '../../controllers/memberPassController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateMemberCode', () => {
  it('makes 10-character codes without look-alike characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateMemberCode()
      expect(code).toHaveLength(MEMBER_CODE_LENGTH)
      for (const ch of code) expect(MEMBER_CODE_ALPHABET).toContain(ch)
      expect(code).not.toMatch(/[01OI]/)
    }
  })
})

describe('normalizeMemberCode', () => {
  it('accepts lowercase and the grouped ABCDE-FGHJK form', () => {
    expect(normalizeMemberCode('abcde-fghjk')).toBe('ABCDEFGHJK')
    expect(normalizeMemberCode(' ABCDE FGHJK ')).toBe('ABCDEFGHJK')
  })

  it('rejects the wrong length or look-alike characters', () => {
    expect(normalizeMemberCode('ABCDE')).toBeNull()
    expect(normalizeMemberCode('ABCDEFGHJ0')).toBeNull()
    expect(normalizeMemberCode('ABCDEFGHJI')).toBeNull()
  })
})

describe('parseScanPayload', () => {
  it('reads member passes', () => {
    expect(parseScanPayload(memberQrPayload('ABCDEFGHJK'))).toEqual({ kind: 'member', code: 'ABCDEFGHJK' })
    expect(parseScanPayload('MEMBER:abcdefghjk')).toEqual({ kind: 'member', code: 'ABCDEFGHJK' })
  })

  it('rejects broken member payloads', () => {
    expect(parseScanPayload('member:')).toBeNull()
    expect(parseScanPayload('member:AB')).toBeNull()
  })

  it('still reads tickets and medals', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(parseScanPayload(`${id}:${id}`)).toMatchObject({ kind: 'ticket', ticketId: id })
    expect(parseScanPayload(`medal:${id}:gold:10`)).toEqual({ kind: 'medal', purchaseId: id })
  })
})

describe('ensureMemberCode', () => {
  it('returns the existing code', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ member_code: 'ABCDEFGHJK' }] } as any)
    expect(await ensureMemberCode(USER_ID)).toBe('ABCDEFGHJK')
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('creates a code and retries when a code is already taken', async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [{ member_code: null }] } as any)
      .mockRejectedValueOnce(Object.assign(new Error('duplicate'), { code: '23505' }))
      .mockResolvedValueOnce({ rows: [{ member_code: 'NEWCODE234' }] } as any)
    expect(await ensureMemberCode(USER_ID)).toBe('NEWCODE234')
    const updates = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('UPDATE users SET member_code'))
    expect(updates).toHaveLength(2)
    expect(String(updates[0][0])).toContain('member_code IS NULL')
  })

  it('throws for an unknown user', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [] } as any)
    await expect(ensureMemberCode(USER_ID)).rejects.toThrow('User not found')
  })
})

describe('regenerateMemberCode', () => {
  it('replaces the code even when one exists', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ member_code: 'FRESHCODE2' }] } as any)
    expect(await regenerateMemberCode(USER_ID)).toBe('FRESHCODE2')
    expect(String(vi.mocked(query).mock.calls[0][0])).not.toContain('member_code IS NULL')
  })

  it('does not swallow other database errors', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('connection lost'))
    await expect(regenerateMemberCode(USER_ID)).rejects.toThrow('connection lost')
  })
})

describe('findMemberByCode', () => {
  it('does not query for an invalid code', async () => {
    expect(await findMemberByCode('nope')).toBeNull()
    expect(query).not.toHaveBeenCalled()
  })

  it('looks up the normalized code', async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [{ id: USER_ID, name: 'Jane', zone: 'Westlands' }] } as any)
    expect(await findMemberByCode('abcde-fghjk')).toEqual({ id: USER_ID, name: 'Jane', zone: 'Westlands' })
    expect(vi.mocked(query).mock.calls[0][1]).toEqual(['ABCDEFGHJK'])
  })
})

describe('allowRegenerate', () => {
  it('allows 3 new codes an hour', () => {
    const now = 1_000_000
    expect(allowRegenerate('limit-user', now)).toBe(true)
    expect(allowRegenerate('limit-user', now + 1)).toBe(true)
    expect(allowRegenerate('limit-user', now + 2)).toBe(true)
    expect(allowRegenerate('limit-user', now + 3)).toBe(false)
    expect(allowRegenerate('limit-user', now + 60 * 60 * 1000 + 1)).toBe(true)
  })
})

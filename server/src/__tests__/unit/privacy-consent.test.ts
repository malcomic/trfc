import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))
vi.mock('../../utils/lastActive.js', () => ({ touchLastActive: vi.fn(async () => undefined) }))
vi.mock('../../utils/cloudinary.js', () => ({
  deleteVideo: vi.fn(async () => undefined),
  deletePublicRaw: vi.fn(async () => undefined),
}))
vi.mock('bcrypt', () => ({ default: { compare: vi.fn(async (plain: string) => plain === 'right-password') } }))

import { query } from '../../config/db.js'
import { deletePublicRaw, deleteVideo } from '../../utils/cloudinary.js'
import {
  clearMaterialCache,
  needsConsent,
  validatePolicyDraft,
  validatePrivacySettings,
} from '../../utils/policies.js'
import {
  ConsentError,
  acceptPrivacy,
  checkSignupConsent,
  getConsentStatus,
  setMarketing,
  setWhatsappShare,
} from '../../utils/consents.js'
import { authMiddleware, isConsentExempt } from '../../middleware/auth.js'
import { anonymiseDeletedAccounts, purgeExpiredApplications } from '../../utils/retention.js'
import { buildMemberExport } from '../../utils/memberDataExport.js'
import { deleteMyAccount } from '../../controllers/privacyController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const CAPTAIN_ID = '44444444-4444-4444-8444-444444444444'
const OTHER_CAPTAIN_ID = '55555555-5555-4555-8555-555555555555'

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const callsMatching = (fragment: string) => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))
const rows = (list: unknown[]) => ({ rows: list, rowCount: list.length }) as any

/** Routes mocked queries by a fragment of their SQL; unmatched queries return no rows. */
function routeQueries(routes: [string, unknown[] | (() => unknown[])][]) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    for (const [fragment, result] of routes) {
      if (String(sql).includes(fragment)) return rows(typeof result === 'function' ? result() : result)
    }
    return rows([])
  }) as any)
}

const policyRow = (slug: string, version: string) => ({ slug, version, title: 'T', intro: '', sections: [], last_updated: '2026-11-01' })

beforeEach(() => {
  vi.mocked(query).mockReset()
  clearMaterialCache()
})

describe('needsConsent', () => {
  it('asks anyone who never agreed', () => {
    expect(needsConsent(null, null)).toBe(true)
  })

  it('only asks again after a big change published since they agreed', () => {
    const agreed = new Date('2026-10-01T00:00:00Z')
    expect(needsConsent(agreed, null)).toBe(false)
    expect(needsConsent(agreed, new Date('2026-09-01T00:00:00Z'))).toBe(false)
    expect(needsConsent(agreed, new Date('2026-11-01T00:00:00Z'))).toBe(true)
  })
})

describe('checkSignupConsent', () => {
  beforeEach(() => routeQueries([["FROM policy_documents", [policyRow('privacy-members', '1.0')]]]))

  it('requires Box 1 and the 18+ box', async () => {
    await expect(checkSignupConsent({ ageConfirmed: true, policyVersion: '1.0' })).rejects.toThrow(/agree/)
    await expect(checkSignupConsent({ acceptTerms: true, policyVersion: '1.0' })).rejects.toThrow(/18/)
    await expect(checkSignupConsent({ acceptTerms: 'true', ageConfirmed: true, policyVersion: '1.0' })).rejects.toBeInstanceOf(ConsentError)
  })

  it('rejects an out of date version with 409', async () => {
    const error = await checkSignupConsent({ acceptTerms: true, ageConfirmed: true, policyVersion: '0.9' }).catch((e) => e)
    expect(error).toBeInstanceOf(ConsentError)
    expect(error.status).toBe(409)
  })

  it('returns the current version when everything is ticked', async () => {
    await expect(checkSignupConsent({ acceptTerms: true, ageConfirmed: true, policyVersion: '1.0' })).resolves.toBe('1.0')
  })
})

describe('acceptPrivacy', () => {
  it('saves the agreement and logs privacy, terms and age', async () => {
    routeQueries([["slug = $1 AND status = 'published'", [policyRow('terms', '1.2')]]])
    await acceptPrivacy(USER_ID, { version: '1.0', source: 'signup', ipHash: 'h' })

    expect(callsMatching('UPDATE users SET privacy_version_accepted')[0][1]).toEqual(['1.0', USER_ID, false])
    const logged = callsMatching('INSERT INTO consent_records').map(([, params]) => (params as unknown[]).slice(2, 6))
    expect(logged).toEqual([
      ['terms_privacy', true, 'privacy-members', '1.0'],
      ['terms_privacy', true, 'terms', '1.2'],
      ['age_18_plus', true, null, null],
    ])
  })
})

describe('setMarketing', () => {
  it('logs a withdrawal and clears the opt-in time', async () => {
    routeQueries([["FROM policy_documents", [policyRow('privacy-members', '1.0')]]])
    await setMarketing(USER_ID, false, { source: 'settings' })

    const update = callsMatching('UPDATE users')[0]
    expect(update[1]).toEqual([false, USER_ID])
    const consent = callsMatching('INSERT INTO consent_records')[0][1] as unknown[]
    expect(consent.slice(2, 4)).toEqual(['marketing_email', false])
    expect(consent[7]).toBe('settings')
  })
})

describe('setWhatsappShare', () => {
  const captains = [{ id: CAPTAIN_ID, name: 'Jane Doe', zone: 'Roysambu', photo_url: null, is_my_captain: true, whatsapp_shared: false }]

  it('refuses to share with a captain outside the member list', async () => {
    routeQueries([['WITH me AS', captains]])
    await expect(setWhatsappShare(USER_ID, OTHER_CAPTAIN_ID, true, { source: 'settings' })).rejects.toThrow(/zone/)
    expect(callsMatching('captain_whatsapp_shares (member_id').length).toBe(0)
  })

  it('turns sharing off for any captain and logs it', async () => {
    routeQueries([['WITH me AS', []]])
    await setWhatsappShare(USER_ID, OTHER_CAPTAIN_ID, false, { source: 'settings' })
    expect(callsMatching('INSERT INTO captain_whatsapp_shares')[0][1]).toEqual([USER_ID, OTHER_CAPTAIN_ID, false])
    const consent = callsMatching('INSERT INTO consent_records')[0][1] as unknown[]
    expect(consent.slice(2, 4)).toEqual(['captain_whatsapp', false])
    expect(consent[6]).toBe(OTHER_CAPTAIN_ID)
  })
})

describe('getConsentStatus', () => {
  it('shows the marketing box once to members who have not seen it and are not opted in', async () => {
    routeQueries([["FROM policy_documents", [policyRow('privacy-members', '1.0')]]])
    const agreed = new Date().toISOString()
    expect(await getConsentStatus({ privacy_accepted_at: agreed })).toMatchObject({ needs_consent: false, needs_marketing_prompt: true })
    expect(await getConsentStatus({ privacy_accepted_at: agreed, marketing_prompt_seen_at: agreed })).toMatchObject({
      needs_marketing_prompt: false,
    })
    expect(await getConsentStatus({ privacy_accepted_at: agreed, marketing_opt_in: true })).toMatchObject({ needs_marketing_prompt: false })
  })
})

describe('policy and settings validation', () => {
  const draft = {
    version: '1.1',
    title: 'Privacy',
    lastUpdated: '2026-11-12',
    sections: [{ title: 'What we collect', paragraphs: ['Name', ''], table: { headers: ['A', 'B'], rows: [['1', '2', '3'], []] } }],
  }

  it('accepts a draft and cleans its sections', () => {
    const result = validatePolicyDraft(draft)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.sections[0]).toEqual({
      id: 'section-1',
      title: 'What we collect',
      paragraphs: ['Name'],
      table: { headers: ['A', 'B'], rows: [['1', '2']] },
    })
  })

  it('rejects drafts without a version, date or sections', () => {
    expect(validatePolicyDraft({ ...draft, version: '' })).toHaveProperty('error')
    expect(validatePolicyDraft({ ...draft, lastUpdated: 'soon' })).toHaveProperty('error')
    expect(validatePolicyDraft({ ...draft, sections: [] })).toHaveProperty('error')
  })

  it('keeps retention months in range and checkbox wording non-empty', () => {
    expect(validatePrivacySettings({ coach_app_retention_months: 12, unknown_key: 'x' })).toEqual({ coach_app_retention_months: 12 })
    expect(validatePrivacySettings({ coach_app_retention_months: 0 })).toHaveProperty('error')
    expect(validatePrivacySettings({ box1_text: '   ' })).toHaveProperty('error')
    expect(validatePrivacySettings({ show_ticket_photo_notice: 'yes' })).toEqual({ show_ticket_photo_notice: false })
  })
})

describe('consent gate in authMiddleware', () => {
  const SECRET = 'test-secret'
  const token = (role: string) => jwt.sign({ id: USER_ID, email: 'a@b.c', role }, SECRET)
  const run = async (role: string, url: string, acceptedAt: string | null, materialAt: string | null) => {
    process.env.JWT_SECRET = SECRET
    routeQueries([
      ['SELECT password_changed_at', [{ password_changed_at: null, deletion_requested_at: null, privacy_accepted_at: acceptedAt }]],
      ['MAX(published_at)', [{ at: materialAt }]],
    ])
    const req = { headers: { authorization: `Bearer ${token(role)}` }, originalUrl: url } as any
    const res = makeRes()
    const next = vi.fn()
    await authMiddleware(req, res, next)
    return { res, next }
  }

  it('exempts auth, policy and privacy paths, admins and scanners', () => {
    expect(isConsentExempt('/api/auth/consent', 'member')).toBe(true)
    expect(isConsentExempt('/api/policies/terms', 'member')).toBe(true)
    expect(isConsentExempt('/api/me/privacy/export', 'member')).toBe(true)
    expect(isConsentExempt('/api/tickets', 'admin')).toBe(true)
    expect(isConsentExempt('/api/tickets', 'scanner')).toBe(true)
    expect(isConsentExempt('/api/tickets', 'captain')).toBe(false)
  })

  it('returns 428 for a member who never agreed', async () => {
    const { res, next } = await run('member', '/api/tickets/my', null, null)
    expect(res.status).toHaveBeenCalledWith(428)
    expect(res.json.mock.calls[0][0].code).toBe('CONSENT_REQUIRED')
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 428 after a big change and lets members through otherwise', async () => {
    const before = await run('member', '/api/tickets/my', '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z')
    expect(before.res.status).toHaveBeenCalledWith(428)
    clearMaterialCache()
    const after = await run('member', '/api/tickets/my', '2026-11-02T00:00:00Z', '2026-11-01T00:00:00Z')
    expect(after.next).toHaveBeenCalled()
  })

  it('never blocks the consent endpoint itself', async () => {
    const { next } = await run('member', '/api/auth/consent', null, null)
    expect(next).toHaveBeenCalled()
  })
})

describe('retention', () => {
  it('deletes due coach applications with their video and CV', async () => {
    routeQueries([
      ['FROM privacy_settings', []],
      ['SELECT id FROM coach_applications', [{ id: 'app-1' }]],
      ['DELETE FROM coach_applications', [{ video_source: 'upload', video_public_id: 'v1', cv_public_id: 'cv1' }]],
    ])
    expect(await purgeExpiredApplications(new Date('2026-11-12T00:00:00Z'))).toBe(1)
    expect(callsMatching('SELECT id FROM coach_applications')[0][1]).toEqual([new Date('2026-11-12T00:00:00Z'), 24])
    expect(deleteVideo).toHaveBeenCalledWith('v1')
    expect(deletePublicRaw).toHaveBeenCalledWith('cv1')
  })

  it('anonymises deleted accounts a day inside the promised limit', async () => {
    routeQueries([
      ['FROM privacy_settings', [{ key: 'account_delete_grace_days', value: 30 }]],
      ['deletion_requested_at IS NOT NULL', [{ id: USER_ID }]],
    ])
    expect(await anonymiseDeletedAccounts()).toBe(1)
    expect(callsMatching('deletion_requested_at IS NOT NULL')[0][1]?.[1]).toBe(29)
    const scrub = callsMatching("UPDATE users SET name = 'Deleted member'")
    expect(scrub[0][1]).toEqual([USER_ID])
  })
})

describe('buildMemberExport', () => {
  it('leaves out secrets and reports sections that failed', async () => {
    vi.mocked(query).mockImplementation((async (sql: string) => {
      if (sql.includes('FROM users WHERE id')) return rows([{ id: USER_ID, name: 'Amina', password_hash: 'x', google_id: 'g' }])
      if (sql.includes('FROM member_votes')) throw new Error('missing table')
      return rows([])
    }) as any)
    const data = await buildMemberExport(USER_ID)
    expect(data.account).toEqual({ id: USER_ID, name: 'Amina' })
    expect(data.unavailable_sections).toEqual(['votes'])
  })
})

describe('deleteMyAccount', () => {
  const req = (body: Record<string, unknown>) => ({ user: { id: USER_ID }, body, ip: '1.2.3.4' }) as any

  it('needs the right password', async () => {
    routeQueries([['SELECT role, password_hash', [{ role: 'member', password_hash: 'hash', deletion_requested_at: null }]]])
    const res = makeRes()
    await deleteMyAccount(req({ password: 'wrong' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(callsMatching('deletion_requested_at = NOW()').length).toBe(0)
  })

  it('leaves captain accounts to the admin team', async () => {
    routeQueries([['SELECT role, password_hash', [{ role: 'captain', password_hash: 'hash', deletion_requested_at: null }]]])
    const res = makeRes()
    await deleteMyAccount(req({ password: 'right-password' }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('locks the account, stops WhatsApp sharing and marketing, and logs both', async () => {
    routeQueries([
      ['SELECT role, password_hash', [{ role: 'member', password_hash: 'hash', deletion_requested_at: null }]],
      ['UPDATE captain_whatsapp_shares', [{ captain_id: CAPTAIN_ID }]],
      ['FROM privacy_settings', []],
    ])
    const res = makeRes()
    await deleteMyAccount(req({ password: 'right-password' }), res)
    expect(res.json).toHaveBeenCalledWith({ ok: true, delete_within_days: 30 })
    expect(callsMatching('deletion_requested_at = NOW()').length).toBe(1)
    const consents = callsMatching('INSERT INTO consent_records').map(([, p]) => (p as unknown[]).slice(2, 4))
    expect(consents).toEqual([
      ['captain_whatsapp', false],
      ['marketing_email', false],
    ])
  })

  it('accepts DELETE from Google-only accounts', async () => {
    routeQueries([['SELECT role, password_hash', [{ role: 'member', password_hash: null, deletion_requested_at: null }]]])
    const res = makeRes()
    await deleteMyAccount(req({ confirm: 'DELETE' }), res)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })
})

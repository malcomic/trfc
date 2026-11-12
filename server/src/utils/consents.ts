import { createHash } from 'crypto'
import type { PoolClient } from 'pg'
import { query } from '../config/db.js'
import { currentPolicyVersion, latestMaterialChangeAt, needsConsent } from './policies.js'

type Queryable = Pick<PoolClient, 'query'>

const defaultDb: Queryable = { query: query as unknown as Queryable['query'] }

export type ConsentType = 'terms_privacy' | 'age_18_plus' | 'marketing_email' | 'applicant_privacy' | 'captain_whatsapp'
export type ConsentSource =
  | 'signup'
  | 'google_signup'
  | 'login_prompt'
  | 'settings'
  | 'unsubscribe_link'
  | 'coach_form'
  | 'account_deleted'

export class ConsentError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export const hashIp = (ip: string | undefined | null) => (ip ? createHash('sha256').update(ip).digest('hex') : null)

export interface ConsentInput {
  userId?: string | null
  applicationId?: string | null
  type: ConsentType
  granted: boolean
  policySlug?: string | null
  policyVersion?: string | null
  captainId?: string | null
  source: ConsentSource
  ipHash?: string | null
}

export async function recordConsent(input: ConsentInput, db: Queryable = defaultDb) {
  await db.query(
    `INSERT INTO consent_records
       (user_id, coach_application_id, consent_type, granted, policy_slug, policy_version, captain_id, source, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.userId ?? null,
      input.applicationId ?? null,
      input.type,
      input.granted,
      input.policySlug ?? null,
      input.policyVersion ?? null,
      input.captainId ?? null,
      input.source,
      input.ipHash ?? null,
    ]
  )
}

export interface SignupConsentBody {
  acceptTerms?: unknown
  ageConfirmed?: unknown
  policyVersion?: unknown
}

/**
 * Box 1 and the 18+ box are required, and the version must be the one currently published,
 * so nobody agrees to a page they did not see. Returns the version agreed to.
 */
export async function checkSignupConsent(body: SignupConsentBody): Promise<string> {
  if (body.acceptTerms !== true) {
    throw new ConsentError('Please tick the box to agree to the Terms and the Privacy and Confidentiality Terms')
  }
  if (body.ageConfirmed !== true) {
    throw new ConsentError('You must be 18 or older to create an account')
  }
  const current = await currentPolicyVersion('privacy-members')
  if (!current) throw new ConsentError('The privacy terms are not available right now. Please try again.', 503)
  if (body.policyVersion !== current) {
    throw new ConsentError('The Privacy and Confidentiality Terms were just updated. Please reload the page and agree to the new version.', 409)
  }
  return current
}

/** Saves Box 1 and the 18+ box for a user. */
export async function acceptPrivacy(
  userId: string,
  opts: { version: string; source: ConsentSource; ipHash?: string | null; marketingPromptSeen?: boolean },
  db: Queryable = defaultDb
) {
  await db.query(
    `UPDATE users SET privacy_version_accepted = $1, privacy_accepted_at = NOW(),
       age_confirmed_at = COALESCE(age_confirmed_at, NOW()),
       marketing_prompt_seen_at = CASE WHEN $3 THEN COALESCE(marketing_prompt_seen_at, NOW()) ELSE marketing_prompt_seen_at END
     WHERE id = $2`,
    [opts.version, userId, opts.marketingPromptSeen === true]
  )
  const termsVersion = await currentPolicyVersion('terms')
  await recordConsent(
    { userId, type: 'terms_privacy', granted: true, policySlug: 'privacy-members', policyVersion: opts.version, source: opts.source, ipHash: opts.ipHash },
    db
  )
  if (termsVersion) {
    await recordConsent(
      { userId, type: 'terms_privacy', granted: true, policySlug: 'terms', policyVersion: termsVersion, source: opts.source, ipHash: opts.ipHash },
      db
    )
  }
  await recordConsent({ userId, type: 'age_18_plus', granted: true, source: opts.source, ipHash: opts.ipHash }, db)
}

/** Sets the marketing email choice and logs it. Promotion senders read users.marketing_opt_in at send time, so a withdrawal stops them at once. */
export async function setMarketing(
  userId: string,
  on: boolean,
  opts: { source: ConsentSource; ipHash?: string | null },
  db: Queryable = defaultDb
) {
  const version = await currentPolicyVersion('privacy-members')
  await db.query(
    `UPDATE users
     SET marketing_opt_in_at = CASE WHEN $1 THEN COALESCE(CASE WHEN marketing_opt_in THEN marketing_opt_in_at END, NOW()) ELSE NULL END,
         marketing_opt_in = $1,
         marketing_prompt_seen_at = COALESCE(marketing_prompt_seen_at, NOW())
     WHERE id = $2`,
    [on, userId]
  )
  await recordConsent(
    { userId, type: 'marketing_email', granted: on, policySlug: 'privacy-members', policyVersion: version, source: opts.source, ipHash: opts.ipHash },
    db
  )
}

/** Captains in the member's zone (zone they were referred to, else their captain's zone), assigned captain first. */
export async function listMemberCaptains(memberId: string) {
  const result = await query(
    `WITH me AS (
       SELECT u.id, u.captain_id, COALESCE(u.referred_by_region_id, oc.region_id) AS zone_id
       FROM users u LEFT JOIN captains oc ON oc.user_id = u.captain_id
       WHERE u.id = $1
     )
     SELECT c.user_id AS id, cu.name, r.name AS zone, c.photo_url,
            (c.user_id = me.captain_id) AS is_my_captain,
            COALESCE(s.enabled, false) AS whatsapp_shared
     FROM me
     JOIN captains c ON c.status = 'active' AND (c.region_id = me.zone_id OR c.user_id = me.captain_id)
     JOIN users cu ON cu.id = c.user_id
     JOIN regions r ON r.id = c.region_id
     LEFT JOIN captain_whatsapp_shares s ON s.member_id = me.id AND s.captain_id = c.user_id
     WHERE c.user_id <> me.id
     ORDER BY (c.user_id = me.captain_id) DESC, cu.name ASC`,
    [memberId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    name: (row.name ?? '').trim().split(/\s+/)[0] || 'Captain',
    zone: row.zone,
    photo_url: row.photo_url ?? null,
    is_my_captain: Boolean(row.is_my_captain),
    whatsapp_shared: Boolean(row.whatsapp_shared),
  }))
}

export async function setWhatsappShare(
  memberId: string,
  captainId: string,
  on: boolean,
  opts: { source: ConsentSource; ipHash?: string | null }
) {
  const captains = await listMemberCaptains(memberId)
  if (on && !captains.some((c) => c.id === captainId)) {
    throw new ConsentError('You can only share your WhatsApp with captains in your zone')
  }
  await query(
    `INSERT INTO captain_whatsapp_shares (member_id, captain_id, enabled, updated_at) VALUES ($1, $2, $3, NOW())
     ON CONFLICT (member_id, captain_id) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
    [memberId, captainId, on]
  )
  await recordConsent({
    userId: memberId,
    type: 'captain_whatsapp',
    granted: on,
    captainId,
    source: opts.source,
    ipHash: opts.ipHash,
  })
}

export interface ConsentStatus {
  needs_consent: boolean
  needs_marketing_prompt: boolean
  privacy_version: string | null
}

export async function getConsentStatus(row: {
  privacy_accepted_at?: Date | string | null
  marketing_prompt_seen_at?: Date | string | null
  marketing_opt_in?: boolean | null
}): Promise<ConsentStatus> {
  const [latest, version] = await Promise.all([latestMaterialChangeAt(), currentPolicyVersion('privacy-members')])
  return {
    needs_consent: needsConsent(row.privacy_accepted_at, latest),
    needs_marketing_prompt: !row.marketing_prompt_seen_at && !row.marketing_opt_in,
    privacy_version: version,
  }
}

export async function getConsentStatusForUser(userId: string): Promise<ConsentStatus> {
  const result = await query(
    'SELECT privacy_accepted_at, marketing_prompt_seen_at, marketing_opt_in FROM users WHERE id = $1',
    [userId]
  )
  return getConsentStatus(result.rows[0] ?? {})
}

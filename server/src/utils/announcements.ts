import jwt from 'jsonwebtoken'

export const ANNOUNCEMENT_KINDS = ['important', 'news'] as const
export const ANNOUNCEMENT_AUDIENCES = ['all', 'members', 'free'] as const
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number]
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number]

export const TITLE_MIN = 3
export const TITLE_MAX = 150
export const BODY_MAX = 5000
export const LINK_LABEL_MAX = 40
export const EMAILS_PER_TICK = 20

export function isAnnouncementKind(value: unknown): value is AnnouncementKind {
  return typeof value === 'string' && (ANNOUNCEMENT_KINDS as readonly string[]).includes(value)
}

export function isAnnouncementAudience(value: unknown): value is AnnouncementAudience {
  return typeof value === 'string' && (ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(value)
}

/** WHERE fragment for users aliased `u`. Same membership rule as membershipFrom in usersController. */
export function audienceSql(audience: AnnouncementAudience): string {
  if (audience === 'members') return 'u.member_until > NOW()'
  if (audience === 'free') return '(u.member_until IS NULL OR u.member_until <= NOW())'
  return 'TRUE'
}

/** News only reaches people who agreed to marketing messages; important notices reach everyone with an email. */
export function emailRecipientsSql(kind: AnnouncementKind): string {
  const hasEmail = "u.email IS NOT NULL AND TRIM(u.email) <> ''"
  return kind === 'news' ? `${hasEmail} AND u.marketing_opt_in = true` : hasEmail
}

/** Internal paths and https links only, so a link can never run script. */
export function isSafeAnnouncementLink(value: string): boolean {
  if (value.startsWith('/')) return !value.startsWith('//')
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export interface AnnouncementInput {
  title: string
  body: string
  linkUrl: string | null
  linkLabel: string | null
  kind: AnnouncementKind
  audience: AnnouncementAudience
  sendEmail: boolean
}

export function parseAnnouncementInput(raw: any): AnnouncementInput | string {
  const title = typeof raw?.title === 'string' ? raw.title.trim() : ''
  const body = typeof raw?.body === 'string' ? raw.body.trim() : ''
  const linkUrl = typeof raw?.link_url === 'string' ? raw.link_url.trim() : ''
  const linkLabel = typeof raw?.link_label === 'string' ? raw.link_label.trim() : ''

  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return `The title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`
  }
  if (!body) return 'Write a message'
  if (body.length > BODY_MAX) return `The message must be ${BODY_MAX} characters or fewer`
  if (!isAnnouncementKind(raw?.kind)) return 'Choose whether this is an important notice or news'
  if (!isAnnouncementAudience(raw?.audience)) return 'Choose who should get this announcement'
  if (linkUrl || linkLabel) {
    if (!linkUrl || !isSafeAnnouncementLink(linkUrl)) {
      return 'The button link must start with https:// or be a page on the site, like /events'
    }
    if (!linkLabel) return 'Add a label for the button'
    if (linkLabel.length > LINK_LABEL_MAX) return `The button label must be ${LINK_LABEL_MAX} characters or fewer`
  }

  return {
    title,
    body,
    linkUrl: linkUrl || null,
    linkLabel: linkUrl ? linkLabel : null,
    kind: raw.kind,
    audience: raw.audience,
    sendEmail: raw?.send_email === true,
  }
}

interface UnsubscribePayload {
  scope: 'marketing-unsubscribe'
  sub: string
}

// A separate secret keeps unsubscribe links from being accepted as login tokens.
function unsubscribeSecret(): string {
  return `${process.env.JWT_SECRET || ''}:unsubscribe`
}

export function signUnsubscribeToken(userId: string): string {
  const payload: UnsubscribePayload = { scope: 'marketing-unsubscribe', sub: userId }
  return jwt.sign(payload, unsubscribeSecret(), { expiresIn: '365d' })
}

/** Returns the user id the link was issued for, or null if it is invalid or expired. */
export function verifyUnsubscribeToken(token: unknown): string | null {
  if (typeof token !== 'string' || !token) return null
  try {
    const decoded = jwt.verify(token, unsubscribeSecret()) as Partial<UnsubscribePayload>
    if (decoded?.scope !== 'marketing-unsubscribe' || typeof decoded.sub !== 'string') return null
    return decoded.sub
  } catch {
    return null
  }
}

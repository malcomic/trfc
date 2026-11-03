import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({
  query: vi.fn(),
}))
vi.mock('../../utils/emailService.js', () => ({
  sendEmail: vi.fn(async () => ({ success: true, messageId: 'm1' })),
}))
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(async () => 'hashed'), compare: vi.fn() },
}))
vi.mock('../../utils/tokenUtils.js', () => ({
  generateAccessToken: vi.fn(() => 'access'),
  generateRefreshToken: vi.fn(() => 'refresh'),
  verifyRefreshToken: vi.fn(),
  isTokenStale: vi.fn(() => false),
}))
vi.mock('../../utils/accountWelcome.js', () => ({
  sendAccountWelcomeOnce: vi.fn(async () => false),
}))

import { query } from '../../config/db.js'
import { sendEmail } from '../../utils/emailService.js'
import { sendWelcomeEmailOnce } from '../../utils/welcomeEmail.js'
import { register } from '../../controllers/authController.js'
import {
  FREE_ACCOUNT_WELCOME_SUBJECT,
  buildFreeAccountWelcomeEmailHTML,
  buildFreeAccountWelcomeEmailText,
  siteUrl,
} from '../../utils/emailTemplates.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const CREATED = { id: USER_ID, name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712345678', role: 'member' }
const BODY = { name: 'Jane Wanjiku', email: 'jane@example.com', phone: '0712345678', password: 'password123' }

const callsMatching = (fragment: string) =>
  vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes(fragment))
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function mockDb(claimed: Record<string, unknown> | null) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('SET welcome_email_sent_at = NOW()')) return { rows: claimed ? [claimed] : [] }
    if (sql.includes('INSERT INTO users')) return { rows: [CREATED] }
    return { rows: [] }
  }) as any)
}

describe('free account welcome email content', () => {
  it('greets by first name and links to the dashboard', () => {
    const html = buildFreeAccountWelcomeEmailHTML({ name: 'Jane Wanjiku' })
    const text = buildFreeAccountWelcomeEmailText({ name: 'Jane Wanjiku' })

    expect(FREE_ACCOUNT_WELCOME_SUBJECT).toBe('Welcome to TRFC, your free account is ready')
    expect(html).toContain('Hello Jane,')
    expect(html).toContain(siteUrl('/dashboard'))
    expect(text).toContain('Hello Jane,')
    expect(text).toContain(`Go to my dashboard: ${siteUrl('/dashboard')}`)
    expect(text).toContain('•  Lipa pole pole, so you can pay for an event in parts')
    expect(text).toContain('Couch to 5K opens in January 2027.')
    expect(text).toContain('Your account stays free. You never have to upgrade to keep it.')
  })

  it('escapes the name in HTML', () => {
    expect(buildFreeAccountWelcomeEmailHTML({ name: '<b>Jane</b>' })).not.toContain('<b>Jane</b>')
  })
})

describe('sendWelcomeEmailOnce', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(sendEmail).mockResolvedValue({ success: true, messageId: 'm1' })
  })

  it('sends to the account email and keeps the claim', async () => {
    mockDb({ name: 'Jane Wanjiku', email: 'jane@example.com' })
    expect(await sendWelcomeEmailOnce(USER_ID)).toBe(true)

    expect(sendEmail).toHaveBeenCalledTimes(1)
    const options = vi.mocked(sendEmail).mock.calls[0][0]
    expect(options.to).toBe('jane@example.com')
    expect(options.subject).toBe(FREE_ACCOUNT_WELCOME_SUBJECT)
    expect(callsMatching('WHERE id = $1 AND welcome_email_sent_at IS NULL')).toHaveLength(1)
    expect(callsMatching('SET welcome_email_sent_at = NULL')).toHaveLength(0)
  })

  it('does not send when already sent or the account has no email', async () => {
    mockDb(null)
    expect(await sendWelcomeEmailOnce(USER_ID)).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('releases the claim when the send fails so it can be retried', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({ success: false, error: 'smtp down' })
    mockDb({ name: 'Jane', email: 'jane@example.com' })
    expect(await sendWelcomeEmailOnce(USER_ID)).toBe(false)
    expect(callsMatching('SET welcome_email_sent_at = NULL')).toHaveLength(1)
  })

  it('never throws', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('db down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await sendWelcomeEmailOnce(USER_ID)).toBe(false)
    errorSpy.mockRestore()
  })
})

describe('register sends the welcome email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends after creating the account', async () => {
    mockDb({ name: 'Jane Wanjiku', email: 'jane@example.com' })
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    await register({ body: BODY } as any, res)
    await flush()

    expect(res.status).toHaveBeenCalledWith(201)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe('jane@example.com')
  })

  it('a failing email does not break registration', async () => {
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error('smtp down'))
    mockDb({ name: 'Jane Wanjiku', email: 'jane@example.com' })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any
    await register({ body: BODY } as any, res)
    await flush()

    expect(res.status).toHaveBeenCalledWith(201)
    errorSpy.mockRestore()
  })
})

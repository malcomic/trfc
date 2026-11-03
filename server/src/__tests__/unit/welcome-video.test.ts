import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/db.js', () => ({ query: vi.fn(), getClient: vi.fn() }))

import { query } from '../../config/db.js'
import {
  WELCOME_VIDEO_DAYS,
  WELCOME_VIDEO_MAX_SHOWS,
  markWelcomeVideoWatched,
  recordWelcomeVideoShown,
} from '../../controllers/welcomeVideoController.js'

const USER_ID = '22222222-2222-4222-8222-222222222222'
const VIDEO = {
  slot: 'dashboard_welcome',
  source: 'upload',
  provider: 'file',
  video_url: 'https://res.cloudinary.com/demo/video/upload/v1/trfc_gallery/welcome.mp4',
  poster_url: null,
  updated_at: '2026-11-01',
}

const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() }) as any
const req = { user: { id: USER_ID } } as any
const updateCalls = () => vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes('UPDATE users'))

function mockDb({ video, counted }: { video: typeof VIDEO | null; counted: number | null }) {
  vi.mocked(query).mockImplementation((async (sql: string) => {
    if (sql.includes('FROM page_videos')) return { rows: video ? [video] : [] }
    if (sql.includes('welcome_video_shows + 1')) return { rows: counted == null ? [] : [{ welcome_video_shows: counted }] }
    return { rows: [] }
  }) as any)
}

describe('recordWelcomeVideoShown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not show or count anything when no welcome video is set', async () => {
    mockDb({ video: null, counted: 1 })
    const res = makeRes()
    await recordWelcomeVideoShown(req, res)

    expect(res.json).toHaveBeenCalledWith({ show: false })
    expect(updateCalls()).toHaveLength(0)
  })

  it('counts the showing and returns the video for an eligible member', async () => {
    mockDb({ video: VIDEO, counted: 2 })
    const res = makeRes()
    await recordWelcomeVideoShown(req, res)

    expect(res.json).toHaveBeenCalledWith({ show: true, video: VIDEO, showsUsed: 2 })
    const [sql, params] = updateCalls()[0]
    expect(String(sql)).toContain('welcome_video_done_at IS NULL')
    expect(String(sql)).toContain('welcome_video_shows < $2')
    expect(String(sql)).toContain('make_interval(days => $3)')
    expect(params).toEqual([USER_ID, WELCOME_VIDEO_MAX_SHOWS, WELCOME_VIDEO_DAYS])
    expect([WELCOME_VIDEO_MAX_SHOWS, WELCOME_VIDEO_DAYS]).toEqual([3, 14])
  })

  it('does not show once the member is no longer eligible', async () => {
    mockDb({ video: VIDEO, counted: null })
    const res = makeRes()
    await recordWelcomeVideoShown(req, res)

    expect(res.json).toHaveBeenCalledWith({ show: false })
  })

  it('returns 500 when the database fails', async () => {
    vi.mocked(query).mockRejectedValueOnce(new Error('db down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = makeRes()
    await recordWelcomeVideoShown(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    errorSpy.mockRestore()
  })
})

describe('markWelcomeVideoWatched', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(query).mockResolvedValue({ rows: [] } as any)
  })

  it('marks the welcome video as done for the member, only once', async () => {
    const res = makeRes()
    await markWelcomeVideoWatched(req, res)

    const [sql, params] = updateCalls()[0]
    expect(String(sql)).toContain('SET welcome_video_done_at = NOW()')
    expect(String(sql)).toContain('welcome_video_done_at IS NULL')
    expect(params).toEqual([USER_ID])
    expect(res.json).toHaveBeenCalledWith({ ok: true })
  })
})

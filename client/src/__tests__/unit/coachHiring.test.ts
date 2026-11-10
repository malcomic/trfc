import { describe, it, expect } from 'vitest'
import {
  EMPTY_FORM,
  MAX_CV_BYTES,
  MAX_VIDEO_BYTES,
  cvFileProblem,
  toSubmission,
  validateApplication,
  videoFileProblem,
  withHttps,
  type ApplicationForm,
} from '../../content/coachHiring'
import { hiringFiltersFromParams, hiringFiltersToParams } from '../../components/admin/hiring/hiringParams'
import { hoursLabel } from '../../components/admin/hiring/hiringDisplay'

const FILLED: ApplicationForm = {
  ...EMPTY_FORM,
  fullName: 'Jane Wanjiru',
  phone: '0712 345 678',
  email: 'jane@example.com',
  location: 'Roysambu',
  socialUrl: 'instagram.com/jane',
  experience: 'Two years coaching',
  canGive3Hours: true,
  hours: ['morning'],
  workedHarder: 'Marathon on night shifts',
  videoSource: 'link',
  linkUrl: 'youtu.be/abcdefghijk',
  agreeStandards: true,
  agreeStorage: true,
}

describe('validateApplication', () => {
  it('passes a filled form', () => {
    expect(validateApplication(FILLED)).toEqual({})
  })

  it('flags every empty answer', () => {
    expect(Object.keys(validateApplication(EMPTY_FORM)).sort()).toEqual(
      [
        'agreeStandards',
        'agreeStorage',
        'canGive3Hours',
        'email',
        'experience',
        'fullName',
        'hours',
        'location',
        'phone',
        'socialUrl',
        'video',
        'workedHarder',
      ].sort()
    )
  })

  it('treats No as an answer to the 3 hours question', () => {
    expect(validateApplication({ ...FILLED, canGive3Hours: false })).toEqual({})
  })

  it('needs the upload to finish when uploading', () => {
    expect(validateApplication({ ...FILLED, videoSource: 'upload' })).toHaveProperty('video')
    expect(validateApplication({ ...FILLED, videoSource: 'upload', uploadUrl: 'https://res.cloudinary.com/x/video/upload/a.mp4' })).toEqual({})
  })

  it('rejects a phone that is not Kenyan', () => {
    expect(validateApplication({ ...FILLED, phone: '12345' })).toHaveProperty('phone')
  })
})

describe('videoFileProblem', () => {
  it('accepts phone videos by type or extension', () => {
    expect(videoFileProblem({ name: 'clip.mov', type: 'video/quicktime', size: 20_000_000 })).toBeNull()
    expect(videoFileProblem({ name: 'clip.3gp', type: '', size: 20_000_000 })).toBeNull()
  })

  it('rejects other files and anything over the limit', () => {
    expect(videoFileProblem({ name: 'cv.pdf', type: 'application/pdf', size: 1000 })).toMatch(/video file/)
    expect(videoFileProblem({ name: 'long.mp4', type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 })).toMatch(/150 MB/)
  })
})

describe('cvFileProblem', () => {
  it('accepts PDF and Word files up to 5 MB', () => {
    expect(cvFileProblem({ name: 'Jane CV.PDF', size: 200_000 })).toBeNull()
    expect(cvFileProblem({ name: 'cv.docx', size: MAX_CV_BYTES })).toBeNull()
    expect(cvFileProblem({ name: 'cv.doc', size: 1000 })).toBeNull()
  })

  it('rejects other files and anything over the limit', () => {
    expect(cvFileProblem({ name: 'cv.jpg', size: 1000 })).toMatch(/PDF or Word/)
    expect(cvFileProblem({ name: 'cv.pdf', size: MAX_CV_BYTES + 1 })).toMatch(/5 MB/)
  })
})

describe('toSubmission', () => {
  it('adds https to links and sends only the chosen video', () => {
    const payload = toSubmission(
      { ...FILLED, uploadUrl: 'https://res.cloudinary.com/x/video/upload/a.mp4', uploadPublicId: 'trfc_coach_videos/a' },
      { submissionKey: 'key-12345678', startedAt: 1, website: '' }
    )
    expect(payload.socialUrl).toBe('https://instagram.com/jane')
    expect(payload.video).toEqual({ source: 'link', url: 'https://youtu.be/abcdefghijk' })
    expect(payload.submissionKey).toBe('key-12345678')
    expect(payload.cv).toBeNull()
  })

  it('sends the CV only when one was uploaded', () => {
    const cv = { url: 'https://res.cloudinary.com/x/raw/upload/trfc_coach_cvs/a.pdf', publicId: 'trfc_coach_cvs/a.pdf', fileName: 'cv.pdf' }
    const payload = toSubmission(
      { ...FILLED, cvUrl: cv.url, cvPublicId: cv.publicId, cvFileName: cv.fileName },
      { submissionKey: 'key-12345678', startedAt: 1, website: '' }
    )
    expect(payload.cv).toEqual(cv)
  })

  it('withHttps upgrades http and leaves blanks empty', () => {
    expect(withHttps('http://tiktok.com/@me')).toBe('https://tiktok.com/@me')
    expect(withHttps('  ')).toBe('')
  })
})

describe('admin hiring helpers', () => {
  it('reads valid filters from the address bar and drops the rest', () => {
    const params = new URLSearchParams('status=accepted&hours=night&threeHours=yes&from=2026-11-01&to=bad&q=%20jane%20&id=abc')
    const filters = hiringFiltersFromParams(params)
    expect(filters).toEqual({ status: 'accepted', threeHours: 'yes', from: '2026-11-01', q: 'jane' })
    expect(hiringFiltersToParams(filters).toString()).toBe('status=accepted&q=jane&threeHours=yes&from=2026-11-01')
  })

  it('labels hours in day order', () => {
    expect(hoursLabel(['evening', 'morning'])).toBe('Morning, Evening')
    expect(hoursLabel([])).toBe('-')
  })
})

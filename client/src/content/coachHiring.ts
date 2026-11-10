import { toKenyanMsisdn } from '../utils/phone'

export const COACH_HIRING_PATH = '/coach-with-us'
export const APPLY_ANCHOR = 'apply'
export const STANDARDS_ANCHOR = 'standards'

export const COACH_HIRING_COPY = {
  documentTitle: 'Coach with us | Thika Road Fitness Community',
  bar: { title: 'Coach with TRFC', cta: 'Apply now' },
  hero: {
    badge: 'Now hiring online coaches',
    heading: 'Coaches who are ready to outwork themselves,',
    headingAccent: 'we are hiring.',
    body: 'Help us run the new TRFC programs for our community, and learn how to build an online fitness career while you do it.',
    cta: 'See if you are a fit',
    note: 'No log in needed. It takes about 10 minutes and a 1 minute video.',
  },
  doAndLearn: {
    eyebrow: 'The job',
    heading: 'What you will do, and what you will learn',
    do: {
      title: 'What you will do',
      items: [
        'Coach TRFC members through our programs online, starting in January 2027.',
        'Check in on your members every day inside the app and in your program groups, and answer their questions.',
        'Keep members on track with their weekly tasks and tracking sheets.',
        'Work with the Head Coach and the zone captains to keep every member moving.',
        'Share honest feedback with the team so the programs get better.',
      ],
    },
    learn: {
      title: 'What you will learn',
      items: [
        'How to coach members through a real program, week after week.',
        'The fitness side: training, food, recovery and keeping members consistent.',
        'The business side of starting an online fitness career: how to find members, how to keep them, and how to make a living from coaching.',
      ],
    },
    earn: {
      title: 'What you can earn',
      body: "Coaches with a full group can earn about KSh 20,000 to 30,000 a month, plus performance bonuses. Your pay grows with the size of your group and your members' results.",
    },
  },
  standards: {
    eyebrow: 'The standard',
    heading: 'Our coaches are people who',
    intro: 'If this sounds like you, apply.',
    items: [
      { title: 'You outwork yourself.', body: 'You beat the version of you from yesterday, every single day.' },
      { title: 'You put in the hours.', body: 'At least 3 hours a day. When you say you will do it, you do it.' },
      {
        title: 'You want to learn.',
        body: 'You are here to learn a lot, on the fitness side and on the business side of starting an online fitness career.',
      },
      { title: 'You play the long game.', body: 'You want to make a living from coaching, and you know that takes time and hard work.' },
      { title: 'You take feedback.', body: 'When we show you a better way, you use it.' },
    ],
  },
  howWeChoose: {
    eyebrow: 'How we choose',
    heading: 'Three steps, and we tell you where you stand',
    steps: [
      'You fill in the form and send a 1 minute video.',
      'We talk about your goals, your experience and your time.',
      'We talk about how you work and how you handle feedback.',
    ],
    footer:
      'We expect at least 3 hours a day, every day you are on the team, and the standards on this page. We respect your time at every step.',
  },
  form: {
    heading: 'Apply now',
    intro: 'Fill in the form and send your 1 minute video. We read every one.',
    submit: 'Submit my application',
    sending: 'Sending...',
    uploading: 'Wait for the video to finish uploading',
    uploadingCv: 'Wait for your CV to finish uploading',
  },
  thanks: {
    heading: 'Thank you. We read every application.',
    body: 'We have sent a confirmation to your email. Keep an eye on WhatsApp and your inbox.',
    cta: 'Back to the home page',
  },
}

export const HOUR_OPTIONS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
] as const
export type HourOption = (typeof HOUR_OPTIONS)[number]['id']

export const MAX_VIDEO_BYTES = 150 * 1024 * 1024
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,video/3gpp,video/x-m4v,.mp4,.mov,.webm,.3gp,.m4v'
const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|3gp|m4v)$/i
const VIDEO_MIME = /^video\/(mp4|quicktime|webm|3gpp|x-m4v)$/

export const MAX_CV_BYTES = 5 * 1024 * 1024
export const CV_ACCEPT =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const CV_EXTENSIONS = /\.(pdf|docx?)$/i

export type VideoSource = 'upload' | 'link'

export interface ApplicationForm {
  fullName: string
  phone: string
  email: string
  location: string
  socialUrl: string
  experience: string
  canGive3Hours: boolean | null
  hours: HourOption[]
  workedHarder: string
  videoSource: VideoSource
  uploadUrl: string
  uploadPublicId: string
  linkUrl: string
  cvUrl: string
  cvPublicId: string
  cvFileName: string
  agreeStandards: boolean
  agreeStorage: boolean
}

export const EMPTY_FORM: ApplicationForm = {
  fullName: '',
  phone: '',
  email: '',
  location: '',
  socialUrl: '',
  experience: '',
  canGive3Hours: null,
  hours: [],
  workedHarder: '',
  videoSource: 'upload',
  uploadUrl: '',
  uploadPublicId: '',
  linkUrl: '',
  cvUrl: '',
  cvPublicId: '',
  cvFileName: '',
  agreeStandards: false,
  agreeStorage: false,
}

export type FormErrors = Partial<Record<keyof ApplicationForm | 'video' | 'cv' | 'form', string>>

const LONG_TEXT_MAX = 3000
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Adds https:// to links typed without it, e.g. "instagram.com/me". */
export function withHttps(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://')
  return `https://${value}`
}

export function isHttpsLink(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' && url.hostname.includes('.')
  } catch {
    return false
  }
}

export function validateApplication(form: ApplicationForm): FormErrors {
  const errors: FormErrors = {}
  if (!form.fullName.trim()) errors.fullName = 'Please add your full name'
  if (!toKenyanMsisdn(form.phone)) errors.phone = 'Enter a valid WhatsApp number, e.g. 0712 345 678'
  if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = 'Enter a valid email address'
  if (!form.location.trim()) errors.location = 'Please add where you are based'
  if (!isHttpsLink(withHttps(form.socialUrl))) errors.socialUrl = 'Please add a link to your Instagram, TikTok or Facebook'
  if (!form.experience.trim()) errors.experience = 'Please tell us about your coaching'
  else if (form.experience.length > LONG_TEXT_MAX) errors.experience = `Keep this under ${LONG_TEXT_MAX} characters`
  if (form.canGive3Hours === null) errors.canGive3Hours = 'Please choose Yes or No'
  if (form.hours.length === 0) errors.hours = 'Tick at least one time of day'
  if (!form.workedHarder.trim()) errors.workedHarder = 'Please tell us your story'
  else if (form.workedHarder.length > LONG_TEXT_MAX) errors.workedHarder = `Keep this under ${LONG_TEXT_MAX} characters`
  if (form.videoSource === 'upload' && !form.uploadUrl) errors.video = 'Please upload your 1 minute video'
  if (form.videoSource === 'link' && !isHttpsLink(withHttps(form.linkUrl))) errors.video = 'Paste a full link to your video'
  if (!form.agreeStandards) errors.agreeStandards = 'Please confirm you will follow the coach standards'
  if (!form.agreeStorage) errors.agreeStorage = 'Please agree so we can keep your details for hiring'
  return errors
}

/** Null when the file can be uploaded, otherwise the message to show. */
export function videoFileProblem(file: { name: string; type: string; size: number }): string | null {
  if (!VIDEO_MIME.test(file.type) && !VIDEO_EXTENSIONS.test(file.name)) {
    return 'Please choose a video file (MP4, MOV, WebM or 3GP)'
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return 'That video is over 150 MB. Trim it to about 1 minute, or upload it somewhere and paste the link.'
  }
  return null
}

/** Null when the CV can be uploaded, otherwise the message to show. */
export function cvFileProblem(file: { name: string; size: number }): string | null {
  if (!CV_EXTENSIONS.test(file.name)) return 'Please choose a PDF or Word file (.pdf, .doc or .docx)'
  if (file.size > MAX_CV_BYTES) return 'Your CV must be 5 MB or smaller'
  return null
}

export function toSubmission(form: ApplicationForm, extras: { submissionKey: string; startedAt: number; website: string }) {
  return {
    fullName: form.fullName.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    location: form.location.trim(),
    socialUrl: withHttps(form.socialUrl),
    experience: form.experience.trim(),
    canGive3Hours: form.canGive3Hours,
    hours: form.hours,
    workedHarder: form.workedHarder.trim(),
    video:
      form.videoSource === 'upload'
        ? { source: 'upload' as const, url: form.uploadUrl, publicId: form.uploadPublicId }
        : { source: 'link' as const, url: withHttps(form.linkUrl) },
    cv: form.cvUrl ? { url: form.cvUrl, publicId: form.cvPublicId, fileName: form.cvFileName } : null,
    agreeStandards: form.agreeStandards,
    agreeStorage: form.agreeStorage,
    ...extras,
  }
}

export type CoachApplicationPayload = ReturnType<typeof toSubmission>

export function scrollToAnchor(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

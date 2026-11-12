import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const authState: { user: any; updateUser: ReturnType<typeof vi.fn>; logout: ReturnType<typeof vi.fn>; login: ReturnType<typeof vi.fn> } = {
  user: null,
  updateUser: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
}
vi.mock('../../context/AuthContext', () => ({ useAuth: () => authState }))

vi.mock('../../api/policies', () => ({
  getPolicy: vi.fn(async () => ({ version: '1.0' })),
  getPublicPrivacySettings: vi.fn(async () => ({
    box1_text: 'I agree to the Terms and to how TRFC uses my information, as set out in the Privacy and Confidentiality Terms.',
    box2_text: 'Yes, email me about TRFC news.',
    age_box_text: 'I am 18 or older.',
    applicant_box_text: 'Applicant box',
    show_application_cookie_notice: false,
    application_cookie_notice: '',
  })),
}))

vi.mock('../../api/auth', () => ({
  acceptConsent: vi.fn(async () => ({ ok: true })),
  getUserProfile: vi.fn(async () => ({ id: 'u1', role: 'member', needs_consent: false, needs_marketing_prompt: false })),
  registerUser: vi.fn(async () => ({ token: 't', refreshToken: 'r', user: { id: 'u1' } })),
  completeGoogleSignup: vi.fn(),
}))

vi.mock('../../api/captains', () => ({
  getCaptainDirectory: vi.fn(async () => []),
  getReferrer: vi.fn(),
}))
vi.mock('../../api/zones', () => ({ getZones: vi.fn(async () => []) }))
vi.mock('../../components/auth/GoogleButton', () => ({ default: () => null, isGoogleEnabled: false }))
vi.mock('../../components/auth/useGoogleSignIn', () => ({
  useGoogleSignIn: () => ({ handleCredential: vi.fn(), handleGoogleError: vi.fn(), googleLoading: false, googleError: '' }),
  clearPendingGoogleSignup: vi.fn(),
}))

import { acceptConsent, registerUser } from '../../api/auth'
import ConsentGate from '../../components/policy/ConsentGate'
import LinkedText from '../../components/policy/LinkedText'
import RegisterForm from '../../components/register/RegisterForm'

const checkbox = (id: string) => document.getElementById(id) as HTMLInputElement

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
  Element.prototype.scrollIntoView = vi.fn()
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
})

describe('LinkedText', () => {
  it('links the longer phrase first and adds links for phrases that are missing', () => {
    render(
      <MemoryRouter>
        <p>
          <LinkedText
            text="I agree to the Terms and the Privacy and Confidentiality Terms."
            links={[
              { phrase: 'Privacy and Confidentiality Terms', to: '/privacy' },
              { phrase: 'Terms', to: '/terms' },
              { phrase: 'Cookie Policy', to: '/cookies' },
            ]}
          />
        </p>
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe('/terms')
    expect(screen.getByRole('link', { name: 'Privacy and Confidentiality Terms' }).getAttribute('href')).toBe('/privacy')
    expect(screen.getByRole('link', { name: 'read the Cookie Policy' }).getAttribute('href')).toBe('/cookies')
  })
})

describe('RegisterForm consent boxes', () => {
  const renderForm = () =>
    render(
      <MemoryRouter initialEntries={['/register?name=Jane&email=jane@example.com&phone=0712345678']}>
        <RegisterForm />
      </MemoryRouter>
    )

  it('keeps the button off until Box 1 and the age box are ticked, with Box 2 unticked', async () => {
    renderForm()
    const button = screen.getByRole('button', { name: /join|create|sign up|account/i }) as HTMLButtonElement
    await waitFor(() => expect(screen.getByText('I am 18 or older.')).toBeTruthy())
    expect(checkbox('reg-marketing').checked).toBe(false)
    expect(button.disabled).toBe(true)

    fireEvent.click(checkbox('reg-terms'))
    expect(button.disabled).toBe(true)
    fireEvent.click(checkbox('reg-age'))
    expect(button.disabled).toBe(false)
  })

  it('sends both boxes, the marketing choice and the version shown', async () => {
    renderForm()
    await waitFor(() => expect(screen.getByText('I am 18 or older.')).toBeTruthy())
    fireEvent.change(document.getElementById('reg-password')!, { target: { value: 'longpassword1' } })
    fireEvent.change(document.getElementById('reg-confirm-password')!, { target: { value: 'longpassword1' } })
    fireEvent.click(checkbox('reg-terms'))
    fireEvent.click(checkbox('reg-age'))
    fireEvent.submit(document.getElementById('reg-terms')!.closest('form')!)

    await waitFor(() => expect(registerUser).toHaveBeenCalled())
    expect(vi.mocked(registerUser).mock.calls[0][0]).toMatchObject({
      acceptTerms: true,
      ageConfirmed: true,
      marketingOptIn: false,
      policyVersion: '1.0',
    })
  })
})

describe('ConsentGate', () => {
  const renderGate = (path = '/dashboard') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <ConsentGate />
      </MemoryRouter>
    )

  it('stays hidden for admins and for members who are up to date', () => {
    authState.user = { id: 'a', role: 'admin', needs_consent: true }
    renderGate()
    expect(screen.queryByRole('dialog')).toBeNull()

    authState.user = { id: 'u1', role: 'member', needs_consent: false, needs_marketing_prompt: false }
    renderGate()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays out of the way on the policy pages so members can read them', () => {
    authState.user = { id: 'u1', role: 'member', needs_consent: true }
    renderGate('/privacy')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('asks a member to agree again and saves the version', async () => {
    authState.user = { id: 'u1', role: 'member', needs_consent: true, needs_marketing_prompt: true }
    renderGate()
    const agree = screen.getByRole('button', { name: /agree and continue/i }) as HTMLButtonElement
    await waitFor(() => expect(screen.getByText(/version 1\.0/)).toBeTruthy())
    expect(checkbox('consent-marketing').checked).toBe(false)
    expect(agree.disabled).toBe(true)

    fireEvent.click(checkbox('consent-terms'))
    fireEvent.click(checkbox('consent-age'))
    expect(agree.disabled).toBe(false)
    fireEvent.click(agree)

    await waitFor(() => expect(acceptConsent).toHaveBeenCalled())
    expect(vi.mocked(acceptConsent).mock.calls[0][0]).toEqual({
      acceptTerms: true,
      ageConfirmed: true,
      policyVersion: '1.0',
      marketingOptIn: false,
    })
    await waitFor(() => expect(authState.updateUser).toHaveBeenCalled())
  })

  it('shows only the marketing box, once, when the member is already agreed', async () => {
    authState.user = { id: 'u1', role: 'member', needs_consent: false, needs_marketing_prompt: true }
    renderGate()
    expect(document.getElementById('consent-terms')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /save my choice/i }))
    await waitFor(() => expect(acceptConsent).toHaveBeenCalledWith({ marketingOptIn: false }))
  })
})

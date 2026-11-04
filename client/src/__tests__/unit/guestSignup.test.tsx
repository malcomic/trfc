import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const authState: { user: unknown } = { user: null }
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

import GuestSignupCard from '../../components/guest/GuestSignupCard'
import { readPrefill } from '../../components/register/RegisterForm'
import {
  GUEST_SIGNUP_DISMISSED_KEY,
  buildGuestLoginUrl,
  buildGuestSignupUrl,
} from '../../utils/guestSignup'

const renderCard = (kind: 'ticket' | 'hire' = 'ticket') =>
  render(
    <MemoryRouter>
      <GuestSignupCard kind={kind} name="Jane W" email="jane+run@example.com" phone="0712 345 678" />
    </MemoryRouter>
  )

describe('buildGuestSignupUrl', () => {
  it('encodes the guest details and redirects to the dashboard', () => {
    const url = buildGuestSignupUrl({ name: 'Jane W', email: 'jane+run@example.com', phone: '0712 345 678' })
    const params = new URLSearchParams(url.split('?')[1])
    expect(url.startsWith('/register?')).toBe(true)
    expect(params.get('name')).toBe('Jane W')
    expect(params.get('email')).toBe('jane+run@example.com')
    expect(params.get('phone')).toBe('0712 345 678')
    expect(params.get('redirect')).toBe('/dashboard')
  })

  it('leaves out empty values', () => {
    const params = new URLSearchParams(buildGuestSignupUrl({ phone: '0712345678', email: '  ' }).split('?')[1])
    expect(params.has('email')).toBe(false)
    expect(params.has('name')).toBe(false)
    expect(params.get('phone')).toBe('0712345678')
  })

  it('the sign-in link carries only the email', () => {
    const params = new URLSearchParams(buildGuestLoginUrl({ email: 'jane@example.com', phone: '0712' }).split('?')[1])
    expect(params.get('email')).toBe('jane@example.com')
    expect(params.has('phone')).toBe(false)
  })
})

describe('readPrefill', () => {
  it('reads name, email and phone from the query string', () => {
    const params = new URLSearchParams('name=Jane%20W&email=jane%40example.com&phone=0712345678&redirect=/dashboard')
    expect(readPrefill(params)).toEqual({ name: 'Jane W', email: 'jane@example.com', phone: '0712345678' })
  })

  it('ignores blank values', () => {
    expect(readPrefill(new URLSearchParams('name=%20&email='))).toEqual({})
  })
})

describe('GuestSignupCard', () => {
  beforeEach(() => {
    authState.user = null
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    })
  })

  it('links guests to a pre-filled register page', () => {
    renderCard()
    const link = screen.getByRole('link', { name: /create account/i })
    expect(link.getAttribute('href')).toContain('email=jane%2Brun%40example.com')
    expect(screen.getByText(/this purchase will appear in your account/i)).toBeTruthy()
  })

  it('does not promise linking for equipment hire', () => {
    renderCard('hire')
    expect(screen.queryByText(/this purchase will appear in your account/i)).toBeNull()
  })

  it('is hidden for signed-in members', () => {
    authState.user = { id: 'u-1' }
    renderCard()
    expect(screen.queryByRole('link', { name: /create account/i })).toBeNull()
  })

  it('"Not now" hides it and remembers the choice', () => {
    const first = renderCard()
    fireEvent.click(screen.getByRole('button', { name: /not now/i }))
    expect(screen.queryByRole('link', { name: /create account/i })).toBeNull()
    expect(localStorage.getItem(GUEST_SIGNUP_DISMISSED_KEY)).toBe('1')
    first.unmount()

    renderCard()
    expect(screen.queryByRole('link', { name: /create account/i })).toBeNull()
  })
})

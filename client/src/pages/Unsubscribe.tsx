import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { unsubscribeFromNews } from '../api/announcements'
import { Button } from '../components/ui'
import AuthLayout, { AuthAlert } from '../components/AuthLayout'

// Unsubscribing needs a click so link scanners in mail apps can't do it by opening the URL.
export default function Unsubscribe() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const confirm = async () => {
    setLoading(true)
    setError('')
    try {
      await unsubscribeFromNews(token)
      setDone(true)
    } catch (err: any) {
      setError(
        err.response?.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : err.response?.data?.error || 'Could not update your email preferences. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <AuthLayout
        eyebrow="Email preferences"
        title={<>INVALID<br />LINK</>}
        intro="This unsubscribe link is missing or incomplete. Open the link from the email again."
      >
        <Link to="/" className="font-bold underline">
          Back to the home page
        </Link>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout
        eyebrow="Email preferences"
        title={<>YOU'RE<br />UNSUBSCRIBED</>}
        intro="We won't email you TRFC news any more. Important notices about your account and events will still reach you, and announcements stay in your dashboard."
      >
        <Link to="/dashboard" className="font-bold underline">
          Go to your dashboard
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Email preferences"
      title={<>STOP NEWS<br />EMAILS?</>}
      intro="You'll stop getting TRFC news by email. Important notices about your account and events will still be sent."
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}
      <Button type="button" variant="primary" size="lg" fullWidth className="h-13" disabled={loading} isLoading={loading} onClick={confirm}>
        Unsubscribe
      </Button>
    </AuthLayout>
  )
}

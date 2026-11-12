import PolicyPage from '../components/policy/PolicyPage'

export default function Terms() {
  return (
    <PolicyPage
      slug="terms"
      watermark="TERMS"
      crossLink={{ label: 'Privacy and Confidentiality Terms', to: '/privacy' }}
    />
  )
}

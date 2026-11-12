import PolicyPage from '../components/policy/PolicyPage'

export default function PrivacyApplicants() {
  return (
    <PolicyPage
      slug="privacy-applicants"
      watermark="COACH"
      crossLink={{ label: 'Back to the coach application', to: '/coach-with-us' }}
    />
  )
}

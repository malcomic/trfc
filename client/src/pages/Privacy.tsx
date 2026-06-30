import LegalPageLayout from '../components/LegalPageLayout'
import { privacyMeta, privacySections } from '../content/privacyContent'

export default function Privacy() {
  return (
    <LegalPageLayout
      meta={privacyMeta}
      sections={privacySections}
      crossLink={{ label: 'Terms of Service', to: '/terms' }}
    />
  )
}

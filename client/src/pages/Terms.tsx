import LegalPageLayout from '../components/LegalPageLayout'
import { termsMeta, termsSections } from '../content/termsContent'

export default function Terms() {
  return (
    <LegalPageLayout
      meta={termsMeta}
      sections={termsSections}
      crossLink={{ label: 'Privacy Policy', to: '/privacy' }}
    />
  )
}

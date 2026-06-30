import type { LegalPageMeta, LegalSection } from '../components/LegalPageLayout'
import { siteContact } from '../config/site'

export const privacyMeta: LegalPageMeta = {
  documentTitle: 'Privacy Policy | TRFC',
  eyebrow: 'Legal',
  title: 'PRIVACY',
  titleAccent: 'POLICY',
  intro:
    'This Privacy Policy explains how Thika Road Fitness Community (TRFC) collects, uses, and protects your personal information when you use our website and services.',
  watermark: 'PRIVACY',
  lastUpdated: 'June 7, 2026',
}

export const privacySections: LegalSection[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    paragraphs: [
      'Thika Road Fitness Community ("TRFC", "we", "us", or "our") is a fitness community based in Nairobi, Kenya. We operate the TRFC website and related services, including event registration, merchandise sales, and equipment hire.',
      'By using our website or creating an account, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with our practices, please do not use our services.',
    ],
  },
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    paragraphs: [
      'We collect information you provide directly when you register an account, purchase tickets, place shop orders, hire equipment, or contact us. This may include your full name, email address, phone number, delivery address, and payment-related details such as the M-Pesa phone number used for transactions.',
      'When you complete a purchase or booking, we store transaction records including order totals, payment status, M-Pesa receipt references, and checkout request identifiers. We do not store your M-Pesa PIN or full payment credentials.',
      'We automatically collect limited technical information when you use our site, such as browser type, device information, and usage patterns necessary to operate and secure the platform.',
    ],
  },
  {
    id: 'how-we-use-information',
    title: 'How We Use Your Information',
    paragraphs: [
      'We use your personal information to create and manage your account, process event ticket purchases, fulfil merchandise orders, manage equipment hire bookings, and communicate with you about your transactions.',
      'We may use your contact details to send community updates, event announcements, and service-related notifications. You can opt out of non-essential marketing communications at any time by contacting us.',
      'We use aggregated and anonymised data to improve our website, understand community engagement, and plan events and programs.',
    ],
  },
  {
    id: 'legal-basis',
    title: 'Legal Basis for Processing',
    paragraphs: [
      'We process your personal data in accordance with the Kenya Data Protection Act, 2019. Depending on the context, our legal bases include your consent (for example, when you agree to this policy during registration), performance of a contract (when processing purchases or bookings), and our legitimate interests in operating and improving our community platform.',
    ],
  },
  {
    id: 'payment-processing',
    title: 'Payment Processing',
    paragraphs: [
      'TRFC uses M-Pesa (STK push) to process payments for events, merchandise, and equipment hire. When you initiate a payment, your phone number is shared with Safaricom M-Pesa to complete the transaction. Safaricom processes payment data under its own privacy policy and terms.',
      'We receive confirmation of payment status and M-Pesa receipt numbers to record your order or booking. TRFC does not have access to your M-Pesa account balance or PIN.',
    ],
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing',
    paragraphs: [
      'We do not sell your personal information. We may share data with trusted service providers who help us operate our website, process payments, or deliver orders, subject to confidentiality obligations.',
      'We may disclose information when required by law, court order, or government authority, or when necessary to protect the rights, safety, and security of TRFC, our members, or the public.',
    ],
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    paragraphs: [
      'We retain your personal information for as long as your account is active and as needed to provide our services. Transaction and payment records may be kept for a reasonable period after account closure to comply with legal, accounting, and dispute-resolution requirements.',
      'You may request deletion of your account by contacting us. Some information may be retained where we have a legal obligation or legitimate reason to do so.',
    ],
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    paragraphs: [
      'Under the Kenya Data Protection Act, you have the right to access, correct, or delete your personal data, object to certain processing, and withdraw consent where processing is consent-based.',
      `To exercise these rights, contact us at ${siteContact.email} or ${siteContact.phone}. We will respond within a reasonable timeframe.`,
    ],
  },
  {
    id: 'cookies-and-storage',
    title: 'Cookies and Local Storage',
    paragraphs: [
      'Our website uses browser local storage to keep you signed in (authentication tokens), remember your theme preference (light or dark mode), and maintain your shopping cart between visits.',
      'These are functional storage mechanisms, not advertising cookies. You can clear them through your browser settings, though this may sign you out and reset your preferences.',
    ],
  },
  {
    id: 'security',
    title: 'Security',
    paragraphs: [
      'We implement reasonable technical and organisational measures to protect your personal information, including encrypted password storage and secure communication in production environments.',
      'No method of transmission or storage is completely secure. While we strive to protect your data, we cannot guarantee absolute security.',
    ],
  },
  {
    id: 'childrens-privacy',
    title: "Children's Privacy",
    paragraphs: [
      'Our services are not directed at children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected such information, please contact us so we can delete it promptly.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    paragraphs: [
      'We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of our services after changes constitutes acceptance of the updated policy.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    paragraphs: [
      `If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us at ${siteContact.email}, call ${siteContact.phone}, or visit our contact page.`,
    ],
  },
]

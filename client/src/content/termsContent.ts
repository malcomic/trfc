import type { LegalPageMeta, LegalSection } from '../components/LegalPageLayout'
import { siteContact } from '../config/site'

export const termsMeta: LegalPageMeta = {
  documentTitle: 'Terms of Service | TRFC',
  eyebrow: 'Legal',
  title: 'TERMS OF',
  titleAccent: 'SERVICE',
  intro:
    'These Terms of Service govern your use of the TRFC website, account, and related services. Please read them carefully before registering or making a purchase.',
  watermark: 'TERMS',
  lastUpdated: 'June 7, 2026',
}

export const termsSections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    paragraphs: [
      'By accessing or using the TRFC website, creating an account, or completing a purchase, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must not use our services.',
      'You must be at least 18 years old to create an account and make purchases, or have the consent of a parent or legal guardian if you are between 13 and 17 years old.',
    ],
  },
  {
    id: 'about-trfc',
    title: 'About TRFC',
    paragraphs: [
      'Thika Road Fitness Community (TRFC) is a Nairobi-based fitness community offering group runs, training programs, events, merchandise, and equipment hire. Our website provides a platform for members and visitors to register, browse events, shop, and manage bookings.',
    ],
  },
  {
    id: 'account-registration',
    title: 'Account Registration',
    paragraphs: [
      'When you create an account, you agree to provide accurate and complete information and to keep your details up to date. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account.',
      'Notify us immediately at ' + siteContact.email + ' if you suspect unauthorised access to your account.',
    ],
  },
  {
    id: 'membership',
    title: 'Membership',
    paragraphs: [
      'Community membership is free unless otherwise stated on the website. Member benefits such as event access, discounts, and training resources are described on our site and may change from time to time.',
      'Membership does not guarantee availability of specific events, products, or services, which may be subject to capacity and stock limits.',
    ],
  },
  {
    id: 'events-and-tickets',
    title: 'Events and Tickets',
    paragraphs: [
      'Event details including date, location, price, and capacity are displayed on the website at the time of booking. Tickets are generally non-transferable unless we explicitly state otherwise.',
      'Participation in TRFC events and fitness activities involves inherent physical risk. You participate at your own risk and should consult a medical professional before engaging in strenuous activity if you have health concerns.',
    ],
  },
  {
    id: 'shop-and-merchandise',
    title: 'Shop and Merchandise',
    paragraphs: [
      'Product prices are displayed in Kenyan Shillings (KES) and are subject to change without notice. Availability is subject to stock levels at the time of order.',
      'You must provide accurate delivery details at checkout. TRFC is not responsible for delays or failed deliveries caused by incorrect information provided by you.',
    ],
  },
  {
    id: 'equipment-hire',
    title: 'Equipment Hire',
    paragraphs: [
      'Equipment hire is subject to the hire and return dates you select at booking. You agree to return equipment in the same condition as received, ordinary wear excepted.',
      'Late returns may incur additional fees. You are liable for loss, theft, or damage to hired equipment beyond normal wear. TRFC may charge repair or replacement costs as applicable.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    paragraphs: [
      'Payments are processed via M-Pesa STK push. When you initiate a payment, you must confirm the prompt on your phone within the required timeframe. Failed, cancelled, or incomplete payments will not result in order or booking fulfilment.',
      'You confirm that the M-Pesa phone number you provide is yours and that you are authorised to use it for the transaction.',
    ],
  },
  {
    id: 'refunds-and-cancellations',
    title: 'Refunds and Cancellations',
    paragraphs: [
      'Refund and cancellation policies may vary by event, product, or hire type. Where refunds are offered, they will be processed to the original M-Pesa number used for payment where possible.',
      'Contact us at ' + siteContact.email + ' within a reasonable time if you believe a transaction was made in error or if you wish to request a refund. Each request will be reviewed on a case-by-case basis.',
    ],
  },
  {
    id: 'user-conduct',
    title: 'User Conduct',
    paragraphs: [
      'You agree to use our platform respectfully and lawfully. You must not harass other members, post harmful content, attempt to gain unauthorised access to our systems, or misuse the website in any way.',
      'TRFC reserves the right to remove content or restrict access for behaviour that violates these terms or harms the community.',
    ],
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    paragraphs: [
      'All TRFC branding, logos, website content, and materials are owned by TRFC or our licensors. You may not copy, reproduce, or distribute our content for commercial purposes without written permission.',
      'You may share publicly available event information and TRFC content for personal, non-commercial community purposes.',
    ],
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of Liability',
    paragraphs: [
      'To the fullest extent permitted by law, TRFC provides the website and services on an "as is" and "as available" basis. We do not guarantee uninterrupted or error-free operation.',
      'TRFC is not liable for indirect, incidental, or consequential damages arising from your use of the site, participation in events, or use of hired equipment. Our total liability for any claim related to a specific transaction is limited to the amount you paid for that transaction.',
    ],
  },
  {
    id: 'termination',
    title: 'Termination',
    paragraphs: [
      'We may suspend or terminate your account if you violate these terms or engage in conduct harmful to TRFC or its members. You may stop using our services at any time and request account deletion by contacting us.',
    ],
  },
  {
    id: 'governing-law',
    title: 'Governing Law',
    paragraphs: [
      'These Terms of Service are governed by the laws of the Republic of Kenya. Any disputes arising from these terms or your use of our services shall be subject to the jurisdiction of Kenyan courts.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    paragraphs: [
      'We may update these Terms of Service from time to time. Updated terms will be posted on this page with a revised "Last updated" date. Continued use of our services after changes constitutes acceptance of the updated terms.',
    ],
  },
  {
    id: 'contact',
    title: 'Contact Us',
    paragraphs: [
      `For questions about these Terms of Service, contact us at ${siteContact.email}, call ${siteContact.phone}, or visit our contact page.`,
    ],
  },
]

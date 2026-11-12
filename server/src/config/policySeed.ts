export type PolicySlug = 'privacy-members' | 'privacy-applicants' | 'terms'

export const POLICY_SLUGS: PolicySlug[] = ['privacy-members', 'privacy-applicants', 'terms']

export interface PolicyTable {
  headers: string[]
  rows: string[][]
}

export interface PolicySection {
  id: string
  title: string
  paragraphs: string[]
  table?: PolicyTable
}

export interface PolicySeed {
  slug: PolicySlug
  version: string
  title: string
  intro: string
  lastUpdated: string
  sections: PolicySection[]
}

const CONTACT = 'thikaroadfitness@gmail.com or 0762550214'

/** Version A: members and users. Starting text only; admins replace it from the Policies page. */
const PRIVACY_MEMBERS: PolicySeed = {
  slug: 'privacy-members',
  version: '1.0',
  title: 'Privacy and Confidentiality Terms',
  intro:
    'How Thika Road Fitness Community (TRFC) collects, uses, shares and protects your information when you use the TRFC web app. This is Version A, for members and users.',
  lastUpdated: '2026-11-12',
  sections: [
    {
      id: 'who-we-are',
      title: 'Who we are',
      paragraphs: [
        'Thika Road Fitness Community ("TRFC", "we", "us") is a fitness community based in Kenya. The TRFC web app is hosted in Kenya.',
        `For any privacy question or request, contact us at ${CONTACT}.`,
      ],
    },
    {
      id: 'what-we-collect',
      title: 'What we collect',
      paragraphs: [
        'Account details: your name, email, phone number, WhatsApp number, zone and captain.',
        'Your answers to sign-up and program questions, the Saturdays you attend, and your program progress.',
        'Tickets and purchases: tickets, programs, merch and installments, with the date and amount.',
        'We never see or keep your M-Pesa PIN or card details.',
      ],
    },
    {
      id: 'how-we-use-it',
      title: 'How we use your information',
      paragraphs: [
        'To run your account, your tickets, your program and your Saturdays with your captain.',
        'To send account messages by SMS or email, such as a ticket receipt or a payment reminder.',
        'To plan events and programs, and for marketing. Promotion emails go only to people who ticked the marketing box. Promotions inside the app can show to everyone.',
        'WhatsApp is only used by captains for one to one follow-up, and only if you turn it on for that captain. WhatsApp is never used for promotions.',
      ],
    },
    {
      id: 'who-can-see-what',
      title: 'Who can see what',
      paragraphs: ['Only admins can see purchase history.'],
      table: {
        headers: ['Who', 'What they can see'],
        rows: [
          ['You', 'All your own information.'],
          ['Your captains', 'Name, zone, Saturdays attended and program progress. Your WhatsApp number only if you turned the switch on for that captain.'],
          ['TRFC admin team', 'Account and purchase records. Only named admin people can open them, and every login is private.'],
          ['Program coach, if you join a program', 'Your name, your answers for that program and your progress in it.'],
          ['Payment and hosting providers', 'Only what they need to take payment or keep the app running, for example M-Pesa and our web host.'],
          ['Other members', 'Nothing, except a name and photo if you choose to post in a group.'],
        ],
      },
    },
    {
      id: 'keeping-and-deleting',
      title: 'Keeping and deleting your information',
      paragraphs: [],
      table: {
        headers: ['Data', 'How long we keep it'],
        rows: [
          ['Account details', 'While your account is open.'],
          ['Purchase and payment records', '2 years.'],
          ['After you delete your account', 'We remove your personal details within 30 days, except the payment records we must keep.'],
        ],
      },
    },
    {
      id: 'your-choices',
      title: 'Your choices and rights',
      paragraphs: [
        'From your dashboard you can change your marketing email choice, turn WhatsApp sharing on or off for each captain, download a file with everything we hold about you, and delete your account.',
        'Every promotion email has an unsubscribe link. If you take back a consent, we record it and stop the related messages at once.',
        `You can also contact us at ${CONTACT}.`,
      ],
    },
    {
      id: 'age',
      title: 'Age',
      paragraphs: [
        'You must be 18 or older to create your own account. A parent or guardian can register a child for a family event.',
      ],
    },
    {
      id: 'changes',
      title: 'Changes to these terms',
      paragraphs: [
        'When we publish a new version, the version number and date at the top of this page change and older versions stay on file. If a change is big, we ask you to agree again the next time you log in.',
      ],
    },
  ],
}

/** Version B: people who apply to coach. */
const PRIVACY_APPLICANTS: PolicySeed = {
  slug: 'privacy-applicants',
  version: '1.0',
  title: 'Privacy and Confidentiality Terms for Coach Applicants',
  intro:
    'How TRFC uses the information you send when you apply to coach, and how you agree to keep TRFC confidential information private. This is Version B, for people who apply to coach.',
  lastUpdated: '2026-11-12',
  sections: [
    {
      id: 'what-we-collect',
      title: 'What we collect',
      paragraphs: [
        'Your application: name, phone, email, location, social link, experience, availability, answers, CV and video.',
        'Basic technical data, such as cookies needed for the form to work.',
      ],
    },
    {
      id: 'how-we-use-it',
      title: 'How we use it',
      paragraphs: [
        'Only to decide on your application. Only the TRFC hiring team can open applications. They are never shown in the member dashboard or to captains.',
      ],
    },
    {
      id: 'confidentiality',
      title: 'Confidentiality',
      paragraphs: [
        'You agree to keep private any TRFC confidential information you see during the hiring process, such as programs, plans and member information.',
      ],
    },
    {
      id: 'keeping-and-deleting',
      title: 'Keeping and deleting',
      paragraphs: [],
      table: {
        headers: ['Data', 'How long we keep it'],
        rows: [
          ['Application, if not hired', '12 months, then deleted. Deleted sooner if you ask in writing.'],
          ['Application, if hired', 'Moved into your coach file. Kept while you coach and 2 years after.'],
        ],
      },
    },
    {
      id: 'contact',
      title: 'Contact',
      paragraphs: [`To ask about or delete your application, contact us at ${CONTACT}.`],
    },
  ],
}

const TERMS: PolicySeed = {
  slug: 'terms',
  version: '1.0',
  title: 'Terms of Service',
  intro:
    'These Terms of Service govern your use of the TRFC website, account, and related services. Please read them carefully before registering or making a purchase.',
  lastUpdated: '2026-10-30',
  sections: [
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      paragraphs: [
        'By accessing or using the TRFC website, creating an account, or completing a purchase, you agree to be bound by these Terms of Service and our Privacy and Confidentiality Terms. If you do not agree, you must not use our services.',
        'You must be 18 or older to create an account. A parent or guardian can register a child for a family event.',
      ],
    },
    {
      id: 'account-registration',
      title: 'Account Registration',
      paragraphs: [
        'When you create an account, you agree to provide accurate and complete information and to keep your details up to date. You are responsible for keeping your login details private and for all activity under your account.',
      ],
    },
    {
      id: 'events-and-tickets',
      title: 'Events and Tickets',
      paragraphs: [
        'Event details including date, location, price, and capacity are displayed on the website at the time of booking. Tickets are non-transferable, except that paid TRFC members can transfer a fully paid ticket once, free, to another TRFC account before the cancel deadline. Members-only tickets can only go to another member.',
        'Participation in TRFC events and fitness activities involves inherent physical risk. You participate at your own risk and should consult a medical professional before engaging in strenuous activity if you have health concerns.',
      ],
    },
    {
      id: 'shop-and-merchandise',
      title: 'Shop and Merchandise',
      paragraphs: [
        'Product prices are displayed in Kenyan Shillings (KES) and are subject to change without notice. Availability is subject to stock levels at the time of order.',
        'Shop orders are delivered free of charge on Wednesdays. Orders paid by 8:00 pm on Tuesday (Nairobi time) are delivered that Wednesday; orders paid after that are delivered the following Wednesday.',
      ],
    },
    {
      id: 'payments',
      title: 'Payments',
      paragraphs: [
        'Payments are processed via M-Pesa STK push. Failed, cancelled, or incomplete payments will not result in order or booking fulfilment.',
        'Ticket credit, paying in parts and missed-event rules are shown on each event and in your dashboard.',
      ],
    },
    {
      id: 'governing-law',
      title: 'Governing Law',
      paragraphs: [
        'These Terms of Service are governed by the laws of the Republic of Kenya. Any disputes shall be subject to the jurisdiction of Kenyan courts.',
      ],
    },
    {
      id: 'contact',
      title: 'Contact Us',
      paragraphs: [`For questions about these Terms of Service, contact us at ${CONTACT}.`],
    },
  ],
}

export const POLICY_SEEDS: PolicySeed[] = [PRIVACY_MEMBERS, PRIVACY_APPLICANTS, TERMS]

export const PRIVACY_SETTING_DEFAULTS: Record<string, unknown> = {
  purchase_retention_months: 24,
  coach_app_retention_months: 12,
  coach_file_retention_months_after: 24,
  account_delete_grace_days: 30,
  contact_email: 'thikaroadfitness@gmail.com',
  contact_phone: '0762550214',
  show_ticket_photo_notice: false,
  ticket_photo_notice: '',
  show_application_cookie_notice: false,
  application_cookie_notice: 'We use cookies only for basic technical data so this form works.',
  cross_border_notice: '',
  box1_text: 'I agree to the Terms and to how TRFC uses my information, as set out in the Privacy and Confidentiality Terms.',
  box2_text: 'Yes, email me about my program, TRFC events, offers and the 2027 membership.',
  age_box_text: 'I am 18 or older.',
  applicant_box_text:
    'I have read the Privacy and Confidentiality Terms for applicants. I agree that TRFC can use my application information to decide on my application, and I agree to keep TRFC confidential information private as set out in the terms.',
}

const lit = (value: string) => `'${value.replace(/'/g, "''")}'`

export function buildPolicySeedSql(): string {
  const docs = POLICY_SEEDS.map(
    (p) =>
      `(${lit(p.slug)}, ${lit(p.version)}, ${lit(p.title)}, ${lit(p.intro)}, ${lit(JSON.stringify(p.sections))}::jsonb, ${lit(p.lastUpdated)}::date, false, 'published', NOW())`
  )
  const settings = Object.entries(PRIVACY_SETTING_DEFAULTS).map(
    ([key, value]) => `(${lit(key)}, ${lit(JSON.stringify(value))}::jsonb)`
  )
  return `INSERT INTO policy_documents (slug, version, title, intro, sections, last_updated, is_material, status, published_at) VALUES
    ${docs.join(',\n    ')}
    ON CONFLICT (slug, version) DO NOTHING;
    INSERT INTO privacy_settings (key, value) VALUES
    ${settings.join(',\n    ')}
    ON CONFLICT (key) DO NOTHING;`
}

export type PerkStatus = 'on' | 'coming_soon' | 'hidden'

export interface MemberPerkSeed {
  key: string
  title: string
  description: string
  status: PerkStatus
  icon: string
  settings?: Record<string, unknown>
}

/** Member-only benefits from the membership brief, in the order they are listed there. */
export const MEMBER_PERKS: MemberPerkSeed[] = [
  { key: 'points', title: 'Points and season awards', description: 'Earn points for showing up and win awards at the end of the season. The earning rules are coming soon.', status: 'on', icon: 'Star' },
  { key: 'badge', title: 'Member badge', description: 'Your member badge shows on your dashboard and your member pass.', status: 'on', icon: 'BadgeCheck' },
  { key: 'program_discount', title: '15% off one paid program a year', description: 'Use your member price on one paid program each membership year.', status: 'on', icon: 'Percent', settings: { percent: 15 } },
  { key: 'clothes_discount', title: 'KSh 300 off one shop order a year', description: 'Take KSh 300 off one shop order each membership year on marked items.', status: 'on', icon: 'Shirt', settings: { amount: 300 } },
  { key: 'early_hikes', title: 'Early booking on hikes', description: 'Book hike seats 48 hours before everyone else.', status: 'on', icon: 'Mountain', settings: { hours: 48 } },
  { key: 'fit_fest', title: 'Early bird price on Fit Fest', description: 'Members get the early bird price on Fit Fest tickets.', status: 'on', icon: 'Ticket' },
  { key: 'elite_coaching', title: 'Elite coaching (Level 3)', description: 'Level 3 coaching for mothers who are members.', status: 'on', icon: 'HeartPulse' },
  { key: 'marathon_first', title: 'First to register for the Thika Road Marathon', description: 'Members register for the Thika Road Marathon before it opens to everyone.', status: 'on', icon: 'Flag' },
  { key: 'guides', title: 'Library of guides', description: 'Grocery, cooking, mindset and workout guides.', status: 'coming_soon', icon: 'Library' },
  { key: 'live_qa', title: 'Monthly live Q&A with Coach Maurice', description: 'A live Q&A on Zoom every month. The link and a reminder will be in your account.', status: 'coming_soon', icon: 'Video', settings: { zoom_url: '', next_date: '' } },
  { key: 'friend_pass', title: 'Friend pass', description: 'Bring one guest to one Saturday run a year.', status: 'coming_soon', icon: 'UserPlus' },
  { key: 'partners', title: 'Partner discounts', description: 'Discounts at pharmacies, physios and sports shops.', status: 'coming_soon', icon: 'Handshake' },
  { key: 'member_vote', title: 'Member vote', description: "Vote on hike routes and next year's events.", status: 'coming_soon', icon: 'Vote' },
  { key: 'ticket_swap', title: 'Free ticket transfer', description: 'Give your ticket to another TRFC account for free, up to the cancel deadline.', status: 'on', icon: 'Repeat' },
  { key: 'shout_out', title: 'Instagram shout-out', description: 'We celebrate your milestones and results on Instagram.', status: 'coming_soon', icon: 'Camera' },
  { key: 'finisher_medal', title: 'Finisher certificate and medal', description: 'Earn a certificate and medal for a set number of Saturdays.', status: 'coming_soon', icon: 'Medal', settings: { saturdays: null } },
  { key: 'accident_insurance', title: 'Accident insurance', description: 'Planned, not confirmed.', status: 'hidden', icon: 'ShieldCheck' },
]

const lit = (value: string) => `'${value.replace(/'/g, "''")}'`

export function buildMemberPerksSeedSql(): string {
  const rows = MEMBER_PERKS.map(
    (p, i) =>
      `(${lit(p.key)}, ${lit(p.title)}, ${lit(p.description)}, ${lit(p.status)}, ${(i + 1) * 10}, ${lit(p.icon)}, ${lit(JSON.stringify(p.settings ?? {}))}::jsonb)`
  )
  return `INSERT INTO member_perks (key, title, description, status, sort_order, icon, settings) VALUES
    ${rows.join(',\n    ')}
    ON CONFLICT (key) DO NOTHING;`
}

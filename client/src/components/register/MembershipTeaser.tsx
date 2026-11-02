import { FREE_ACCOUNT_ROWS, MEMBER_ROWS, type MembershipRow } from '../../content/register'

function MembershipList({ title, subtitle, rows }: { title: string; subtitle: string; rows: MembershipRow[] }) {
  return (
    <div className="flex-[1_1_340px] min-w-0 bg-[#1E1E1E] rounded-xl p-6 max-sm:p-[18px]">
      <h3 className="m-0 font-barlow-condensed font-bold text-[28px] max-sm:text-[26px] leading-[1.1]">{title}</h3>
      <p className="mt-1 mb-3 text-base text-[#C4C4C4]">{subtitle}</p>
      <dl className="m-0">
        {rows.map((row, index) => (
          <div
            key={row.feature}
            className={`flex flex-wrap justify-between gap-x-4 gap-y-1 py-3 text-lg max-sm:text-[17px] ${index > 0 ? 'border-t border-[#333333]' : ''}`}
          >
            <dt className="flex-[1_1_200px] min-w-0">{row.feature}</dt>
            <dd className="m-0 flex-[0_1_auto] text-cta font-semibold text-left">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export default function MembershipTeaser() {
  return (
    <section className="bg-night text-white px-6 py-20 max-sm:px-4 max-sm:py-12">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-6">
        <div className="self-start bg-cta text-cta-ink font-semibold text-[15px] px-3 py-1 rounded-md tracking-[1px] uppercase">
          Coming soon
        </div>
        <h2 className="m-0 font-barlow-condensed font-bold text-[44px] max-sm:text-[32px] leading-[1.05]">
          Want more? Become a member.
        </h2>
        <p className="m-0 max-w-[760px] text-xl max-sm:text-lg text-[#E6E6E6]">
          Membership is an upgrade on your free account. You keep everything you already have.
        </p>
        <div className="flex flex-wrap gap-5">
          <MembershipList title="Already in your free account" subtitle="You get all this the day you sign up." rows={FREE_ACCOUNT_ROWS} />
          <MembershipList title="When you become a member" subtitle="All of that, plus this." rows={MEMBER_ROWS} />
        </div>
        <p className="m-0 max-w-[760px] text-xl max-sm:text-lg">
          Membership opens on 1 December. We will tell you by text and email, through your account. Nobody has to join. It is
          absolutely optional, and your free account stays free.
        </p>
      </div>
    </section>
  )
}

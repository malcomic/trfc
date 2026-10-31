import { Loader } from 'lucide-react'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import WalletCard from '../../components/wallet/WalletCard'
import WalletLedger from '../../components/wallet/WalletLedger'
import InstallmentPlanCard from '../../components/wallet/InstallmentPlanCard'

const sectionTitle =
  'font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light'

export default function MemberWallet() {
  const { wallet, plans, payable, ticketValue, ledgerKey, openPayEvents, refreshAll, notify } = useMemberDashboard()
  const activePlans = plans.filter((p) => p.status === 'active')
  const pastPlans = plans.filter((p) => p.status !== 'active')

  return (
    <>
      <MemberPageHeader
        title="MY"
        highlight="TICKET VALUE"
        subtitle="Value from tickets you couldn't use, tickets you're paying in parts, and your history."
      />

      {wallet === null ? (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : (
        <div className="space-y-8">
          <WalletCard
            ticketValue={ticketValue}
            upcoming={wallet.upcoming}
            credits={wallet.credits}
            creditDays={wallet.creditDays}
            payableCount={payable.length}
            onPayEvents={openPayEvents}
          />

          <section className="space-y-3">
            <h2 className={sectionTitle}>Payments in progress</h2>
            {activePlans.length === 0 ? (
              <p className="text-sm text-fog light:text-fog-light">
                Nothing in progress. Events that allow it can be paid in parts at checkout: 30% now, the rest by your chosen
                dates.
              </p>
            ) : (
              activePlans.map((plan) => (
                <InstallmentPlanCard
                  key={plan.id}
                  plan={plan}
                  ticketValue={ticketValue}
                  onChanged={refreshAll}
                  notify={notify}
                />
              ))
            )}
            {pastPlans.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-fog light:text-fog-light">
                  Finished and closed ({pastPlans.length})
                </summary>
                <div className="space-y-3 mt-3">
                  {pastPlans.map((plan) => (
                    <InstallmentPlanCard
                      key={plan.id}
                      plan={plan}
                      ticketValue={ticketValue}
                      onChanged={refreshAll}
                      notify={notify}
                    />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="space-y-3">
            <h2 className={sectionTitle}>History</h2>
            <WalletLedger key={ledgerKey} initial={wallet.transactions} />
          </section>
        </div>
      )}
    </>
  )
}

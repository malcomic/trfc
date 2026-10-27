import { Loader } from 'lucide-react'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import WalletCard from '../../components/wallet/WalletCard'
import WalletLedger from '../../components/wallet/WalletLedger'
import InstallmentPlanCard from '../../components/wallet/InstallmentPlanCard'

const sectionTitle =
  'font-barlow-condensed font-bold text-sm tracking-widest uppercase text-accent light:text-accent-light'

export default function MemberWallet() {
  const { wallet, plans, payable, balance, ledgerKey, openTopUp, openPayEvents, refreshAll, notify } = useMemberDashboard()
  const activePlans = plans.filter((p) => p.status === 'active')
  const pastPlans = plans.filter((p) => p.status !== 'active')

  return (
    <>
      <MemberPageHeader title="MY" highlight="WALLET" subtitle="Top up, pay for events and track installment plans." />

      {wallet === null ? (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : (
        <div className="space-y-8">
          <WalletCard
            balance={balance}
            cap={wallet.cap}
            headroom={wallet.headroom}
            payableCount={payable.length}
            onTopUp={() => openTopUp()}
            onPayEvents={openPayEvents}
          />

          <section className="space-y-3">
            <h2 className={sectionTitle}>Installment plans</h2>
            {activePlans.length === 0 ? (
              <p className="text-sm text-fog light:text-fog-light">
                No active plans. Events that allow it can be paid in 2 or 3 installments at checkout.
              </p>
            ) : (
              activePlans.map((plan) => (
                <InstallmentPlanCard
                  key={plan.id}
                  plan={plan}
                  balance={balance}
                  onChanged={refreshAll}
                  onNeedTopUp={openTopUp}
                  notify={notify}
                />
              ))
            )}
            {pastPlans.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-fog light:text-fog-light">Past plans ({pastPlans.length})</summary>
                <div className="space-y-3 mt-3">
                  {pastPlans.map((plan) => (
                    <InstallmentPlanCard
                      key={plan.id}
                      plan={plan}
                      balance={balance}
                      onChanged={refreshAll}
                      onNeedTopUp={openTopUp}
                      notify={notify}
                    />
                  ))}
                </div>
              </details>
            )}
          </section>

          <section className="space-y-3">
            <h2 className={sectionTitle}>Wallet activity</h2>
            <WalletLedger key={ledgerKey} initial={wallet.transactions} />
          </section>
        </div>
      )}
    </>
  )
}

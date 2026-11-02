import RegisterHero from '../components/register/RegisterHero'
import RegisterBenefits from '../components/register/RegisterBenefits'
import DashboardPreview from '../components/register/DashboardPreview'
import MembershipTeaser from '../components/register/MembershipTeaser'
import RegisterForm from '../components/register/RegisterForm'
import { pageRoot } from '../utils/themeClasses'

export default function Register() {
  return (
    <div className={pageRoot}>
      <RegisterHero />
      <RegisterBenefits />
      <DashboardPreview />
      <MembershipTeaser />
      <RegisterForm />
      <div className="border-t border-white/5 light:border-black/8 py-9 text-center">
        <div className="font-bebas text-3xl tracking-[0.2em] text-accent light:text-accent-light">RUN • JOG • WALK</div>
        <div className="text-sm text-fog light:text-fog-light mt-1.5">Thika Road Fitness Community</div>
      </div>
    </div>
  )
}

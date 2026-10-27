import { Loader } from 'lucide-react'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import ProfileForm from '../../components/dashboard/ProfileForm'

export default function MemberProfilePage() {
  const { data, setProfile, notify } = useMemberDashboard()

  return (
    <>
      <MemberPageHeader title="MY" highlight="PROFILE" subtitle="Your contact details and preferences." />
      {data ? (
        <ProfileForm profile={data.profile} onSaved={setProfile} notify={notify} />
      ) : (
        <div className="flex justify-center py-10">
          <Loader className="w-8 h-8 animate-spin text-accent light:text-accent-light" />
        </div>
      )}
    </>
  )
}

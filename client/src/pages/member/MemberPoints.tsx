import MembersOnlyPage from '../../components/member/dashboard/MembersOnlyPage'
import { DASHBOARD_COPY } from '../../content/dashboard'

export default function MemberPoints() {
  return <MembersOnlyPage heading={DASHBOARD_COPY.points.heading} />
}

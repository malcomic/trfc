import { useSearchParams } from 'react-router-dom'
import { Crown } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import GuidesTab from '../../components/admin/membership/GuidesTab'
import LiveQaTab from '../../components/admin/membership/LiveQaTab'
import MembersTab from '../../components/admin/membership/MembersTab'
import PerksTab from '../../components/admin/membership/PerksTab'
import PollsTab from '../../components/admin/membership/PollsTab'
import SettingsTab from '../../components/admin/membership/SettingsTab'

const TABS = [
  { id: 'members', label: 'Members' },
  { id: 'perks', label: 'Perks' },
  { id: 'guides', label: 'Guides' },
  { id: 'live-qa', label: 'Live Q&A' },
  { id: 'polls', label: 'Member vote' },
  { id: 'settings', label: 'Settings' },
] as const
type TabId = (typeof TABS)[number]['id']

export default function AdminMembership() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab: TabId = TABS.some((t) => t.id === searchParams.get('tab')) ? (searchParams.get('tab') as TabId) : 'members'

  return (
    <div>
      <AdminPageHeader
        title="Membership"
        subtitle="Paid members, the perks they see, and the membership prices."
        actions={<Crown size={28} className="text-primary dark:text-primary-dark hidden sm:block" />}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6" role="tablist" aria-label="Membership sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setSearchParams(t.id === 'members' ? {} : { tab: t.id })}
            className={`px-4 min-h-[44px] rounded-lg text-sm font-semibold whitespace-nowrap border transition ${
              tab === t.id
                ? 'bg-primary dark:bg-primary-dark text-white dark:text-black border-transparent'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'members' && <MembersTab />}
      {tab === 'perks' && <PerksTab />}
      {tab === 'guides' && <GuidesTab />}
      {tab === 'live-qa' && <LiveQaTab />}
      {tab === 'polls' && <PollsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  )
}

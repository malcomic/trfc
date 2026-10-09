import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/admin/captains', label: 'Captains', end: true },
  { to: '/admin/captains/regions', label: 'Regions', end: false },
]

export default function CaptainsSectionTabs() {
  return (
    <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `px-4 py-2 -mb-px border-b-2 font-medium whitespace-nowrap transition ${
              isActive
                ? 'border-primary dark:border-primary-dark text-primary dark:text-primary-dark'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}

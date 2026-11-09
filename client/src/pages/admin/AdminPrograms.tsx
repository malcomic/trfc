import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader, Plus } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import NewProgramDialog from '../../components/admin/programs/NewProgramDialog'
import { primaryButton } from '../../components/admin/programs/fields'
import { listAdminPrograms, type AdminProgramListItem } from '../../api/admin/programs'
import { formatKsh } from '../../content/programs'
import { programListStatus, type ProgramListStatus } from '../../content/programEditor'
import { errorMessage } from '../../hooks/useProgramEditor'

const STATUS_STYLES: Record<ProgramListStatus, string> = {
  Live: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Live, with unpublished changes': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  Archived: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-KE', { dateStyle: 'medium' }) : '—'

export function StatusBadge({ status }: { status: ProgramListStatus }) {
  return <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${STATUS_STYLES[status]}`}>{status}</span>
}

export default function AdminPrograms() {
  const [programs, setPrograms] = useState<AdminProgramListItem[] | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(() => {
    listAdminPrograms()
      .then((items) => {
        setPrograms(items)
        setError('')
      })
      .catch((err) => setError(errorMessage(err, 'Failed to load programs')))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <AdminPageHeader
        title="Programs"
        subtitle="Edit the public page, browse card, weekly plan and check-in questions of each program. Changes stay in a draft until you publish."
        actions={
          <button type="button" onClick={() => setCreating(true)} className={primaryButton}>
            <Plus size={16} /> New program
          </button>
        }
      />
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {!programs ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-sm text-gray-900 dark:text-gray-100">
            <thead className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Weeks</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Members</th>
                <th className="px-4 py-3">Last published</th>
              </tr>
            </thead>
            <tbody>
              {programs.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-gray-100 dark:border-gray-700 last:border-0 ${p.status === 'archived' ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3">
                    <Link to={`/admin/programs/${p.id}`} className="font-semibold text-primary dark:text-primary-dark hover:underline">
                      {p.name}
                    </Link>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      /programs/{p.slug}
                      {p.is_core && ' · Core program'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={programListStatus(p)} />
                  </td>
                  <td className="px-4 py-3">{p.week_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatKsh(p.price)}</td>
                  <td className="px-4 py-3">{p.enrolled_count}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.published_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && programs && <NewProgramDialog programs={programs} onClose={() => setCreating(false)} />}
    </div>
  )
}

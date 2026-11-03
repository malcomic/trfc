import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Download, HeartHandshake } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import ReachOutSummary from '../../components/admin/reachOut/ReachOutSummary'
import ReachOutFilters from '../../components/admin/reachOut/ReachOutFilters'
import SavedFilterChips from '../../components/admin/reachOut/SavedFilterChips'
import ReachOutTable from '../../components/admin/reachOut/ReachOutTable'
import OutreachPanel from '../../components/admin/reachOut/OutreachPanel'
import { filtersFromParams, filtersToParams } from '../../components/admin/reachOut/filterParams'
import {
  exportReachOut,
  getReachOutMembers,
  getReachOutStats,
  getSavedFilters,
  type ReachOutFilters as Filters,
  type ReachOutMember,
  type ReachOutStats,
  type SavedFilter,
} from '../../api/admin/reachOut'
import { getZones, type Zone } from '../../api/zones'

const PAGE_SIZE = 50

export default function AdminReachOut() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const filterKey = filtersToParams(filters).toString()

  const [stats, setStats] = useState<ReachOutStats | null>(null)
  const [members, setMembers] = useState<ReachOutMember[]>([])
  const [total, setTotal] = useState(0)
  const [saved, setSaved] = useState<SavedFilter[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [selected, setSelected] = useState<ReachOutMember | null>(null)

  const setFilters = useCallback(
    (next: Filters) => setSearchParams(filtersToParams(next), { replace: false }),
    [setSearchParams]
  )

  const setPage = (next: number) => {
    const params = filtersToParams(filters)
    if (next > 1) params.set('page', String(next))
    setSearchParams(params)
  }

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const data = await getReachOutMembers(filters, page, PAGE_SIZE)
      setMembers(data.members)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
      setError('Failed to load members')
    } finally {
      setLoading(false)
    }
    // filterKey stands in for `filters`, which is a new object on every render.
  }, [filterKey, page])

  const loadSaved = useCallback(() => {
    getSavedFilters().then(setSaved).catch((err) => console.error(err))
  }, [])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  useEffect(() => {
    getReachOutStats().then(setStats).catch((err) => console.error(err))
    getZones().then(setZones).catch(() => setZones([]))
    loadSaved()
  }, [loadSaved])

  const onExport = async () => {
    try {
      setExporting(true)
      await exportReachOut(filters)
    } catch (err) {
      console.error(err)
      setError('Failed to export the list')
    } finally {
      setExporting(false)
    }
  }

  const onLogged = (member: ReachOutMember) => {
    setMembers((prev) => prev.map((m) => (m.id === member.id ? member : m)))
    loadSaved()
  }

  return (
    <div>
      <AdminPageHeader
        title="Reach Out"
        subtitle="What members told us when they signed up. Use it to decide who to contact, and keep track of who was contacted."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={onExport}
              disabled={exporting || total === 0}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              <Download size={16} /> {exporting ? 'Exporting…' : `Export CSV (${total})`}
            </button>
            <HeartHandshake size={28} className="text-primary dark:text-primary-dark hidden sm:block" />
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-6 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      <ReachOutSummary stats={stats} zones={zones} onPick={(field, value) => setFilters({ ...filters, [field]: value })} />

      <SavedFilterChips saved={saved} current={filters} onApply={setFilters} onChanged={loadSaved} />

      <ReachOutFilters filters={filters} zones={zones} onChange={setFilters} />

      <ReachOutTable
        members={members}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        loading={loading}
        onPage={setPage}
        onSelect={setSelected}
      />

      {selected && <OutreachPanel member={selected} onClose={() => setSelected(null)} onLogged={onLogged} />}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertCircle, Briefcase, ChevronLeft, ChevronRight, Download, ExternalLink, Film, Link2, Loader, Search, X } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminMobileCard, { AdminMobileCardRow } from '../../components/admin/AdminMobileCard'
import AdminResponsiveData from '../../components/admin/AdminResponsiveData'
import ApplicationDrawer from '../../components/admin/hiring/ApplicationDrawer'
import NotifySettingsCard from '../../components/admin/hiring/NotifySettingsCard'
import { HiringStatusBadge, hoursLabel } from '../../components/admin/hiring/hiringDisplay'
import { hiringFiltersFromParams, hiringFiltersToParams } from '../../components/admin/hiring/hiringParams'
import { formatDate } from '../../components/admin/reachOut/memberDisplay'
import { adminSelectClass } from '../../components/admin/reachOut/ReachOutFilters'
import {
  HIRING_STATUSES,
  HIRING_STATUS_LABELS,
  exportApplications,
  getApplications,
  getHiringSettings,
  type ApplicationsPage,
  type CoachApplication,
  type HiringFilters,
  type HiringSettings,
} from '../../api/admin/hiring'
import { COACH_HIRING_PATH, HOUR_OPTIONS } from '../../content/coachHiring'

const SEARCH_DELAY_MS = 350

function StatusTabs({ filters, counts, onChange }: { filters: HiringFilters; counts: ApplicationsPage['counts'] | null; onChange: (next: HiringFilters) => void }) {
  const tabs = [{ id: undefined, label: 'All', count: counts?.all }, ...HIRING_STATUSES.map((s) => ({ id: s, label: HIRING_STATUS_LABELS[s], count: counts?.[s] }))]
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4" role="tablist" aria-label="Filter by status">
      {tabs.map((tab) => {
        const active = filters.status === tab.id
        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange({ ...filters, status: tab.id })}
            className={`inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg text-sm font-semibold whitespace-nowrap border transition ${
              active
                ? 'bg-primary dark:bg-primary-dark text-white dark:text-black border-transparent'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
            <span className={`tabular-nums text-xs px-1.5 py-0.5 rounded-full ${active ? 'bg-black/15' : 'bg-gray-100 dark:bg-gray-700'}`}>{tab.count ?? '-'}</span>
          </button>
        )
      })}
    </div>
  )
}

function FilterBar({ filters, onChange }: { filters: HiringFilters; onChange: (next: HiringFilters) => void }) {
  const [search, setSearch] = useState(filters.q ?? '')

  useEffect(() => setSearch(filters.q ?? ''), [filters.q])

  useEffect(() => {
    const trimmed = search.trim()
    if (trimmed === (filters.q ?? '')) return
    const timer = setTimeout(() => onChange({ ...filters, q: trimmed || undefined }), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
    // Only the typed text should restart the timer.
  }, [search])

  const set = (patch: Partial<HiringFilters>) => onChange({ ...filters, ...patch })
  const hasExtra = Boolean(filters.q || filters.hours || filters.threeHours || filters.from || filters.to)

  return (
    <section className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <span className="sr-only">Search by name, email, phone or area</span>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone or area" className={`${adminSelectClass} pl-9`} />
        </label>
        {hasExtra && (
          <button
            type="button"
            onClick={() => onChange({ status: filters.status })}
            className="inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={14} /> Clear filters
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-gray-700 dark:text-gray-300">
        <label className="block">
          <span className="block mb-1">Hours</span>
          <select value={filters.hours ?? ''} onChange={(e) => set({ hours: (e.target.value || undefined) as HiringFilters['hours'] })} className={adminSelectClass}>
            <option value="">Any time</option>
            {HOUR_OPTIONS.map((h) => (
              <option key={h.id} value={h.id}>{h.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block mb-1">3 hours every day</span>
          <select value={filters.threeHours ?? ''} onChange={(e) => set({ threeHours: (e.target.value || undefined) as HiringFilters['threeHours'] })} className={adminSelectClass}>
            <option value="">Either</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="block">
          <span className="block mb-1">Applied from</span>
          <input type="date" value={filters.from ?? ''} max={filters.to} onChange={(e) => set({ from: e.target.value || undefined })} className={adminSelectClass} />
        </label>
        <label className="block">
          <span className="block mb-1">Applied up to</span>
          <input type="date" value={filters.to ?? ''} min={filters.from} onChange={(e) => set({ to: e.target.value || undefined })} className={adminSelectClass} />
        </label>
      </div>
    </section>
  )
}

function VideoCell({ app }: { app: CoachApplication }) {
  const Icon = app.video_source === 'upload' ? Film : Link2
  return (
    <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
      <Icon size={16} aria-hidden="true" /> {app.video_source === 'upload' ? 'Uploaded' : 'Link'}
    </span>
  )
}

export default function AdminHiring() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => hiringFiltersFromParams(searchParams), [searchParams])
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const openId = searchParams.get('id')
  const filterKey = hiringFiltersToParams(filters).toString()

  const [data, setData] = useState<ApplicationsPage | null>(null)
  const [settings, setSettings] = useState<HiringSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const writeParams = (next: HiringFilters, nextPage = 1, id: string | null = openId) => {
    const params = hiringFiltersToParams(next)
    if (nextPage > 1) params.set('page', String(nextPage))
    if (id) params.set('id', id)
    setSearchParams(params)
  }

  const setFilters = (next: HiringFilters) => writeParams(next, 1)
  const openApplication = (id: string | null) => writeParams(filters, page, id)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      setData(await getApplications(filters, page))
    } catch (err) {
      console.error(err)
      setError('Failed to load applications')
    } finally {
      setLoading(false)
    }
    // filterKey stands in for `filters`, which is a new object on every render.
  }, [filterKey, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getHiringSettings().then(setSettings).catch((err) => console.error(err))
  }, [])

  const onExport = async () => {
    try {
      setExporting(true)
      await exportApplications(filters)
    } catch (err) {
      console.error(err)
      setError('Failed to export the list')
    } finally {
      setExporting(false)
    }
  }

  const onSaved = (updated: CoachApplication) => {
    const before = data?.rows.find((r) => r.id === updated.id)
    setData((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.id === updated.id ? updated : r)) } : prev))
    if (before && before.status !== updated.status) load()
  }

  const onDeleted = () => {
    openApplication(null)
    load()
  }

  const rows = data?.rows ?? []
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 25
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div>
      <AdminPageHeader
        title="Hiring"
        subtitle="Coach applications from the Coach with us page. Every answer, the video, and where each applicant stands."
        actions={
          <div className="flex items-center gap-3">
            <a
              href={COACH_HIRING_PATH}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ExternalLink size={16} /> View page
            </a>
            <button
              onClick={onExport}
              disabled={exporting || total === 0}
              className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition"
            >
              <Download size={16} /> {exporting ? 'Exporting…' : `Export CSV (${total})`}
            </button>
            <Briefcase size={28} className="text-primary dark:text-primary-dark hidden sm:block" />
          </div>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3 mb-6 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      <NotifySettingsCard settings={settings} onSaved={setSettings} />

      <StatusTabs filters={filters} counts={data?.counts ?? null} onChange={setFilters} />

      <FilterBar filters={filters} onChange={setFilters} />

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : ''}>
          <AdminResponsiveData
            isEmpty={rows.length === 0}
            empty={
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center text-gray-600 dark:text-gray-400">
                {data?.counts.all ? 'No applications match these filters.' : 'No applications yet. They will show here as soon as someone applies.'}
              </div>
            }
            desktop={
              <table className="w-full min-w-[960px] text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    {['Applicant', 'Based in', 'Hours', '3 hrs/day', 'Video', 'Status', 'Handled by', 'Applied'].map((h) => (
                      <th key={h} className="px-3 py-3 text-left font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => openApplication(app.id)}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-900 dark:text-gray-100 align-top cursor-pointer"
                    >
                      <td className="px-3 py-3">
                        <button type="button" onClick={(e) => { e.stopPropagation(); openApplication(app.id) }} className="font-semibold text-left hover:underline">
                          {app.full_name}
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{app.phone}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 break-all">{app.email}</div>
                      </td>
                      <td className="px-3 py-3">{app.location}</td>
                      <td className="px-3 py-3">{hoursLabel(app.hours)}</td>
                      <td className="px-3 py-3">{app.can_give_3_hours ? 'Yes' : 'No'}</td>
                      <td className="px-3 py-3"><VideoCell app={app} /></td>
                      <td className="px-3 py-3"><HiringStatusBadge status={app.status} /></td>
                      <td className="px-3 py-3">{app.handled_by_name ?? '-'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{formatDate(app.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
            mobile={rows.map((app) => (
              <AdminMobileCard
                key={app.id}
                footer={
                  <button type="button" onClick={() => openApplication(app.id)} className="inline-flex items-center gap-1.5 min-h-[44px] px-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Open application
                  </button>
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white m-0">{app.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 m-0">{app.phone}</p>
                  </div>
                  <HiringStatusBadge status={app.status} />
                </div>
                <AdminMobileCardRow label="Based in" value={app.location} />
                <AdminMobileCardRow label="Hours" value={hoursLabel(app.hours)} />
                <AdminMobileCardRow label="3 hrs/day" value={app.can_give_3_hours ? 'Yes' : 'No'} />
                <AdminMobileCardRow label="Video" value={<VideoCell app={app} />} />
                <AdminMobileCardRow label="Handled by" value={app.handled_by_name ?? '-'} />
                <AdminMobileCardRow label="Applied" value={formatDate(app.created_at)} />
              </AdminMobileCard>
            ))}
          />

          {total > 0 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-gray-700 dark:text-gray-300">
              <span>{from}-{to} of {total.toLocaleString()}</span>
              <div className="flex items-center gap-2">
                <button type="button" disabled={page <= 1} onClick={() => writeParams(filters, page - 1)} className="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40">
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="tabular-nums">{page} / {pages}</span>
                <button type="button" disabled={page >= pages} onClick={() => writeParams(filters, page + 1)} className="inline-flex items-center gap-1 px-3 min-h-[44px] rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40">
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {openId && (
        <ApplicationDrawer id={openId} admins={settings?.admins ?? []} onClose={() => openApplication(null)} onSaved={onSaved} onDeleted={onDeleted} />
      )}
    </div>
  )
}

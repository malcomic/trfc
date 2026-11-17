import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader, X } from 'lucide-react'
import {
  listAdminCoaches,
  setCoachPrograms,
  updateCoachStatus,
  type AdminCoach,
} from '../../api/admin/coaches'
import { listAdminPrograms, type AdminProgramListItem } from '../../api/admin/programs'
import { formatDate } from '../../components/admin/reachOut/memberDisplay'

function AssignProgramsModal({
  coach,
  coaches,
  programs,
  onClose,
  onSaved,
}: {
  coach: AdminCoach
  coaches: AdminCoach[]
  programs: AdminProgramListItem[]
  onClose: () => void
  onSaved: (coach: AdminCoach) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(coach.programs.map((p) => p.id)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const ownerByProgram = useMemo(() => {
    const map = new Map<string, { userId: string; name: string }>()
    for (const c of coaches) {
      for (const p of c.programs) {
        map.set(p.id, { userId: c.userId, name: c.name })
      }
    }
    return map
  }, [coaches])

  const conflicts = useMemo(() => {
    return [...selected]
      .map((id) => {
        const owner = ownerByProgram.get(id)
        if (!owner || owner.userId === coach.userId) return null
        const program = programs.find((p) => p.id === id)
        return { programId: id, programName: program?.name ?? id, ownerName: owner.name }
      })
      .filter(Boolean) as { programId: string; programName: string; ownerName: string }[]
  }, [selected, ownerByProgram, coach.userId, programs])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    if (conflicts.length > 0) {
      const lines = conflicts.map((c) => `• ${c.programName} (from ${c.ownerName})`).join('\n')
      const ok = window.confirm(
        `One coach per program. Reassign these programs?\n\n${lines}\n\nThe previous coach will lose access.`
      )
      if (!ok) return
    }
    try {
      setSaving(true)
      setError('')
      const updated = await setCoachPrograms(coach.userId, [...selected])
      onSaved({ ...coach, programs: updated })
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not save assignments')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-900 shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold m-0">Assign programs</h2>
            <p className="text-sm text-gray-500 m-0 mt-0.5">
              {coach.name} · one coach per program
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 min-h-[44px] min-w-[44px]" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {programs.length === 0 ? (
            <p className="text-sm text-gray-500">No programs in the catalog yet.</p>
          ) : (
            programs.map((p) => {
              const owner = ownerByProgram.get(p.id)
              const ownedElsewhere = owner && owner.userId !== coach.userId
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
                >
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="ml-auto text-xs text-gray-500 text-right">
                    {ownedElsewhere ? `Assigned to ${owner.name}` : p.status}
                  </span>
                </label>
              )
            })
          )}
          {error && <p className="text-sm text-red-600 m-0">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 min-h-[44px] rounded-lg border font-semibold">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="px-4 min-h-[44px] rounded-lg bg-primary text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCoaches() {
  const [coaches, setCoaches] = useState<AdminCoach[]>([])
  const [programs, setPrograms] = useState<AdminProgramListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigning, setAssigning] = useState<AdminCoach | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([listAdminCoaches(), listAdminPrograms()])
      .then(([coachRows, programRows]) => {
        if (cancelled) return
        setCoaches(coachRows)
        setPrograms(programRows)
      })
      .catch(() => !cancelled && setError('Could not load coaches.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  const toggleStatus = async (coach: AdminCoach) => {
    const next = coach.status === 'active' ? 'suspended' : 'active'
    try {
      setBusyId(coach.userId)
      setError('')
      const updated = await updateCoachStatus(coach.userId, next)
      setCoaches((rows) => rows.map((c) => (c.userId === coach.userId ? { ...c, status: updated.status } : c)))
    } catch (err: any) {
      setError(err.response?.data?.error || 'Could not update status')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold m-0">Coaches</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 m-0 mt-1">
          Activated coaches from Hiring. Each program can have one coach; reassigning moves ownership.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 m-0">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader className="animate-spin" size={18} /> Loading…
        </div>
      ) : coaches.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No coaches yet. Accept an application in{' '}
          <Link to="/admin/hiring" className="font-semibold text-blue-600 dark:text-blue-400">
            Hiring
          </Link>{' '}
          and wait for them to activate.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Coach</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Programs</th>
                <th className="px-4 py-3 font-semibold">Activated</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr key={coach.userId} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-3">
                    <div className="font-medium">{coach.name}</div>
                    <div className="text-gray-500">{coach.email}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{coach.status}</td>
                  <td className="px-4 py-3">
                    {coach.programs.length === 0
                      ? 'None'
                      : coach.programs.map((p) => p.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(coach.activatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setAssigning(coach)}
                        className="px-3 min-h-[40px] rounded-lg border font-semibold"
                      >
                        Assign programs
                      </button>
                      <button
                        type="button"
                        disabled={busyId === coach.userId}
                        onClick={() => toggleStatus(coach)}
                        className="px-3 min-h-[40px] rounded-lg border font-semibold disabled:opacity-50"
                      >
                        {coach.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                      {coach.applicationId && (
                        <Link
                          to={`/admin/hiring?id=${coach.applicationId}`}
                          className="px-3 min-h-[40px] inline-flex items-center rounded-lg border font-semibold"
                        >
                          Application
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assigning && (
        <AssignProgramsModal
          coach={assigning}
          coaches={coaches}
          programs={programs}
          onClose={() => setAssigning(null)}
          onSaved={(updated) => {
            setCoaches((rows) => {
              const next = rows.map((c) => {
                if (c.userId === updated.userId) return updated
                const kept = c.programs.filter((p) => !updated.programs.some((up) => up.id === p.id))
                return kept.length === c.programs.length ? c : { ...c, programs: kept }
              })
              return next
            })
          }}
        />
      )}
    </div>
  )
}

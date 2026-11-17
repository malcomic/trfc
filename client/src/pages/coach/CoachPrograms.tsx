import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { listCoachPrograms, type CoachProgramSummary } from '../../api/coaches'

export default function CoachPrograms() {
  const [programs, setPrograms] = useState<CoachProgramSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    listCoachPrograms()
      .then((rows) => !cancelled && setPrograms(rows))
      .catch(() => !cancelled && setError('Could not load programs.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="m-0 font-bebas text-4xl text-chalk light:text-chalk-light">My programs</h1>
        <p className="m-0 mt-2 font-barlow text-fog light:text-fog-light">
          Programs assigned to you by an admin. You cannot add or remove assignments yourself.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-fog light:text-fog-light font-barlow">
          <Loader className="animate-spin" size={18} /> Loading…
        </div>
      )}
      {error && <p className="m-0 text-red-500 font-barlow text-sm">{error}</p>}

      {!loading && !error && programs.length === 0 && (
        <p className="m-0 font-barlow text-fog light:text-fog-light">No programs assigned yet.</p>
      )}

      <ul className="m-0 p-0 list-none divide-y divide-white/10 light:divide-black/10 border border-white/10 light:border-black/10">
        {programs.map((program) => (
          <li key={program.id}>
            <Link
              to={`/dashboard/coach/programs/${program.slug}`}
              className="flex items-center justify-between gap-4 px-4 py-4 no-underline hover:bg-white/5 light:hover:bg-black/5"
            >
              <div>
                <div className="font-bebas text-xl text-chalk light:text-chalk-light">{program.name}</div>
                <div className="font-barlow text-sm text-fog light:text-fog-light">
                  {program.enrolledCount} enrolled
                </div>
              </div>
              <span className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light">
                Open
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

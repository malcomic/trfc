import { useCallback, useEffect, useState } from 'react'
import { getProgramPlan, type ProgramPlan } from '../api/programs'
import type { ProgramId } from '../content/programs'
import { toLoadError, type WeekLoadError } from './useProgramWeek'

export function useProgramPlan(program: ProgramId | null) {
  const [plan, setPlan] = useState<ProgramPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<WeekLoadError | null>(null)

  const load = useCallback(async () => {
    if (!program) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setPlan(await getProgramPlan(program))
    } catch (err) {
      setPlan(null)
      setError(toLoadError(err))
    } finally {
      setLoading(false)
    }
  }, [program])

  useEffect(() => {
    load()
  }, [load])

  return { plan, loading, error, reload: load }
}

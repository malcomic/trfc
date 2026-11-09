import { useCallback, useEffect, useRef, useState } from 'react'
import { getProgramWeek, setSessionDone, type ProgramDay, type ProgramWeekDetail } from '../api/programs'
import type { ProgramId } from '../content/programs'
import { useMemberDashboard } from '../context/MemberDashboardContext'
import { PROGRAM_COPY } from '../content/programPages'

export interface WeekLoadError {
  message: string
  locked: boolean
  notEnrolled: boolean
}

export function toLoadError(err: any): WeekLoadError {
  const data = err?.response?.data
  const locked = Boolean(data?.locked)
  return {
    message: data?.error || PROGRAM_COPY.loadFailed,
    locked,
    notEnrolled: err?.response?.status === 403 && !locked,
  }
}

/** Loads one program week and saves Done boxes and rounds optimistically, rolling back if the save fails. */
export function useProgramWeek(program: ProgramId | null, week: number | null) {
  const { notify } = useMemberDashboard()
  const [data, setData] = useState<ProgramWeekDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<WeekLoadError | null>(null)
  const dataRef = useRef<ProgramWeekDetail | null>(null)
  dataRef.current = data

  const load = useCallback(async () => {
    if (!program || !week) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setData(await getProgramWeek(program, week))
    } catch (err: any) {
      setData(null)
      setError(toLoadError(err))
    } finally {
      setLoading(false)
    }
  }, [program, week])

  useEffect(() => {
    load()
  }, [load])

  const patchDay = useCallback((day: number, patch: Partial<ProgramDay>) => {
    setData((d) => (d ? { ...d, days: d.days.map((x) => (x.day_number === day ? { ...x, ...patch } : x)) } : d))
  }, [])

  const updateDay = useCallback(
    async (day: number, body: { done: boolean; roundsDone?: number }) => {
      if (!program || !week) return false
      const before = dataRef.current?.days.find((d) => d.day_number === day)
      patchDay(day, { done: body.done, ...(body.roundsDone !== undefined ? { rounds_done: body.roundsDone } : {}) })
      try {
        const saved = await setSessionDone(program, week, day, body)
        patchDay(day, { done: saved.done, rounds_done: saved.rounds_done })
        return true
      } catch (err: any) {
        if (before) patchDay(day, { done: before.done, rounds_done: before.rounds_done })
        notify('error', PROGRAM_COPY.session.saveFailed, err.response?.data?.error)
        return false
      }
    },
    [program, week, patchDay, notify]
  )

  const setDayDone = useCallback(
    (day: number, done: boolean) => updateDay(day, { done }),
    [updateDay]
  )

  const setRounds = useCallback(
    (day: number, roundsDone: number) => {
      const current = dataRef.current?.days.find((d) => d.day_number === day)
      return updateDay(day, { done: current?.done ?? false, roundsDone })
    },
    [updateDay]
  )

  return { data, loading, error, reload: load, setDayDone, setRounds }
}

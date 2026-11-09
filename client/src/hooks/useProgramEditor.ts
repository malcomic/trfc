import { useCallback, useEffect, useRef, useState } from 'react'
import * as adminPrograms from '../api/admin/programs'
import type { AdminProgramEditor, DraftSaveResult, DraftSection, SectionValue } from '../api/admin/programs'
import type { ProgramWeekContent } from '../types/programContent'

export function errorMessage(err: any, fallback: string): string {
  return err?.response?.data?.error || fallback
}

export function useProgramEditor(id: string | undefined) {
  const [editor, setEditor] = useState<AdminProgramEditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)
  const editorRef = useRef<AdminProgramEditor | null>(null)
  editorRef.current = editor

  const reload = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      setEditor(await adminPrograms.getAdminProgram(id))
      setLoadError('')
      setConflict(false)
      setError('')
    } catch (err) {
      setLoadError(errorMessage(err, 'Failed to load this program'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void reload()
  }, [reload])

  const guard = () => ({ expectedUpdatedAt: editorRef.current?.draftUpdatedAt ?? null })

  /** Runs a draft change; returns true when saved. */
  const runDraft = useCallback(
    async (fn: () => Promise<DraftSaveResult>, fallback: string): Promise<boolean> => {
      setBusy(true)
      setError('')
      try {
        const saved = await fn()
        setEditor((prev) =>
          prev ? { ...prev, content: saved.content, hasDraft: true, draftUpdatedAt: saved.draftUpdatedAt } : prev
        )
        return true
      } catch (err: any) {
        if (err?.response?.data?.conflict) setConflict(true)
        setError(errorMessage(err, fallback))
        return false
      } finally {
        setBusy(false)
      }
    },
    []
  )

  /** Runs an action that returns the whole editor payload. */
  const runAction = useCallback(async (fn: () => Promise<AdminProgramEditor>, fallback: string): Promise<boolean> => {
    setBusy(true)
    setError('')
    try {
      setEditor(await fn())
      return true
    } catch (err) {
      setError(errorMessage(err, fallback))
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  const saveSection = <S extends DraftSection>(section: S, value: SectionValue<S>) =>
    id
      ? runDraft(() => adminPrograms.saveDraftSection(id, section, value, guard()), 'Failed to save your changes')
      : Promise.resolve(false)

  const saveWeek = (week: number, value: ProgramWeekContent) =>
    id ? runDraft(() => adminPrograms.saveDraftWeek(id, week, value, guard()), 'Failed to save this week') : Promise.resolve(false)

  const addWeek = (copyFrom: number | null) =>
    id ? runDraft(() => adminPrograms.addDraftWeek(id, copyFrom, guard()), 'Failed to add a week') : Promise.resolve(false)

  const removeWeek = (week: number) =>
    id ? runDraft(() => adminPrograms.removeDraftWeek(id, week, guard()), 'Failed to remove the week') : Promise.resolve(false)

  const moveWeek = (week: number, direction: 'up' | 'down') =>
    id
      ? runDraft(() => adminPrograms.moveDraftWeek(id, week, direction, guard()), 'Failed to move the week')
      : Promise.resolve(false)

  const saveSettings = (body: { name?: string; slug?: string; sortOrder?: number }) =>
    id ? runAction(() => adminPrograms.updateProgramSettings(id, body), 'Failed to save the settings') : Promise.resolve(false)

  const discard = () =>
    id ? runAction(() => adminPrograms.discardDraft(id), 'Failed to discard the draft') : Promise.resolve(false)

  const archive = () =>
    id ? runAction(() => adminPrograms.archiveProgram(id), 'Failed to archive the program') : Promise.resolve(false)

  const unarchive = () =>
    id ? runAction(() => adminPrograms.unarchiveProgram(id), 'Failed to bring the program back') : Promise.resolve(false)

  const restore = (versionId: string) =>
    id
      ? runAction(() => adminPrograms.restoreProgramVersion(id, versionId), 'Failed to restore this version')
      : Promise.resolve(false)

  return {
    editor,
    setEditor,
    loading,
    loadError,
    busy,
    error,
    setError,
    conflict,
    reload,
    saveSection,
    saveWeek,
    addWeek,
    removeWeek,
    moveWeek,
    saveSettings,
    discard,
    archive,
    unarchive,
    restore,
  }
}

export type ProgramEditorApi = ReturnType<typeof useProgramEditor>

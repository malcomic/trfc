import type { FinderAnswers, FinderDraft, FinderStepId } from './types'

const STORAGE_KEY = 'trfc_finder_v2'

export function emptyDraft(stepId: FinderStepId = 'Main'): FinderDraft {
  return {
    version: 2,
    stepId,
    answers: {},
    updatedAt: new Date().toISOString(),
  }
}

export function loadFinderDraft(): FinderDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FinderDraft
    if (!parsed || parsed.version !== 2 || typeof parsed.stepId !== 'string') return null
    return {
      ...emptyDraft(),
      ...parsed,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
    }
  } catch {
    return null
  }
}

export function saveFinderDraft(draft: FinderDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }))
  } catch {
    /* storage unavailable */
  }
}

export function clearFinderDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

export function patchFinderAnswers(answers: Partial<FinderAnswers>, stepId?: FinderStepId): FinderDraft {
  const current = loadFinderDraft() ?? emptyDraft()
  const next: FinderDraft = {
    ...current,
    stepId: stepId ?? current.stepId,
    answers: { ...current.answers, ...answers },
    updatedAt: new Date().toISOString(),
  }
  saveFinderDraft(next)
  return next
}

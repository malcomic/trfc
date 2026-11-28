import { loadFinderDraft } from './storage'

/** Program id from an in-progress or completed finder draft (ignores legacy trfc_quiz_v1). */
export function loadFinderProgramHint(): string | null {
  const draft = loadFinderDraft()
  const id = draft?.derived?.programId
  return typeof id === 'string' && id ? id : null
}

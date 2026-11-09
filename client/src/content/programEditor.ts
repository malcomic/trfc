import type { AdminProgramListItem } from '../api/admin/programs'
import type { CheckinQuestion, DayKind, ProgramDay, ProgramWeekContent, QuestionType } from '../types/programContent'

export const PLACEHOLDER_MARK = 'to be added'

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  run: 'Workout',
  strength: 'Strength',
  rest: 'Rest day',
  community: 'Saturday community run',
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  choice: 'Pick one answer',
  scale: 'Scale (pick one)',
  text: 'Free text',
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function isPlaceholder(text: string | null | undefined): boolean {
  return !!text && text.toLowerCase().includes(PLACEHOLDER_MARK)
}

/** A week is unfinished while any of its text still says "[To be added]". */
export function isWeekUnfinished(week: ProgramWeekContent): boolean {
  const texts = [
    week.summary,
    week.purpose,
    week.coachNote,
    week.tip,
    ...week.days.flatMap((d) => [d.title, ...d.steps.warmUp, ...d.steps.coolDown]),
  ]
  return texts.some(isPlaceholder)
}

/** One list item per line; blank lines are dropped. */
export function textToList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function listToText(list: string[] | undefined): string {
  return (list ?? []).join('\n')
}

export function moveItem<T>(list: T[], index: number, direction: 'up' | 'down'): T[] {
  const to = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list
  const next = [...list]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

export function emptyDay(day: number, kind: DayKind = 'run'): ProgramDay {
  return { day, kind, title: '', steps: { warmUp: [], coolDown: [] } }
}

/** A stable answer key made from the question text, unique among the existing questions. */
export function questionIdFromLabel(label: string, taken: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^[^a-z]+/, '')
      .slice(0, 24) || 'question'
  let id = base
  let n = 2
  while (taken.includes(id)) id = `${base}_${n++}`
  return id
}

export function newQuestion(taken: string[]): CheckinQuestion {
  return { id: questionIdFromLabel('question', taken), label: '', type: 'choice', options: ['', ''], required: true }
}

export type ProgramListStatus = 'Live' | 'Live, with unpublished changes' | 'Draft' | 'Archived'

export function programListStatus(item: Pick<AdminProgramListItem, 'status' | 'draft_updated_at' | 'published_at'>): ProgramListStatus {
  if (item.status === 'archived') return 'Archived'
  if (item.status === 'draft' || !item.published_at) return 'Draft'
  return item.draft_updated_at ? 'Live, with unpublished changes' : 'Live'
}

/** Same rules as the server, so the web address preview matches what gets saved. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function sameContent(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

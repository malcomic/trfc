import { FormEvent, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ClipboardList, Loader } from 'lucide-react'
import { deleteMyAnswers, getMyAnswers, updateMyAnswers } from '../../api/memberAnswers'
import { getZones, type Zone } from '../../api/zones'
import { ANSWERS_PENDING_KEY, EMPTY_ANSWERS, compactAnswers, type SignupAnswers } from '../../content/signupQuestions'
import { cardSurface } from '../../utils/themeClasses'
import { Button } from '../ui'
import SignupQuestions from '../register/SignupQuestions'

export const MY_ANSWERS_ANCHOR = 'my-answers'

type Notify = (type: 'success' | 'error', title: string, message?: string) => void

function formatSavedAt(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function MyAnswersForm({ notify }: { notify: Notify }) {
  const location = useLocation()
  const [answers, setAnswers] = useState<SignupAnswers>(EMPTY_ANSWERS)
  const [zones, setZones] = useState<Zone[]>([])
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyAnswers(), getZones().catch(() => [] as Zone[])])
      .then(([stored, zoneList]) => {
        if (cancelled) return
        setAnswers({
          hardest_now: stored.hardest_now ?? '',
          hardest_now_other: stored.hardest_now_other ?? '',
          goal_3m: stored.goal_3m ?? '',
          time_with_trfc: stored.time_with_trfc ?? '',
          want_more: stored.want_more ?? '',
          exercise_frequency: stored.exercise_frequency ?? '',
          zone: stored.zone ?? '',
        })
        setSavedAt(stored.answers_updated_at ?? stored.answers_saved_at)
        setZones(zoneList)
      })
      .catch(() => {
        if (!cancelled) notify('error', 'Could not load your answers')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [notify])

  useEffect(() => {
    if (loading || location.hash !== `#${MY_ANSWERS_ANCHOR}`) return
    document.getElementById(MY_ANSWERS_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [loading, location.hash])

  const setAnswer = (field: keyof SignupAnswers, value: string) => setAnswers((prev) => ({ ...prev, [field]: value }))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const stored = await updateMyAnswers(compactAnswers(answers))
      setSavedAt(stored.answers_updated_at ?? stored.answers_saved_at)
      localStorage.removeItem(ANSWERS_PENDING_KEY)
      notify('success', 'Answers saved')
    } catch {
      notify('error', 'Could not save your answers', 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      setDeleting(true)
      await deleteMyAnswers()
      setAnswers(EMPTY_ANSWERS)
      setSavedAt(null)
      setConfirmDelete(false)
      localStorage.removeItem(ANSWERS_PENDING_KEY)
      notify('success', 'Your answers were deleted')
    } catch {
      notify('error', 'Could not delete your answers', 'Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const savedLabel = formatSavedAt(savedAt)

  return (
    <form id={MY_ANSWERS_ANCHOR} onSubmit={save} className={`${cardSurface} p-6 space-y-4 mt-6 scroll-mt-24`}>
      <div className="flex items-start gap-3 mb-5">
        <ClipboardList size={20} className="text-accent light:text-accent-light mt-1" />
        <div>
          <h2 className="font-barlow-condensed font-bold text-xl tracking-tighter">My answers</h2>
          <p className="text-sm text-fog light:text-fog-light">
            Optional. They help us plan events and programs. {savedLabel ? `Last saved ${savedLabel}.` : 'Not answered yet.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader className="w-6 h-6 animate-spin text-accent light:text-accent-light" />
        </div>
      ) : (
        <>
          <SignupQuestions values={answers} onChange={setAnswer} zones={zones} idPrefix="my-answers-q" />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" isLoading={saving}>
              Save answers
            </Button>
            {savedAt &&
              (confirmDelete ? (
                <>
                  <span className="text-sm text-fog light:text-fog-light">Delete all your answers?</span>
                  <Button type="button" variant="outline" isLoading={deleting} onClick={remove}>
                    Yes, delete
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
                  Delete my answers
                </Button>
              ))}
          </div>
        </>
      )}
    </form>
  )
}

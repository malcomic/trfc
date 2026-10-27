import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { enrollProgram } from '../../api/programs'
import { programPath, type Program } from '../../content/programs'
import { loadQuizResult } from '../../content/quiz'

export const JOIN_ANCHOR = 'join'

function scrollToJoin() {
  document.getElementById(JOIN_ANCHOR)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function useProgramJoin(program: Program) {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [comingSoon, setComingSoon] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const handledReturn = useRef(false)

  const join = useCallback(async () => {
    if (!user) {
      const back = `${programPath(program.id)}?join=1`
      navigate(`/register?redirect=${encodeURIComponent(back)}`)
      return
    }
    if (program.price === 0) {
      if (joining) return
      setJoining(true)
      setJoinError('')
      try {
        const quiz = loadQuizResult()
        await enrollProgram(
          program.id,
          quiz ? { goal: quiz.goal, experience: quiz.experience, days: quiz.days } : null
        )
        navigate('/dashboard', { state: { joined: program.id } })
      } catch (err: any) {
        setJoinError(err?.response?.data?.error || 'We could not add you to the program. Please try again.')
        requestAnimationFrame(scrollToJoin)
      } finally {
        setJoining(false)
      }
      return
    }
    setComingSoon(true)
    requestAnimationFrame(scrollToJoin)
  }, [user, program, navigate, joining])

  useEffect(() => {
    if (isLoading || handledReturn.current || searchParams.get('join') !== '1') return
    handledReturn.current = true
    const next = new URLSearchParams(searchParams)
    next.delete('join')
    setSearchParams(next, { replace: true })
    if (user) void join()
    else requestAnimationFrame(scrollToJoin)
  }, [isLoading, searchParams, setSearchParams, user, join])

  return { join, comingSoon, joining, joinError }
}

import { Link } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { useMemberDashboard } from '../../context/MemberDashboardContext'
import { DASHBOARD_COPY } from '../../content/dashboard'
import { PROGRAMS, PROGRAM_ORDER, formatKsh, programPath } from '../../content/programs'
import { loadQuizResult } from '../../content/quiz'
import { formatDate } from '../../utils/captainDisplay'
import MemberPageHeader from '../../components/member/MemberPageHeader'
import ProgramProgressCard from '../../components/member/dashboard/ProgramProgressCard'
import CtaButton from '../../components/programs/CtaButton'
import { dashCard, dashHeading, dashLink, dashMuted } from '../../components/member/dashboard/ui'

const copy = DASHBOARD_COPY.programs

export default function MemberPrograms() {
  const { data, loading } = useMemberDashboard()
  const enrolled = data?.program ?? null
  const quiz = loadQuizResult()
  const others = PROGRAM_ORDER.filter((id) => id !== enrolled?.id).map((id) => PROGRAMS[id])

  return (
    <>
      <MemberPageHeader title={copy.title} highlight={copy.highlight} subtitle={copy.subtitle} />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader className="w-10 h-10 animate-spin text-cta" />
        </div>
      ) : (
        <div className="space-y-6">
          {enrolled ? (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={dashMuted}>
                  {copy.joinedOn(formatDate(enrolled.enrolled_at))}
                </p>
                <Link to={programPath(enrolled.id)} className={`${dashLink} text-sm`}>
                  {copy.viewPage}
                </Link>
              </div>
              <ProgramProgressCard programId={enrolled.id} />
            </section>
          ) : (
            <div className={dashCard}>
              <h2 className={dashHeading}>{copy.noneHeading}</h2>
              <p className={`${dashMuted} mt-2`}>{copy.noneBody}</p>
              <CtaButton to={programPath('foundations')} size="sm" className="mt-5">
                {DASHBOARD_COPY.program.startFree}
              </CtaButton>
            </div>
          )}

          {quiz && (
            <div className={dashCard}>
              <h2 className={dashHeading}>{copy.quizHeading}</h2>
              <p className="mt-2 text-chalk light:text-chalk-light">{copy.quizMatch(PROGRAMS[quiz.program].name)}</p>
              {quiz.nextUp && <p className={`${dashMuted} mt-1`}>{copy.nextUp(PROGRAMS[quiz.nextUp].name)}</p>}
            </div>
          )}

          <section>
            <h2 className={`${dashHeading} mb-4`}>{copy.others}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {others.map((p) => (
                <Link
                  key={p.id}
                  to={programPath(p.id)}
                  className={`${dashCard} !p-5 no-underline block hover:border-cta transition-colors`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-barlow font-semibold text-chalk light:text-chalk-light">{p.name}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        p.price === 0 ? 'bg-cta text-cta-ink' : 'bg-smoke light:bg-smoke-light text-fog light:text-fog-light'
                      }`}
                    >
                      {p.price === 0 ? copy.free : copy.comingSoon}
                    </span>
                  </div>
                  <p className={`${dashMuted} mt-2`}>{p.tagline}</p>
                  <p className="mt-3 text-sm text-chalk light:text-chalk-light">
                    {p.lengthWeeks} weeks · {formatKsh(p.price)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

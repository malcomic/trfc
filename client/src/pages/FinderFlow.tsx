import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FINDER_BODY_SLOTS, getSiteImages, type SiteImages } from '../api/siteImages'
import { createFinderAccount, createFinderCheckout } from '../api/finder'
import { initiateSTKPush } from '../api/payments'
import { enrollProgram } from '../api/programs'
import { ChoiceList, MultiChoiceList } from '../components/finder/ChoiceList'
import FinderChart from '../components/finder/FinderChart'
import FinderShell from '../components/finder/FinderShell'
import PhotoCarousel from '../components/finder/PhotoCarousel'
import PaymentStatusModal from '../components/PaymentStatusModal'
import { replyBody } from '../content/finder/replies'
import {
  ACTIVITY_OPTIONS,
  AGE_OPTIONS,
  CARDIO_OPTIONS,
  EATING_OUT_OPTIONS,
  ENERGY_DAYS_OPTIONS,
  ENERGY_WHEN_OPTIONS,
  ENERGY_WORKOUT_OPTIONS,
  FAT_AREA_OPTIONS_MEN,
  FAT_AREA_OPTIONS_WOMEN,
  FOOD_OPTIONS,
  GOAL_OPTIONS,
  GYM_OPTIONS,
  H5_OPTIONS,
  HEARD_OPTIONS,
  HIKE_LEVEL_OPTIONS,
  HIKE_TARGET_OPTIONS,
  HOME_KIT_OPTIONS,
  LIFT_OPTIONS,
  MEALS_OPTIONS,
  MUSCLE_ADD_OPTIONS,
  MUSCLE_AREA_OPTIONS,
  PAIN_OPTIONS,
  PROGRESS_OPTIONS,
  RACE_BEFORE_OPTIONS,
  RACE_OPTIONS,
  RUN_DAYS_OPTIONS,
  RUN_DISTANCE_OPTIONS,
  SESSION_OPTIONS,
  SLEEP_OPTIONS,
  STOPPED_OPTIONS,
  STRESS_OPTIONS,
  SUPPORT_OPTIONS,
  TRAIN_DAYS_OPTIONS,
  TRAIN_WHERE_OPTIONS,
  VERSION_OPTIONS,
  WATER_OPTIONS,
  WITH_SOMEONE_OPTIONS,
  YES_NO,
  stepTitle,
} from '../content/finder/questions'
import { matchFinder } from '../content/finder/match'
import { nextStep } from '../content/finder/schema'
import {
  clearFinderDraft,
  emptyDraft,
  loadFinderDraft,
  saveFinderDraft,
} from '../content/finder/storage'
import type { FinderAnswers, FinderDraft, FinderStepId } from '../content/finder/types'
import { formatKsh, type CatalogProgram } from '../content/programs'
import { getProgramCatalog } from '../api/programCatalog'
import { useAuth } from '../context/AuthContext'
import CtaButton from '../components/programs/CtaButton'

const inputClass =
  'w-full min-h-[52px] px-4 rounded-lg border-[1.5px] border-black/15 bg-white text-night font-barlow text-base outline-none focus:border-cta'

export default function FinderFlow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [draft, setDraft] = useState<FinderDraft>(() => loadFinderDraft() ?? emptyDraft())
  const [, setHistory] = useState<FinderStepId[]>(() => {
    const d = loadFinderDraft()
    return d ? (['Main', d.stepId].filter((v, i, a) => a.indexOf(v) === i) as FinderStepId[]) : ['Main']
  })
  const [bodyImages, setBodyImages] = useState<SiteImages>({})
  const [catalog, setCatalog] = useState<CatalogProgram[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pendingH5, setPendingH5] = useState<string | undefined>()
  const [payOpen, setPayOpen] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState('')
  const [payPhone, setPayPhone] = useState('')

  const stepId = draft.stepId
  const answers = draft.answers
  const title = stepTitle(stepId, answers, draft.identity?.isReturning)
  const interstitial = replyBody(stepId, answers)

  useEffect(() => {
    void getSiteImages([...FINDER_BODY_SLOTS]).then(setBodyImages).catch(() => undefined)
    void getProgramCatalog().then(setCatalog).catch(() => undefined)
  }, [])

  useEffect(() => {
    saveFinderDraft(draft)
  }, [draft])

  const match = useMemo(() => {
    if (!catalog.length) return null
    try {
      return matchFinder(answers, catalog)
    } catch {
      return null
    }
  }, [answers, catalog])

  useEffect(() => {
    if (!match) return
    setDraft((prev) => {
      const nextDerived = {
        programId: match.program.id,
        eliteProgramId: match.elite?.id ?? null,
      }
      if (
        prev.derived?.programId === nextDerived.programId &&
        prev.derived?.eliteProgramId === nextDerived.eliteProgramId
      ) {
        return prev
      }
      return { ...prev, derived: nextDerived }
    })
  }, [match])

  const setAnswers = (patch: Partial<FinderAnswers>) =>
    setDraft((prev) => ({ ...prev, answers: { ...prev.answers, ...patch } }))

  const go = (next: FinderStepId) => {
    setError('')
    setHistory((h) => [...h, next])
    setDraft((prev) => ({ ...prev, stepId: next }))
  }

  const back = () => {
    setError('')
    setHistory((h) => {
      if (h.length < 2) {
        navigate('/find-my-program')
        return h
      }
      const nextHist = h.slice(0, -1)
      const prev = nextHist[nextHist.length - 1]!
      setDraft((d) => ({ ...d, stepId: prev }))
      return nextHist
    })
  }

  const continueFrom = async () => {
    if (stepId === 'Email') {
      await submitIdentity()
      return
    }
    if (stepId === 'Offer') {
      await submitOffer()
      return
    }
    const next = nextStep(stepId, answers)
    if (next) go(next)
  }

  const submitIdentity = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await createFinderAccount({
        name: answers.name || 'Member',
        email: answers.email,
        phone: answers.phone,
        answers,
      })
      setDraft((prev) => ({
        ...prev,
        identity: {
          userId: res.userId,
          isReturning: res.isReturning,
          email: res.email ?? answers.email,
          phone: res.phone ?? answers.phone,
        },
      }))
      go(res.isReturning ? 'EmailBack' : 'Chart')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not save your details')
    } finally {
      setBusy(false)
    }
  }

  const quizPayload = () => ({ version: 2 as const, answers, derived: draft.derived })

  const onPaid = useCallback(() => {
    const program = match?.program
    clearFinderDraft()
    setPayOpen(false)
    navigate('/dashboard', {
      state: program ? { joined: program.id, joinedName: program.name } : undefined,
    })
  }, [match, navigate])

  const submitOffer = async () => {
    if (!match) return
    setBusy(true)
    setError('')
    try {
      const program = match.program
      const isFree = Number(program.page.price ?? 0) === 0
      if (isFree) {
        if (!user) {
          navigate(`/register?redirect=${encodeURIComponent('/find-my-program/start')}`)
          return
        }
        await enrollProgram(program.id, quizPayload())
        clearFinderDraft()
        navigate('/dashboard', { state: { joined: program.id, joinedName: program.name } })
        return
      }
      const phone = answers.phone || draft.identity?.phone
      if (!phone) {
        setError('Add a phone number so we can send the M-Pesa prompt')
        go('Email')
        return
      }
      const checkout = await createFinderCheckout({
        name: answers.name || 'Member',
        phone,
        email: answers.email,
        program: program.id,
        tier: 'plus',
        quizAnswers: quizPayload(),
      })
      if (!checkout.amount || checkout.amount <= 0) {
        clearFinderDraft()
        navigate('/dashboard', { state: { joined: program.id, joinedName: program.name } })
        return
      }
      const stk = await initiateSTKPush({
        phone: checkout.phone || phone,
        amount: checkout.amount,
        signupId: checkout.signupId,
      })
      if (!stk.checkoutRequestId) {
        setError('Could not start M-Pesa. Please try again.')
        return
      }
      setPayPhone(checkout.phone || phone)
      setCheckoutRequestId(stk.checkoutRequestId)
      setPayOpen(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.customerMessage || 'Could not start checkout')
    } finally {
      setBusy(false)
    }
  }

  const canContinue = (): boolean => {
    switch (stepId) {
      case 'Progress':
        return !!answers.progressShape
      case 'Goal':
        return !!answers.goal
      case 'Race':
        return !!answers.raceDistance
      case 'Version':
        return !!answers.sex
      case 'Age':
        return !!answers.age
      case 'Height':
        return typeof answers.heightCm === 'number' && answers.heightCm > 100
      case 'Weight':
        return typeof answers.weightKg === 'number' && answers.weightKg > 30
      case 'Name':
        return !!answers.name?.trim()
      case 'GoalWeight':
        return typeof answers.goalWeightKg === 'number' && answers.goalWeightKg > 30
      case 'MuscleGoal':
        return !!answers.muscleAddKg
      case 'FatAreas':
        return (answers.fatAreas?.length ?? 0) > 0
      case 'MuscleAreas':
        return (answers.muscleAreas?.length ?? 0) > 0
      case 'Training':
        return !!answers.gymExperience
      case 'R1':
        return !!answers.runDistance
      case 'R2':
        return !!answers.raceBefore
      case 'R4':
        return !!answers.runDays
      case 'H1':
        return !!answers.hikeLevel
      case 'H2':
        return !!answers.hikeTarget
      case 'H3':
        return !!answers.altitudeBefore
      case 'H5':
        return !!pendingH5
      case 'Email':
        return !!(answers.email?.trim() || answers.phone?.trim())
      case 'L1':
        return !!answers.sleep
      case 'L2':
        return !!answers.water
      case 'L3':
        return !!answers.dailyActivity
      case 'L4':
        return !!answers.stress
      case 'L5':
        return !!answers.meals
      case 'L6':
        return !!answers.eatingOut
      case 'L7':
        return !!answers.trainWhere
      case 'L8':
        return !!answers.homeKit
      case 'L9':
        return !!answers.trainDays
      case 'L10':
        return !!answers.sessionLength
      case 'L14':
        return !!answers.liftComfort
      case 'L15':
        return !!answers.cardio
      case 'L11':
        return (answers.painAreas?.length ?? 0) > 0
      case 'L12':
        return !!answers.foodAvoid
      case 'L13':
        return (answers.stoppedBefore?.length ?? 0) > 0
      case 'Children':
        return !!answers.hasChildren
      case 'S1':
        return !!answers.withSomeone
      case 'S2':
        return !!answers.supportWho
      case 'S3':
        return !!answers.heardAbout
      case 'Building':
        return !!answers.energyWorkout
      case 'Building2':
        return !!answers.energyWhen
      case 'Building3':
        return !!answers.energyDays
      case 'Photo':
      case 'Target':
        return true
      case 'R3':
      case 'H4':
        return true
      default:
        return true
    }
  }

  const sex = answers.sex ?? 'women'

  const body = (() => {
    switch (stepId) {
      case 'Main':
        return (
          <div className="w-full aspect-[4/3] rounded-xl bg-night/90 text-chalk/70 flex items-center justify-center text-sm text-center px-4">
            Photo of TRFC members training
          </div>
        )
      case 'Progress':
        return <ChoiceList options={PROGRESS_OPTIONS} value={answers.progressShape} onPick={(v) => setAnswers({ progressShape: v as FinderAnswers['progressShape'] })} />
      case 'Truth':
        return <p className="m-0 text-sm text-fog leading-relaxed">{interstitial}</p>
      case 'Goal':
        return <ChoiceList options={GOAL_OPTIONS} value={answers.goal} onPick={(v) => setAnswers({ goal: v as FinderAnswers['goal'] })} />
      case 'Race':
        return <ChoiceList options={RACE_OPTIONS} value={answers.raceDistance} onPick={(v) => setAnswers({ raceDistance: v as FinderAnswers['raceDistance'] })} />
      case 'Version':
        return <ChoiceList options={VERSION_OPTIONS} value={answers.sex} onPick={(v) => setAnswers({ sex: v as FinderAnswers['sex'] })} />
      case 'Age':
        return <ChoiceList options={AGE_OPTIONS} value={answers.age} onPick={(v) => setAnswers({ age: v as FinderAnswers['age'] })} />
      case 'Height':
        return (
          <label className="block w-full">
            <span className="sr-only">Height in cm</span>
            <input
              type="number"
              inputMode="numeric"
              min={120}
              max={230}
              placeholder="Height in cm"
              value={answers.heightCm ?? ''}
              onChange={(e) => setAnswers({ heightCm: e.target.value ? Number(e.target.value) : undefined })}
              className={inputClass}
            />
          </label>
        )
      case 'Weight':
        return (
          <label className="block w-full">
            <span className="sr-only">Weight in kg</span>
            <input
              type="number"
              inputMode="decimal"
              min={35}
              max={250}
              placeholder="Weight in kg"
              value={answers.weightKg ?? ''}
              onChange={(e) => setAnswers({ weightKg: e.target.value ? Number(e.target.value) : undefined })}
              className={inputClass}
            />
          </label>
        )
      case 'Name':
        return (
          <input
            type="text"
            maxLength={40}
            placeholder="First name"
            value={answers.name ?? ''}
            onChange={(e) => setAnswers({ name: e.target.value })}
            className={inputClass}
          />
        )
      case 'Photo':
        return (
          <PhotoCarousel
            sex={sex}
            images={bodyImages}
            value={answers.bodyPhoto}
            onChange={(bodyPhoto) => setAnswers({ bodyPhoto })}
          />
        )
      case 'Target':
        return (
          <PhotoCarousel
            sex={sex}
            images={bodyImages}
            value={answers.targetPhoto}
            minIndex={Math.min(5, (answers.bodyPhoto ?? 1) + 1)}
            onChange={(targetPhoto) => setAnswers({ targetPhoto })}
          />
        )
      case 'GoalWeight':
        return (
          <input
            type="number"
            min={35}
            max={250}
            placeholder="Goal weight in kg"
            value={answers.goalWeightKg ?? ''}
            onChange={(e) => setAnswers({ goalWeightKg: e.target.value ? Number(e.target.value) : undefined })}
            className={inputClass}
          />
        )
      case 'MuscleGoal':
        return <ChoiceList options={MUSCLE_ADD_OPTIONS} value={answers.muscleAddKg} onPick={(v) => setAnswers({ muscleAddKg: v as FinderAnswers['muscleAddKg'] })} />
      case 'FatAreas':
        return (
          <MultiChoiceList
            options={sex === 'men' ? FAT_AREA_OPTIONS_MEN : FAT_AREA_OPTIONS_WOMEN}
            values={answers.fatAreas ?? []}
            max={3}
            onChange={(fatAreas) => setAnswers({ fatAreas })}
          />
        )
      case 'MuscleAreas':
        return (
          <MultiChoiceList
            options={MUSCLE_AREA_OPTIONS}
            values={answers.muscleAreas ?? []}
            max={3}
            onChange={(muscleAreas) => setAnswers({ muscleAreas })}
          />
        )
      case 'Training':
        return <ChoiceList options={GYM_OPTIONS} value={answers.gymExperience} onPick={(v) => setAnswers({ gymExperience: v as FinderAnswers['gymExperience'] })} />
      case 'R1':
        return <ChoiceList options={RUN_DISTANCE_OPTIONS} value={answers.runDistance} onPick={(v) => setAnswers({ runDistance: v as FinderAnswers['runDistance'] })} />
      case 'R2':
        return <ChoiceList options={RACE_BEFORE_OPTIONS} value={answers.raceBefore} onPick={(v) => setAnswers({ raceBefore: v as FinderAnswers['raceBefore'] })} />
      case 'R3':
        return (
          <div className="space-y-3 w-full">
            <ChoiceList
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'not_yet', label: 'Not yet' },
              ]}
              value={answers.raceDay === null ? 'not_yet' : answers.raceDay ? 'yes' : undefined}
              onPick={(v) => setAnswers({ raceDay: v === 'not_yet' ? null : answers.raceDay || new Date().toISOString().slice(0, 10) })}
            />
            {answers.raceDay !== null && answers.raceDay !== undefined && (
              <input type="date" value={answers.raceDay || ''} onChange={(e) => setAnswers({ raceDay: e.target.value || null })} className={inputClass} />
            )}
          </div>
        )
      case 'R4':
        return <ChoiceList options={RUN_DAYS_OPTIONS} value={answers.runDays} onPick={(v) => setAnswers({ runDays: v as FinderAnswers['runDays'] })} />
      case 'H1':
        return <ChoiceList options={HIKE_LEVEL_OPTIONS} value={answers.hikeLevel} onPick={(v) => setAnswers({ hikeLevel: v as FinderAnswers['hikeLevel'] })} />
      case 'H2':
        return <ChoiceList options={HIKE_TARGET_OPTIONS} value={answers.hikeTarget} onPick={(v) => setAnswers({ hikeTarget: v as FinderAnswers['hikeTarget'] })} />
      case 'H3':
        return <ChoiceList options={YES_NO} value={answers.altitudeBefore} onPick={(v) => setAnswers({ altitudeBefore: v as FinderAnswers['altitudeBefore'] })} />
      case 'H4':
        return (
          <div className="space-y-3 w-full">
            <ChoiceList
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'not_yet', label: 'Not yet' },
              ]}
              value={answers.tripDate === null ? 'not_yet' : answers.tripDate ? 'yes' : undefined}
              onPick={(v) => setAnswers({ tripDate: v === 'not_yet' ? null : answers.tripDate || new Date().toISOString().slice(0, 10) })}
            />
            {answers.tripDate !== null && answers.tripDate !== undefined && (
              <input type="date" value={answers.tripDate || ''} onChange={(e) => setAnswers({ tripDate: e.target.value || null })} className={inputClass} />
            )}
          </div>
        )
      case 'H5':
        return <ChoiceList options={H5_OPTIONS} value={pendingH5} onPick={setPendingH5} />
      case 'Email':
        return (
          <div className="space-y-3 w-full">
            <input
              type="email"
              placeholder="Email"
              value={answers.email ?? ''}
              onChange={(e) => setAnswers({ email: e.target.value })}
              className={inputClass}
            />
            <input
              type="tel"
              placeholder="Phone (07XX XXX XXX)"
              value={answers.phone ?? ''}
              onChange={(e) => setAnswers({ phone: e.target.value })}
              className={inputClass}
            />
          </div>
        )
      case 'L1':
        return <ChoiceList options={SLEEP_OPTIONS} value={answers.sleep} onPick={(v) => setAnswers({ sleep: v })} />
      case 'L2':
        return <ChoiceList options={WATER_OPTIONS} value={answers.water} onPick={(v) => setAnswers({ water: v })} />
      case 'L3':
        return <ChoiceList options={ACTIVITY_OPTIONS} value={answers.dailyActivity} onPick={(v) => setAnswers({ dailyActivity: v })} />
      case 'L4':
        return <ChoiceList options={STRESS_OPTIONS} value={answers.stress} onPick={(v) => setAnswers({ stress: v })} />
      case 'L5':
        return <ChoiceList options={MEALS_OPTIONS} value={answers.meals} onPick={(v) => setAnswers({ meals: v })} />
      case 'L6':
        return <ChoiceList options={EATING_OUT_OPTIONS} value={answers.eatingOut} onPick={(v) => setAnswers({ eatingOut: v })} />
      case 'L7':
        return <ChoiceList options={TRAIN_WHERE_OPTIONS} value={answers.trainWhere} onPick={(v) => setAnswers({ trainWhere: v as FinderAnswers['trainWhere'] })} />
      case 'L8':
        return <ChoiceList options={HOME_KIT_OPTIONS} value={answers.homeKit} onPick={(v) => setAnswers({ homeKit: v })} />
      case 'L9':
        return <ChoiceList options={TRAIN_DAYS_OPTIONS} value={answers.trainDays} onPick={(v) => setAnswers({ trainDays: v })} />
      case 'L10':
        return <ChoiceList options={SESSION_OPTIONS} value={answers.sessionLength} onPick={(v) => setAnswers({ sessionLength: v })} />
      case 'L14':
        return <ChoiceList options={LIFT_OPTIONS} value={answers.liftComfort} onPick={(v) => setAnswers({ liftComfort: v })} />
      case 'L15':
        return <ChoiceList options={CARDIO_OPTIONS} value={answers.cardio} onPick={(v) => setAnswers({ cardio: v })} />
      case 'L11':
        return (
          <MultiChoiceList
            options={PAIN_OPTIONS}
            values={answers.painAreas ?? []}
            max={2}
            onChange={(painAreas) => setAnswers({ painAreas })}
          />
        )
      case 'L12':
        return <ChoiceList options={FOOD_OPTIONS} value={answers.foodAvoid} onPick={(v) => setAnswers({ foodAvoid: v })} />
      case 'L13':
        return (
          <MultiChoiceList
            options={STOPPED_OPTIONS}
            values={answers.stoppedBefore ?? []}
            max={2}
            onChange={(stoppedBefore) => setAnswers({ stoppedBefore })}
          />
        )
      case 'Children':
        return <ChoiceList options={YES_NO} value={answers.hasChildren} onPick={(v) => setAnswers({ hasChildren: v as FinderAnswers['hasChildren'] })} />
      case 'S1':
        return <ChoiceList options={WITH_SOMEONE_OPTIONS} value={answers.withSomeone} onPick={(v) => setAnswers({ withSomeone: v as FinderAnswers['withSomeone'] })} />
      case 'S2':
        return <ChoiceList options={SUPPORT_OPTIONS} value={answers.supportWho} onPick={(v) => setAnswers({ supportWho: v })} />
      case 'S3':
        return <ChoiceList options={HEARD_OPTIONS} value={answers.heardAbout} onPick={(v) => setAnswers({ heardAbout: v })} />
      case 'Building':
        return <ChoiceList options={ENERGY_WORKOUT_OPTIONS} value={answers.energyWorkout} onPick={(v) => setAnswers({ energyWorkout: v })} />
      case 'Building2':
        return <ChoiceList options={ENERGY_WHEN_OPTIONS} value={answers.energyWhen} onPick={(v) => setAnswers({ energyWhen: v })} />
      case 'Building3':
        return <ChoiceList options={ENERGY_DAYS_OPTIONS} value={answers.energyDays} onPick={(v) => setAnswers({ energyDays: v })} />
      case 'Chart':
        return <FinderChart label={match?.program.page.startsLabel ? `Toward ${match.program.page.startsLabel}` : 'Your goal window'} />
      case 'Thanks':
      case 'Building4':
        return (
          <div className="w-full space-y-3">
            {interstitial && <p className="m-0 text-sm text-fog leading-relaxed">{interstitial}</p>}
            <div className="w-full h-2 rounded-full bg-black/10 overflow-hidden">
              <div className="h-full bg-cta motion-safe:animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        )
      case 'Result':
        return match ? (
          <div className="w-full rounded-xl border border-black/10 p-4 space-y-2">
            <div className="font-semibold text-lg">{match.program.name}</div>
            <div className="text-sm text-fog">{match.program.page.startsLabel} · {match.program.weekCount} weeks</div>
          </div>
        ) : (
          <p className="text-sm text-fog">Loading your match…</p>
        )
      case 'Offer':
        return match ? (
          <div className="w-full space-y-3">
            <div className="rounded-xl border-[1.5px] border-cta bg-cta/10 p-4 space-y-2">
              <div className="font-bold text-lg">{match.program.name}</div>
              <div className="text-sm text-fog">
                {match.program.weekCount} weeks
                {match.program.page.startsLabel ? `, starts ${match.program.page.startsLabel}` : ''}
              </div>
              <div className="text-2xl font-bold">{formatKsh(match.program.page.price)}</div>
              {match.program.page.memberPrice > 0 && match.program.page.memberPrice < match.program.page.price && (
                <div className="text-xs text-fog">Members pay {formatKsh(match.program.page.memberPrice)}</div>
              )}
            </div>
            {match.elite && (
              <p className="m-0 text-xs text-fog bg-black/[0.04] rounded-lg p-3">
                You told us you have children. {match.elite.name} is available as a one-to-one option
                {match.elite.page.price ? ` (${formatKsh(match.elite.page.price)})` : ''}.
              </p>
            )}
          </div>
        ) : null
      default:
        return interstitial ? (
          <p className="m-0 text-sm text-fog leading-relaxed">{interstitial}</p>
        ) : null
    }
  })()

  const continueLabel =
    stepId === 'Main'
      ? 'Find my program'
      : stepId === 'Truth'
        ? 'Find my path'
        : stepId === 'Offer'
          ? match
            ? `Join ${match.program.name}`
            : 'Join'
          : stepId === 'Email'
            ? busy
              ? 'Saving…'
              : 'Continue'
            : 'Continue'

  return (
    <FinderShell
      stepId={stepId}
      title={title}
      subtitle={
        stepId === 'Main'
          ? 'Answer a few questions and we show you the program, and the dates you can reach your goal. It takes about four minutes.'
          : stepId === 'Progress'
            ? 'Pick the shape that feels right.'
            : undefined
      }
      onBack={stepId === 'Main' ? () => navigate('/find-my-program') : back}
      onContinue={() => void continueFrom()}
      continueLabel={continueLabel}
      continueDisabled={!canContinue() || busy}
    >
      {body}
      {error && <p className="m-0 text-sm text-red-600">{error}</p>}
      {stepId === 'Main' && (
        <CtaButton to="/find-my-program" className="!bg-transparent !text-fog !min-h-10 !text-sm underline !shadow-none">
          Back to Find my program
        </CtaButton>
      )}
      <PaymentStatusModal
        isOpen={payOpen}
        checkoutRequestId={checkoutRequestId}
        phone={payPhone}
        successBody="Your program is unlocked. Week 1 is waiting on your dashboard."
        onClose={() => setPayOpen(false)}
        onSuccess={onPaid}
      />
    </FinderShell>
  )
}

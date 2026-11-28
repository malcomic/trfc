import type { FinderAnswers, FinderStepId } from './types'

/** Part 2-style interstitial copy keyed by step + answer context. */
export function replyBody(stepId: FinderStepId, answers: FinderAnswers): string | null {
  const name = answers.name?.trim() || 'there'
  const sex = answers.sex === 'men' ? 'men' : 'women'

  switch (stepId) {
    case 'Truth':
      return 'Every path is real. How your body changes depends on your history, your training, and how your body responds. TRFC builds your plan around you — not a stock template.'

    case 'PathShape':
      return sex === 'men'
        ? 'We have your goal, your age, and where you are starting. Next we shape the training so it fits your week.'
        : 'We have your goal, your age, and where you are starting. Next we shape the training so it fits your life.'

    case 'NameMsg':
      return `${name}, the next questions shape your dates, your training days, and the program we recommend.`

    case 'Reply':
      return sex === 'men'
        ? 'Got it. That is a strong place to start. We will aim your plan at the shape you picked next.'
        : 'Got it. That is a strong place to start. We will aim your plan at the shape you want next.'

    case 'Testimonial':
      return 'People who started where you are now are already in the community. Keep going — your plan is almost ready.'

    case 'Thanks':
      return 'Thanks. We are putting your answers together. One more short set of questions and we show you the program.'

    case 'EmailBack':
      return answers.email || answers.phone
        ? `We saved your details. Your plan keeps building from here.`
        : 'Continue so we can finish your plan.'

    case 'MsgFlex':
      return 'Smart training bends around your week. Home, gym, or outside — we match the plan to where you actually train.'

    case 'Testimonial2':
      return 'Captains check in every week. You are not guessing alone.'

    case 'MsgGood':
      return 'If something hurts, we work around it. Tell us what to protect and we keep the rest of the plan moving.'

    case 'MsgCircle':
      return 'People who train with support stick with it longer. You can invite someone later — or go solo if that fits you.'

    case 'Building4':
      return 'Almost there. We are locking your timeline and the program that fits.'

    case 'H5':
      // Never persist H5; this reply is only shown if we land on an interstitial after
      return 'Thanks. If you have a heart or lung condition, talk to your doctor before high altitude. We still match you to a safe starting program.'

    default:
      return null
  }
}

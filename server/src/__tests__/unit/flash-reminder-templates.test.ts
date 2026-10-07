import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/env.js', () => ({
  config: {
    frontendUrl: 'https://example.com',
    contact: {
      email: 'support@example.com',
      phone: '+254 700 000000',
    },
  },
}))

import {
  FLASH_REMINDER_SUBJECTS,
  buildFlashReminderEmailHTML,
  buildFlashReminderEmailText,
  type FlashReminderStage,
} from '../../utils/emailTemplates.js'

const data = {
  salePrice: 1497,
  regularPrice: 2497,
  flashUrl: 'https://example.com/flash-sales?access=abc',
}

describe('flash reminder email templates', () => {
  it.each([1, 2, 3] as FlashReminderStage[])('stage %i includes both prices, the button and the link', (stage) => {
    const html = buildFlashReminderEmailHTML(stage, data)
    const text = buildFlashReminderEmailText(stage, data)

    expect(html).toContain(`<title>${FLASH_REMINDER_SUBJECTS[stage]}</title>`)
    for (const output of [html, text]) {
      expect(output).toContain('Ksh 1,497')
      expect(output).toContain('Ksh 2,497')
      expect(output).toContain('GET MY JERSEY')
      expect(output).toContain('https://example.com/flash-sales?access=abc')
      expect(output).toContain('Coach Maurice')
      expect(output).toContain('FREE TRFC Gift Bag')
    }
  })

  it('uses the right subject and countdown wording for each stage', () => {
    expect(FLASH_REMINDER_SUBJECTS[1]).toBe('2nd Edition Jersey Flash Sale Goes Away After 24hrs')
    expect(FLASH_REMINDER_SUBJECTS[2]).toBe('12 HOURS LEFT - TRFC 2nd Edition Jersey Flash Sale')
    expect(FLASH_REMINDER_SUBJECTS[3]).toBe('FEW HRS LEFT — Ends in 1 Hour')

    expect(buildFlashReminderEmailText(1, data)).toContain('Once the 24 hours are up, your Ksh 1,497 price is gone.')

    const stage2 = buildFlashReminderEmailText(2, data)
    expect(stage2).toContain('12 hours left before the 2nd Edition Jersey price goes back to Ksh 2,497.')
    expect(stage2).toContain("Here's the email from our flash sale in case you missed it:")
    expect(stage2).toContain('Once the 12 hours are up, your Ksh 1,497 price is gone.')

    const stage3 = buildFlashReminderEmailText(3, data)
    expect(stage3).toContain("There's only 1 hour left.")
    expect(stage3).toContain('Ksh 1,497 instead of Ksh 2,497')
    expect(stage3).toContain('This is the last email')
  })

  it('escapes the link in HTML', () => {
    const html = buildFlashReminderEmailHTML(1, { ...data, flashUrl: 'https://example.com/?a=1&b="x"' })
    expect(html).toContain('https://example.com/?a=1&amp;b=&quot;x&quot;')
    expect(html).not.toContain('b="x"')
  })
})

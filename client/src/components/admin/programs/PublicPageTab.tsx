import type { ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { useSectionDraft } from '../../../hooks/useSectionDraft'
import type { ProgramPageContent } from '../../../types/programContent'
import { ImageField } from './UploadFields'
import { LinesField, NumberField, RepeatList, SaveBar, TextArea, TextField, cardClass, hintClass } from './fields'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-5 first:border-0 first:pt-0">
      <div>
        <h3 className="text-base font-bold">{title}</h3>
        {hint && <p className={hintClass}>{hint}</p>}
      </div>
      {children}
    </section>
  )
}

export default function PublicPageTab({
  api,
  onDirtyChange,
}: {
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
}) {
  const page = api.editor!.content!.page
  const { value, setValue, dirty, reset } = useSectionDraft(page, onDirtyChange)
  const set = (next: Partial<ProgramPageContent>) => setValue({ ...value, ...next })
  const isFree = value.price === 0

  return (
    <div className={`${cardClass} space-y-6 max-w-3xl`}>
      <Section title="Top of the page">
        <TextField label="Page title" value={value.title} onChange={(title) => set({ title })} hint="The big heading. Also used on the Browse card." />
        <TextArea label="Tagline" value={value.tagline} rows={2} onChange={(tagline) => set({ tagline })} />
        <LinesField label="Chips" value={value.chips} rows={3} onChange={(chips) => set({ chips })} hint="Short labels under the tagline, one per line. For example: 8 weeks." />
        <ImageField label="Hero image" value={value.heroImage} onChange={(heroImage) => set({ heroImage })} />
        <TextArea label="Note under the join button" value={value.heroNote} rows={2} onChange={(heroNote) => set({ heroNote })} />
      </Section>

      <Section title="Price and dates" hint="Set the price to 0 for a free program. Free programs can be joined straight away; paid ones show “Coming soon” until M-Pesa joining opens.">
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberField label="Price (KSh)" value={value.price} max={1000000} onChange={(price) => set({ price: price ?? 0 })} />
          <NumberField
            label="Member price (KSh)"
            value={value.memberPrice}
            max={1000000}
            onChange={(memberPrice) => set({ memberPrice: memberPrice ?? 0 })}
            hint={isFree ? 'Not shown for free programs.' : 'Usually 15% off.'}
          />
          <TextField label="Starts (as shown)" value={value.startsLabel} maxLength={60} onChange={(startsLabel) => set({ startsLabel })} placeholder="January 2027" />
          <div className="space-y-1">
            <label htmlFor="program-starts-on" className="block text-sm font-semibold">
              First day of Week 1 <span className="font-normal text-gray-500">(optional)</span>
            </label>
            <input
              id="program-starts-on"
              type="date"
              value={value.startsOn ?? ''}
              onChange={(e) => set({ startsOn: e.target.value || null })}
              className="w-full px-3 py-2 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        {!isFree && <TextField label="Member discount note" optional value={value.memberNote} onChange={(memberNote) => set({ memberNote })} />}
      </Section>

      <Section title="Who it is for and what they get">
        <LinesField label="This is for you if" value={value.forYou} onChange={(forYou) => set({ forYou })} />
        <TextField label="Note under the list" optional value={value.forYouNote} onChange={(forYouNote) => set({ forYouNote })} />
        <RepeatList
          label="What you get"
          items={value.whatYouGet}
          onChange={(whatYouGet) => set({ whatYouGet })}
          blank={() => ({ lead: '', rest: '' })}
          addLabel="Add an item"
          hint="The bold start, then the rest of the sentence."
          render={(item, update) => (
            <div className="grid sm:grid-cols-2 gap-3">
              <TextField label="Bold start" value={item.lead} onChange={(lead) => update({ ...item, lead })} />
              <TextField label="Rest of the sentence" value={item.rest} onChange={(rest) => update({ ...item, rest })} />
            </div>
          )}
        />
      </Section>

      <Section title="How it works">
        <RepeatList
          label="Tiles"
          items={value.howItWorks}
          onChange={(howItWorks) => set({ howItWorks })}
          blank={() => ({ label: '', title: '', body: '' })}
          addLabel="Add a tile"
          render={(tile, update) => (
            <div className="grid sm:grid-cols-3 gap-3">
              <TextField label="Big label" value={tile.label} maxLength={60} onChange={(label) => update({ ...tile, label })} />
              <TextField label="Title" value={tile.title} onChange={(title) => update({ ...tile, title })} />
              <TextField label="Text" value={tile.body} onChange={(body) => update({ ...tile, body })} />
            </div>
          )}
        />
        <TextArea label="Outline box" optional value={value.outline} rows={2} onChange={(outline) => set({ outline })} hint="Shown in a dashed box under the tiles. Leave empty to hide it." />
        <TextArea label="Share note" optional value={value.shareNote} rows={2} onChange={(shareNote) => set({ shareNote })} />
      </Section>

      <Section title="Coach and story">
        <TextArea label="Line from Coach Maurice" value={value.coachLine} rows={2} onChange={(coachLine) => set({ coachLine })} />
        <TextArea label="Member story" value={value.story} rows={4} maxLength={6000} onChange={(story) => set({ story })} />
      </Section>

      <Section title="Questions">
        <RepeatList
          label="FAQs"
          items={value.faqs}
          onChange={(faqs) => set({ faqs })}
          blank={() => ({ q: '', a: '' })}
          addLabel="Add a question"
          render={(faq, update) => (
            <>
              <TextField label="Question" value={faq.q} onChange={(q) => update({ ...faq, q })} />
              <TextArea label="Answer" value={faq.a} rows={2} onChange={(a) => update({ ...faq, a })} />
            </>
          )}
        />
      </Section>

      <Section title="Join box and buttons">
        <TextField label="Join heading" value={value.join.heading} onChange={(heading) => set({ join: { ...value.join, heading } })} />
        <TextArea label="Join text" value={value.join.body} rows={2} onChange={(body) => set({ join: { ...value.join, body } })} />
        <TextField label="Small print" value={value.join.footnote} onChange={(footnote) => set({ join: { ...value.join, footnote } })} />
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Join button" value={value.cta} maxLength={60} onChange={(cta) => set({ cta })} />
          <TextField label="Sticky bar button" value={value.barCta} maxLength={60} onChange={(barCta) => set({ barCta })} />
        </div>
      </Section>

      <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void api.saveSection('page', value)} />
    </div>
  )
}

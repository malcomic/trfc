import type { ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { useSectionDraft } from '../../../hooks/useSectionDraft'
import { usePrograms } from '../../../context/ProgramsContext'
import { programFromCatalog, type CatalogProgram } from '../../../content/programs'
import ProgramCard from '../../explore/ProgramCard'
import { ImageField } from './UploadFields'
import { SaveBar, TextArea, TextField, cardClass, hintClass } from './fields'

export default function BrowseCardTab({
  api,
  onDirtyChange,
}: {
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
}) {
  const { programs } = usePrograms()
  const editor = api.editor!
  const content = editor.content!
  const { value, setValue, dirty, reset } = useSectionDraft(content.card, onDirtyChange)
  const set = (next: Partial<typeof value>) => setValue({ ...value, ...next })
  const categories = [...new Set(programs.map((p) => p.card.category).filter(Boolean))].sort()

  const preview = programFromCatalog({
    id: editor.program.id,
    slug: editor.program.slug,
    name: editor.program.name,
    is_core: editor.program.is_core,
    sort_order: editor.program.sort_order,
    weekCount: content.weeks.length,
    page: content.page,
    card: value,
  } as CatalogProgram)

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
      <div className={`${cardClass} space-y-5`}>
        <p className={hintClass}>The card on the Programs page. The title, length, start date and price come from the Public page tab.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField label="Tag on the photo" value={value.tag} maxLength={60} onChange={(tag) => set({ tag })} placeholder="Free" />
          <div className="space-y-1">
            <TextField
              label="Browse filter"
              value={value.category}
              maxLength={30}
              onChange={(category) => set({ category })}
              hint="Programs with the same filter share a chip on the Programs page. Leave empty to show it under All only."
            />
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ category: c })}
                    className="text-xs px-2.5 py-1 min-h-[32px] rounded-full border border-gray-300 dark:border-gray-600 hover:border-primary"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <TextArea label="Short description" value={value.blurb} rows={3} maxLength={400} onChange={(blurb) => set({ blurb })} />
        <TextField label="Button text" value={value.button} maxLength={60} onChange={(button) => set({ button })} />
        <ImageField
          label="Card image"
          value={value.image}
          onChange={(image) => set({ image })}
          hint="Used instead of the photo set in Site Images. JPG, PNG, WebP or GIF, up to 10 MB."
        />
        <TextField
          label="Photo placeholder text"
          optional
          value={value.photoLabel}
          maxLength={60}
          onChange={(photoLabel) => set({ photoLabel })}
          hint="Shown when there is no image."
        />
        <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void api.saveSection('card', value)} />
      </div>
      <div className="space-y-2 xl:sticky xl:top-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview</p>
        <div className="pointer-events-none">
          <ProgramCard program={preview} photoUrl={value.image ?? undefined} />
        </div>
      </div>
    </div>
  )
}

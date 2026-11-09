import { useState } from 'react'
import { Archive, ArchiveRestore } from 'lucide-react'
import AdminConfirmDialog from '../../AdminConfirmDialog'
import { slugify } from '../../../content/programEditor'
import type { ProgramEditorApi } from '../../../hooks/useProgramEditor'
import { useSectionDraft } from '../../../hooks/useSectionDraft'
import { NumberField, SaveBar, TextField, cardClass, dangerButton, hintClass, secondaryButton } from './fields'

const FREE_PROGRAM_ID = 'foundations'

export default function SettingsTab({
  api,
  onDirtyChange,
  onChanged,
}: {
  api: ProgramEditorApi
  onDirtyChange: (dirty: boolean) => void
  /** Called after a change that affects the public catalog. */
  onChanged: () => void
}) {
  const { program, enrolledCount } = api.editor!
  const saved = { name: program.name, slug: program.slug, sortOrder: program.sort_order }
  const { value, setValue, dirty, reset } = useSectionDraft(saved, onDirtyChange)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const archived = program.status === 'archived'

  const save = async () => {
    const body = {
      name: value.name,
      sortOrder: value.sortOrder,
      ...(program.is_core ? {} : { slug: slugify(value.slug) }),
    }
    if (await api.saveSettings(body)) onChanged()
  }

  const archive = async () => {
    setConfirmArchive(false)
    if (await api.archive()) onChanged()
  }

  const unarchive = async () => {
    if (await api.unarchive()) onChanged()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className={`${cardClass} space-y-5`}>
        <h2 className="text-lg font-bold">Settings</h2>
        <p className={hintClass}>These change straight away. They are not part of the draft.</p>
        <TextField
          label="Short name"
          value={value.name}
          maxLength={80}
          onChange={(name) => setValue({ ...value, name })}
          hint="Used in the dashboard, the ticker and the home page."
        />
        <TextField
          label="Web address"
          value={value.slug}
          maxLength={60}
          onChange={(slug) => setValue({ ...value, slug })}
          hint={
            program.is_core
              ? 'Core programs keep their web address, because the site and the quiz link to it.'
              : `The page is at /programs/${slugify(value.slug) || '…'}. Changing it breaks links people have already shared.`
          }
        />
        {program.is_core && <p className={`${hintClass} -mt-3`}>This field is locked.</p>}
        <NumberField
          label="Position"
          value={value.sortOrder}
          min={0}
          max={1000}
          onChange={(sortOrder) => setValue({ ...value, sortOrder: sortOrder ?? 0 })}
          hint="Lower numbers come first on the Programs page and the home page."
        />
        <SaveBar dirty={dirty} busy={api.busy} onReset={reset} onSave={() => void save()} label="Save settings" />
      </div>

      <div className={`${cardClass} space-y-3`}>
        <h2 className="text-lg font-bold">{archived ? 'Archived' : 'Archive'}</h2>
        {archived ? (
          <>
            <p className={hintClass}>
              This program is hidden from the site. Members who already joined can still open it in their dashboard.
            </p>
            <button type="button" onClick={() => void unarchive()} disabled={api.busy} className={secondaryButton}>
              <ArchiveRestore size={16} /> Bring it back
            </button>
          </>
        ) : program.id === FREE_PROGRAM_ID ? (
          <p className={hintClass}>Couch to 5K is the free starting program, so it cannot be archived.</p>
        ) : (
          <>
            <p className={hintClass}>
              Hides the program from the site and the Programs page. Members who already joined keep it in their dashboard.
              {enrolledCount > 0 && ` ${enrolledCount} member${enrolledCount === 1 ? ' is' : 's are'} in it now.`}
            </p>
            <button type="button" onClick={() => setConfirmArchive(true)} disabled={api.busy} className={dangerButton}>
              <Archive size={16} /> Archive program
            </button>
          </>
        )}
      </div>

      <AdminConfirmDialog
        open={confirmArchive}
        title={`Archive ${program.name}?`}
        message="It disappears from the public site straight away. You can bring it back later."
        confirmLabel="Archive"
        variant="danger"
        onConfirm={() => void archive()}
        onCancel={() => setConfirmArchive(false)}
      />
    </div>
  )
}

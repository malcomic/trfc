import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAdminProgram, type AdminProgramListItem } from '../../../api/admin/programs'
import { slugify } from '../../../content/programEditor'
import { errorMessage } from '../../../hooks/useProgramEditor'
import { ErrorBox, NumberField, SelectField, TextField, hintClass, primaryButton, secondaryButton } from './fields'

export default function NewProgramDialog({
  programs,
  onClose,
}: {
  programs: AdminProgramListItem[]
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [weeks, setWeeks] = useState<number | undefined>(4)
  const [copyFrom, setCopyFrom] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const address = slugTouched ? slugify(slug) : slugify(name)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (name.trim().length < 2) return setError('Give the program a name.')
    if (address.length < 2) return setError('The web address needs at least 2 letters or numbers.')
    if (!copyFrom && (!weeks || weeks > 52)) return setError('A program can be 1 to 52 weeks long.')
    setSaving(true)
    setError('')
    try {
      const created = await createAdminProgram({
        name: name.trim(),
        slug: address,
        lengthWeeks: copyFrom ? undefined : weeks,
        copyFrom: copyFrom || undefined,
      })
      navigate(`/admin/programs/${created.program.id}`)
    } catch (err) {
      setError(errorMessage(err, 'Failed to create the program'))
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" role="dialog" aria-modal="true" aria-labelledby="new-program-title">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-6 space-y-4 text-gray-900 dark:text-gray-100">
        <h2 id="new-program-title" className="text-xl font-bold">
          New program
        </h2>
        <TextField label="Name" value={name} maxLength={80} onChange={setName} placeholder="Strength for Runners" />
        <TextField
          label="Web address"
          value={slugTouched ? slug : address}
          maxLength={60}
          onChange={(v) => {
            setSlugTouched(true)
            setSlug(v)
          }}
          hint={`The page will be at /programs/${address || '…'}`}
        />
        <SelectField
          label="Start from"
          value={copyFrom}
          onChange={setCopyFrom}
          options={[
            { value: '', label: 'A blank program' },
            ...programs.map((p) => ({ value: p.id, label: `A copy of ${p.name}` })),
          ]}
        />
        {!copyFrom && <NumberField label="Number of weeks" value={weeks} min={1} max={52} onChange={setWeeks} />}
        <p className={hintClass}>The program starts as a draft. Nobody sees it until you publish it.</p>
        {error && <ErrorBox>{error}</ErrorBox>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? 'Creating…' : 'Create program'}
          </button>
        </div>
      </form>
    </div>
  )
}

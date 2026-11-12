import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, ExternalLink, FilePlus2, Plus, Send, Trash2 } from 'lucide-react'
import AdminPageHeader from '../../components/admin/AdminPageHeader'
import AdminConfirmDialog from '../../components/AdminConfirmDialog'
import {
  createPolicyDraft,
  deletePolicyDraft,
  getAdminPolicies,
  publishPolicyDraft,
  updatePolicyDraft,
  type AdminPolicy,
  type PolicyDraftInput,
} from '../../api/admin/policies'
import { POLICY_PATHS, formatPolicyDate, type PolicySection, type PolicySlug } from '../../api/policies'

const PAGES: { slug: PolicySlug; label: string; note: string }[] = [
  { slug: 'privacy-members', label: 'Privacy and Confidentiality Terms (members)', note: 'Version A. Linked in the footer and at sign-up.' },
  { slug: 'terms', label: 'Terms', note: 'Shown with the members privacy page.' },
  { slug: 'privacy-applicants', label: 'Privacy and Confidentiality Terms (coach applicants)', note: 'Version B. Linked on the coach application form.' },
]

/** Pages whose big changes make every member agree again at their next login. */
const GATED: PolicySlug[] = ['privacy-members', 'terms']

const inputClass =
  'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
const labelClass = 'block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1'
const buttonClass =
  'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
const primaryClass =
  'inline-flex items-center justify-center gap-2 bg-primary dark:bg-primary-dark text-white dark:text-black px-4 py-2 rounded-lg hover:opacity-90 transition disabled:opacity-50'

interface SectionForm {
  id: string
  title: string
  body: string
  table: string
}

interface DraftForm {
  id: string | null
  slug: PolicySlug
  version: string
  title: string
  intro: string
  lastUpdated: string
  sections: SectionForm[]
}

function toSectionForm(section: PolicySection): SectionForm {
  return {
    id: section.id,
    title: section.title,
    body: section.paragraphs.join('\n\n'),
    table: section.table ? [section.table.headers, ...section.table.rows].map((row) => row.join(' | ')).join('\n') : '',
  }
}

function fromSectionForm(section: SectionForm): PolicySection {
  const paragraphs = section.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const lines = section.table
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((cell) => cell.trim()))
  const result: PolicySection = { id: section.id, title: section.title.trim(), paragraphs }
  if (lines.length > 1) result.table = { headers: lines[0], rows: lines.slice(1) }
  return result
}

function nextVersion(version: string): string {
  const parts = version.split('.')
  const last = Number(parts[parts.length - 1])
  if (!Number.isInteger(last)) return `${version}.1`
  parts[parts.length - 1] = String(last + 1)
  return parts.join('.')
}

const today = () => new Date().toISOString().slice(0, 10)

function toDraftInput(form: DraftForm): PolicyDraftInput {
  return {
    version: form.version.trim(),
    title: form.title.trim(),
    intro: form.intro.trim(),
    lastUpdated: form.lastUpdated,
    sections: form.sections.map(fromSectionForm),
  }
}

export default function AdminPolicies() {
  const [policies, setPolicies] = useState<AdminPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState<DraftForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState<AdminPolicy | null>(null)
  const [isMaterial, setIsMaterial] = useState(false)
  const [deleting, setDeleting] = useState<AdminPolicy | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setPolicies(await getAdminPolicies())
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const bySlug = useMemo(() => {
    const map = new Map<PolicySlug, AdminPolicy[]>()
    for (const policy of policies) map.set(policy.slug, [...(map.get(policy.slug) ?? []), policy])
    return map
  }, [policies])

  const startDraft = (slug: PolicySlug) => {
    const live = (bySlug.get(slug) ?? []).find((p) => p.status === 'published')
    setMessage('')
    setError('')
    setForm({
      id: null,
      slug,
      version: live ? nextVersion(live.version) : '1.0',
      title: live?.title ?? '',
      intro: live?.intro ?? '',
      lastUpdated: today(),
      sections: (live?.sections ?? []).map(toSectionForm),
    })
  }

  const editDraft = (policy: AdminPolicy) => {
    setMessage('')
    setError('')
    setForm({
      id: policy.id,
      slug: policy.slug,
      version: policy.version,
      title: policy.title,
      intro: policy.intro,
      lastUpdated: policy.last_updated,
      sections: policy.sections.map(toSectionForm),
    })
  }

  const updateSection = (index: number, patch: Partial<SectionForm>) =>
    setForm((f) => (f ? { ...f, sections: f.sections.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : f))

  const moveSection = (index: number, delta: number) =>
    setForm((f) => {
      if (!f) return f
      const target = index + delta
      if (target < 0 || target >= f.sections.length) return f
      const sections = [...f.sections]
      ;[sections[index], sections[target]] = [sections[target], sections[index]]
      return { ...f, sections }
    })

  const save = async () => {
    if (!form) return
    try {
      setSaving(true)
      setError('')
      const input = toDraftInput(form)
      if (form.id) {
        await updatePolicyDraft(form.id, input)
      } else {
        const { id } = await createPolicyDraft(form.slug, input)
        setForm({ ...form, id })
      }
      setMessage('Draft saved. Publish it to make it the version people see.')
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to save the draft')
    } finally {
      setSaving(false)
    }
  }

  const confirmPublish = async () => {
    if (!publishing) return
    try {
      const result = await publishPolicyDraft(publishing.id, GATED.includes(publishing.slug) && isMaterial)
      setMessage(
        `Version ${result.version} is live.${
          GATED.includes(publishing.slug) && isMaterial ? ' Members will be asked to agree again at their next login.' : ''
        }`
      )
      if (form?.id === publishing.id) setForm(null)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to publish')
    } finally {
      setPublishing(null)
      setIsMaterial(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deletePolicyDraft(deleting.id)
      if (form?.id === deleting.id) setForm(null)
      await load()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to delete the draft')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Privacy & Terms"
        subtitle="Edit the wording and version of each page. Published versions are kept on file; the newest one is shown. Mark a version as a big change to make every member agree again at their next login."
        actions={
          <Link to="/admin/privacy-settings" className={buttonClass}>
            Privacy settings
          </Link>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6" role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg mb-6" role="status">
          {message}
        </div>
      )}

      {form ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {form.id ? 'Edit draft' : 'New draft'} · {PAGES.find((p) => p.slug === form.slug)?.label}
            </h2>
            <button type="button" className={buttonClass} onClick={() => setForm(null)}>
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="policy-version">Version</label>
              <input id="policy-version" className={inputClass} value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="policy-date">Last updated</label>
              <input id="policy-date" type="date" className={inputClass} value={form.lastUpdated} onChange={(e) => setForm({ ...form, lastUpdated: e.target.value })} />
            </div>
            <div>
              <label className={labelClass} htmlFor="policy-title">Title</label>
              <input id="policy-title" className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="policy-intro">Introduction</label>
            <textarea id="policy-intro" rows={3} className={inputClass} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Sections</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Leave a blank line between paragraphs. For a table, put one row per line with cells separated by |. The first line
              is the header row.
            </p>
            {form.sections.map((section, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[200px]">
                    <label className={labelClass} htmlFor={`section-title-${index}`}>Section {index + 1} title</label>
                    <input
                      id={`section-title-${index}`}
                      className={inputClass}
                      value={section.title}
                      onChange={(e) => updateSection(index, { title: e.target.value })}
                    />
                  </div>
                  <button type="button" className={buttonClass} onClick={() => moveSection(index, -1)} aria-label="Move up" disabled={index === 0}>
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => moveSection(index, 1)}
                    aria-label="Move down"
                    disabled={index === form.sections.length - 1}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => setForm({ ...form, sections: form.sections.filter((_, i) => i !== index) })}
                    aria-label="Remove section"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <textarea
                  rows={6}
                  className={inputClass}
                  value={section.body}
                  onChange={(e) => updateSection(index, { body: e.target.value })}
                  aria-label={`Section ${index + 1} text`}
                />
                <textarea
                  rows={section.table ? 4 : 2}
                  className={`${inputClass} font-mono text-sm`}
                  placeholder="Optional table, e.g. What we keep | How long"
                  value={section.table}
                  onChange={(e) => updateSection(index, { table: e.target.value })}
                  aria-label={`Section ${index + 1} table`}
                />
              </div>
            ))}
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                setForm({ ...form, sections: [...form.sections, { id: `section-${form.sections.length + 1}`, title: '', body: '', table: '' }] })
              }
            >
              <Plus size={16} /> Add section
            </button>
          </div>

          <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" className={primaryClass} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            {form.id && (
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  const draft = policies.find((p) => p.id === form.id)
                  if (draft) setPublishing(draft)
                }}
              >
                <Send size={16} /> Publish…
              </button>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-6">
          {PAGES.map((page) => {
            const versions = bySlug.get(page.slug) ?? []
            const liveId = versions.find((p) => p.status === 'published')?.id
            return (
              <section key={page.slug} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{page.label}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{page.note}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={POLICY_PATHS[page.slug]} target="_blank" rel="noopener noreferrer" className={buttonClass}>
                      <ExternalLink size={16} /> View page
                    </a>
                    <button type="button" className={primaryClass} onClick={() => startDraft(page.slug)}>
                      <FilePlus2 size={16} /> New version
                    </button>
                  </div>
                </div>
                {versions.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No versions yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {versions.map((policy) => (
                      <li key={policy.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          <strong>Version {policy.version}</strong> · last updated {formatPolicyDate(policy.last_updated)}
                          {policy.status === 'draft' && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                              Draft
                            </span>
                          )}
                          {policy.id === liveId && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              Live
                            </span>
                          )}
                          {policy.is_material && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              Big change
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {policy.status === 'draft' ? (
                            <>
                              <button type="button" className={buttonClass} onClick={() => editDraft(policy)}>
                                Edit
                              </button>
                              <button type="button" className={buttonClass} onClick={() => setPublishing(policy)}>
                                <Send size={16} /> Publish
                              </button>
                              <button type="button" className={buttonClass} onClick={() => setDeleting(policy)} aria-label="Delete draft">
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : (
                            <a
                              href={`${POLICY_PATHS[page.slug]}?version=${encodeURIComponent(policy.version)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={buttonClass}
                            >
                              View
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      )}

      {publishing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Publish version {publishing.version}?</h2>
            <p className="text-gray-600 dark:text-gray-400">
              It becomes the version everyone sees. The current version stays on file. Save the draft first if you changed it.
            </p>
            {GATED.includes(publishing.slug) && (
              <label className="flex items-start gap-3 text-gray-900 dark:text-gray-100 cursor-pointer">
                <input type="checkbox" className="mt-1 w-4 h-4" checked={isMaterial} onChange={(e) => setIsMaterial(e.target.checked)} />
                <span>
                  This is a big change. Every member must agree again at their next login.
                </span>
              </label>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setPublishing(null)
                  setIsMaterial(false)
                }}
              >
                Cancel
              </button>
              <button type="button" className={primaryClass} onClick={confirmPublish}>
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminConfirmDialog
        open={!!deleting}
        title="Delete this draft?"
        message={`Version ${deleting?.version ?? ''} has not been published. This cannot be undone.`}
        confirmLabel="Delete draft"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

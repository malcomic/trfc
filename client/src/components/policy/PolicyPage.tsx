import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import LegalPageLayout, { LegalSections } from '../LegalPageLayout'
import {
  POLICY_PATHS,
  formatPolicyDate,
  getPolicy,
  getPolicyAtVersion,
  getPolicyVersions,
  type PolicyDocument,
  type PolicySlug,
  type PolicyVersionSummary,
} from '../../api/policies'
import { pageRoot } from '../../utils/themeClasses'

interface PolicyPageProps {
  slug: PolicySlug
  watermark: string
  crossLink?: { label: string; to: string }
  /** Another policy shown in full below this one, e.g. the Terms under the privacy page. */
  alsoShow?: PolicySlug
  children?: ReactNode
}

function usePolicyDoc(slug: PolicySlug, version: string | null) {
  const [doc, setDoc] = useState<PolicyDocument | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let cancelled = false
    setDoc(null)
    setError(false)
    const load = version ? getPolicyAtVersion(slug, version) : getPolicy(slug)
    load
      .then((result) => !cancelled && setDoc(result))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [slug, version])
  return { doc, error }
}

function VersionHistory({ slug, current }: { slug: PolicySlug; current: string }) {
  const [versions, setVersions] = useState<PolicyVersionSummary[]>([])
  useEffect(() => {
    getPolicyVersions(slug).then(setVersions).catch(() => setVersions([]))
  }, [slug])
  if (versions.length < 2) return null
  return (
    <section id="earlier-versions">
      <h2 className="font-bebas text-2xl text-chalk light:text-chalk-light mb-3">Earlier versions</h2>
      <ul className="space-y-1 text-sm">
        {versions.map((v, index) => (
          <li key={v.version}>
            {v.version === current ? (
              <span className="text-chalk light:text-chalk-light font-semibold">
                Version {v.version}, {formatPolicyDate(v.last_updated)} (showing)
              </span>
            ) : (
              <Link
                to={index === 0 ? POLICY_PATHS[slug] : `${POLICY_PATHS[slug]}?version=${encodeURIComponent(v.version)}`}
                className="text-accent light:text-accent-light no-underline hover:underline"
              >
                Version {v.version}, {formatPolicyDate(v.last_updated)}
                {index === 0 ? ' (current)' : ''}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function AlsoShown({ slug }: { slug: PolicySlug }) {
  const { doc } = usePolicyDoc(slug, null)
  if (!doc) return null
  return (
    <div className="border-t border-white/10 light:border-black/10 pt-10 space-y-10">
      <div>
        <h2 className="font-bebas text-4xl text-chalk light:text-chalk-light">{doc.title}</h2>
        <p className="text-xs text-fog/70 light:text-fog-light/70 mt-2 font-barlow-condensed tracking-widest uppercase">
          Version {doc.version} · Last updated: {formatPolicyDate(doc.last_updated)}
        </p>
        {doc.intro && <p className="text-fog light:text-fog-light mt-3 leading-relaxed">{doc.intro}</p>}
      </div>
      <LegalSections sections={doc.sections} />
    </div>
  )
}

export default function PolicyPage({ slug, watermark, crossLink, alsoShow, children }: PolicyPageProps) {
  const [params] = useSearchParams()
  const version = params.get('version')
  const { doc, error } = usePolicyDoc(slug, version)

  if (!doc) {
    return (
      <div className={pageRoot}>
        <div className="max-w-3xl mx-auto px-[6%] py-20 text-center text-fog light:text-fog-light">
          {error ? (
            <p>
              We could not load this page right now. Please try again, or contact us at{' '}
              <a href="mailto:thikaroadfitness@gmail.com" className="text-accent light:text-accent-light">thikaroadfitness@gmail.com</a>.
            </p>
          ) : (
            <p>Loading…</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <LegalPageLayout
      meta={{
        documentTitle: `${doc.title} | TRFC`,
        eyebrow: version ? `Legal · Earlier version` : 'Legal',
        title: doc.title.toUpperCase(),
        intro: doc.intro,
        watermark,
        lastUpdated: formatPolicyDate(doc.last_updated),
        version: doc.version,
      }}
      sections={doc.sections}
      crossLink={crossLink}
    >
      {version && (
        <p className="text-sm text-fog light:text-fog-light">
          This is an earlier version kept on file.{' '}
          <Link to={POLICY_PATHS[slug]} className="text-accent light:text-accent-light">Read the current version</Link>.
        </p>
      )}
      {children}
      {alsoShow && !version && <AlsoShown slug={alsoShow} />}
      <VersionHistory slug={slug} current={doc.version} />
    </LegalPageLayout>
  )
}

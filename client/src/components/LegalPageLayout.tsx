import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { pageRoot } from '../utils/themeClasses'

export interface LegalTable {
  headers: string[]
  rows: string[][]
}

export interface LegalSection {
  id: string
  title: string
  paragraphs: string[]
  table?: LegalTable
}

export interface LegalPageMeta {
  documentTitle: string
  eyebrow: string
  title: string
  titleAccent?: string
  intro: string
  watermark: string
  lastUpdated: string
  version?: string
}

interface LegalPageLayoutProps {
  meta: LegalPageMeta
  sections: LegalSection[]
  crossLink?: { label: string; to: string }
  children?: ReactNode
}

export function LegalSections({ sections }: { sections: LegalSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <section key={section.id} id={section.id}>
          <h2 className="font-bebas text-3xl text-chalk light:text-chalk-light mb-4">{section.title}</h2>
          <div className="space-y-4">
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="text-fog light:text-fog-light leading-relaxed text-sm md:text-base">
                {paragraph}
              </p>
            ))}
            {section.table && <LegalTableView table={section.table} />}
          </div>
        </section>
      ))}
    </>
  )
}

function LegalTableView({ table }: { table: LegalTable }) {
  return (
    <div className="overflow-x-auto border border-white/10 light:border-black/10 rounded-lg">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 light:bg-black/5">
          <tr>
            {table.headers.map((header, index) => (
              <th key={index} scope="col" className="px-4 py-3 font-barlow-condensed font-bold tracking-wider uppercase text-xs text-chalk light:text-chalk-light">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-white/5 light:border-black/8 align-top">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={`px-4 py-3 leading-relaxed ${cellIndex === 0 ? 'font-semibold text-chalk light:text-chalk-light' : 'text-fog light:text-fog-light'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function LegalPageLayout({ meta, sections, crossLink, children }: LegalPageLayoutProps) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = meta.documentTitle
    return () => {
      document.title = previousTitle
    }
  }, [meta.documentTitle])

  return (
    <div className={pageRoot}>
      <section className="bg-ink light:bg-ink-light border-b border-white/5 light:border-black/8 px-[6%] pt-14 pb-11 relative overflow-hidden">
        <div className="absolute right-[-1%] bottom-[-16px] font-bebas text-clamp-2xl text-accent/5 light:text-accent-light/5 leading-none pointer-events-none select-none">
          {meta.watermark}
        </div>
        <div className="max-w-3xl mx-auto relative z-1">
          <div className="font-barlow-condensed font-bold text-xs tracking-widest uppercase text-accent light:text-accent-light flex items-center gap-2 mb-3 before:w-5 before:h-0.5 before:bg-accent light:before:bg-accent-light">
            {meta.eyebrow}
          </div>
          <h1 className="font-bebas text-5xl leading-tight text-chalk light:text-chalk-light">
            {meta.title}
            {meta.titleAccent && (
              <>
                <br />
                <span className="text-accent light:text-accent-light">{meta.titleAccent}</span>
              </>
            )}
          </h1>
          <p className="text-fog light:text-fog-light mt-4 leading-relaxed">{meta.intro}</p>
          <p className="text-xs text-fog/70 light:text-fog-light/70 mt-3 font-barlow-condensed tracking-widest uppercase">
            {meta.version && <>Version {meta.version} · </>}Last updated: {meta.lastUpdated}
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-[6%] py-10 pb-20 space-y-10">
        <LegalSections sections={sections} />

        {children}

        <div className="border-t border-white/5 light:border-black/8 pt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {crossLink && (
            <Link to={crossLink.to} className="text-accent light:text-accent-light no-underline hover:underline font-barlow-condensed font-bold tracking-widest uppercase text-xs">
              {crossLink.label}
            </Link>
          )}
          <Link to="/contact" className="text-fog light:text-fog-light no-underline hover:text-accent light:hover:text-accent-light transition font-barlow-condensed font-bold tracking-widest uppercase text-xs">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}

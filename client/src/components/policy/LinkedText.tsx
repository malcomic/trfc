import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface TextLink {
  phrase: string
  to: string
}

const linkClass = 'text-accent light:text-accent-light no-underline hover:underline'

/**
 * Turns the first match of each phrase in admin-editable wording into a link. Longer phrases are
 * matched first so "Privacy and Confidentiality Terms" wins over "Terms". Links whose phrase is
 * missing from the wording are added after it, so the policy is always one tap away.
 */
export default function LinkedText({ text, links }: { text: string; links: TextLink[] }) {
  const ordered = [...links].sort((a, b) => b.phrase.length - a.phrase.length)
  const used = new Set<string>()
  let parts: ReactNode[] = [text]

  for (const link of ordered) {
    const next: ReactNode[] = []
    let done = false
    for (const part of parts) {
      if (done || typeof part !== 'string') {
        next.push(part)
        continue
      }
      const index = part.indexOf(link.phrase)
      if (index === -1) {
        next.push(part)
        continue
      }
      next.push(part.slice(0, index))
      next.push(
        <Link key={link.phrase} to={link.to} target="_blank" className={linkClass}>
          {link.phrase}
        </Link>
      )
      next.push(part.slice(index + link.phrase.length))
      used.add(link.phrase)
      done = true
    }
    parts = next
  }

  const missing = links.filter((link) => !used.has(link.phrase))
  return (
    <>
      {parts}
      {missing.map((link) => (
        <span key={link.phrase}>
          {' '}
          (
          <Link to={link.to} target="_blank" className={linkClass}>
            read the {link.phrase}
          </Link>
          )
        </span>
      ))}
    </>
  )
}

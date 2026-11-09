import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { announcementLinkType } from '../../utils/announcements'

interface AnnouncementBodyProps {
  body: string
  linkUrl: string | null
  linkLabel: string | null
  className?: string
  linkClassName?: string
}

/** Announcements are plain text: blank lines split paragraphs and single line breaks are kept. */
export default function AnnouncementBody({
  body,
  linkUrl,
  linkLabel,
  className = '',
  linkClassName = 'inline-flex items-center gap-1.5 font-semibold underline underline-offset-2',
}: AnnouncementBodyProps) {
  const linkType = announcementLinkType(linkUrl)
  return (
    <div className={`space-y-3 ${className}`}>
      {body.split(/\n{2,}/).map((block, i) => (
        <p key={i} className="whitespace-pre-line break-words">
          {block}
        </p>
      ))}
      {linkUrl && linkLabel && linkType === 'internal' && (
        <Link to={linkUrl} className={linkClassName}>
          {linkLabel}
        </Link>
      )}
      {linkUrl && linkLabel && linkType === 'external' && (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={linkClassName}>
          {linkLabel} <ExternalLink size={14} aria-hidden />
        </a>
      )}
    </div>
  )
}

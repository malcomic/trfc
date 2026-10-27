import { Link } from 'react-router-dom'

export default function EmptyState({ message, to, cta }: { message: string; to?: string; cta?: string }) {
  return (
    <div className="text-center py-10 text-fog light:text-fog-light">
      <p>{message}</p>
      {to && cta && (
        <Link to={to} className="text-accent light:text-accent-light mt-3 inline-block no-underline hover:underline">
          {cta}
        </Link>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { pageRoot } from '../utils/themeClasses'

export default function NotFound() {
  return (
    <div className={`${pageRoot} flex flex-col items-center justify-center px-6 text-center`}>
      <div className="font-bebas text-[clamp(120px,20vw,200px)] text-accent/10 light:text-accent-light/10 leading-none tracking-tighter mb-4">404</div>
      <h1 className="font-bebas text-4xl mb-3">PAGE NOT FOUND</h1>
      <p className="text-fog light:text-fog-light max-w-md mb-10">This route doesn&apos;t exist — maybe you took a wrong turn on the track.</p>
      <Link to="/" className="bg-accent light:bg-accent-light text-black light:text-white px-10 py-3.5 clip-angled font-barlow-condensed font-black text-sm tracking-widest uppercase no-underline hover:bg-accent/90 light:hover:bg-accent-light/90">
        Back to Home
      </Link>
    </div>
  )
}

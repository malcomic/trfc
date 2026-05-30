import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-night text-chalk font-barlow flex flex-col items-center justify-center px-6 text-center">
      <div className="font-bebas text-[clamp(120px,20vw,200px)] text-fire/10 leading-none letter-spacing-tighter mb-4">404</div>
      <h1 className="font-bebas text-4xl mb-3">PAGE NOT FOUND</h1>
      <p className="text-fog max-w-md mb-10">This route doesn&apos;t exist — maybe you took a wrong turn on the track.</p>
      <Link to="/" className="bg-fire text-white px-10 py-3.5 clip-angled font-barlow-condensed font-black text-sm letter-spacing-widest text-transform-uppercase no-underline hover:bg-ember">
        Back to Home
      </Link>
    </div>
  )
}

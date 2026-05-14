import { Event } from '../types'

export default function EventCard({ event }: { event: Event }) {
  return (
    <div className="card p-4 bg-white">
      {event.image_url && <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover rounded-lg" />}
      <h3 className="text-xl font-semibold mt-4">{event.title}</h3>
      <p className="text-gray-600">{event.location}</p>
      <p className="font-bold text-primary mt-2">KES {event.price}</p>
    </div>
  )
}

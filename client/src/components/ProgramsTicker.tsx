import { Link } from 'react-router-dom'
import { usePrograms } from '../context/ProgramsContext'
import { tickerItems, type TickerItem } from '../content/ticker'

function Item({ item, hidden }: { item: TickerItem; hidden: boolean }) {
  const content = (
    <>
      <span className="bg-cta text-cta-ink font-semibold text-[13px] px-2.5 py-0.5 rounded tracking-[1px] uppercase">
        Coming soon
      </span>
      <strong>{item.name}</strong>
      <span className="text-[#C4C4C4]">{item.detail}</span>
    </>
  )
  const className = 'inline-flex items-center gap-2.5 px-8 whitespace-nowrap'
  return item.to ? (
    <Link to={item.to} tabIndex={hidden ? -1 : undefined} className={`${className} text-white no-underline hover:underline`}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  )
}

function ItemGroup({ items, hidden }: { items: TickerItem[]; hidden: boolean }) {
  return (
    <div className="flex flex-none" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <Item key={item.name} item={item} hidden={hidden} />
      ))}
    </div>
  )
}

export default function ProgramsTicker() {
  const { programs } = usePrograms()
  const items = tickerItems(programs)
  return (
    <div
      aria-label="Programs coming soon"
      className="programs-ticker bg-night text-white overflow-hidden py-3 text-[17px] max-sm:text-[15px] font-barlow"
    >
      <div className="programs-ticker-track">
        <ItemGroup items={items} hidden={false} />
        <ItemGroup items={items} hidden />
      </div>
    </div>
  )
}

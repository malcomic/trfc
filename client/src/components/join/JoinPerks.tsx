import { useEffect, useState } from 'react'
import { getMemberPerks, type PublicPerks } from '../../api/membership'
import { JOIN_COPY, joinPriceLine } from '../../content/join'
import PerkList from '../member/membership/PerkList'
import SectionHeading from '../programs/SectionHeading'

export default function JoinPerks() {
  const [data, setData] = useState<PublicPerks | null>(null)

  useEffect(() => {
    let active = true
    getMemberPerks()
      .then((perks) => {
        if (active) setData(perks)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  const copy = JOIN_COPY.perks
  const visible = (data?.perks ?? []).filter((p) => p.status === 'on' || p.status === 'coming_soon')

  return (
    <section className="px-4 md:px-6 py-12 md:py-20">
      <div className="max-w-[920px] mx-auto flex flex-col gap-6">
        <div className="flex flex-col gap-2 max-w-[760px]">
          <div className="font-semibold text-lg text-chalk light:text-chalk-light">{copy.eyebrow}</div>
          <SectionHeading className="mb-0">{copy.heading}</SectionHeading>
          <p className="m-0 text-fog light:text-fog-light">{copy.body}</p>
          <p className="m-0 font-barlow font-semibold text-chalk light:text-chalk-light">
            {data ? joinPriceLine(data.price) : copy.priceFallback}
          </p>
        </div>
        {visible.length > 0 ? (
          <PerkList perks={visible} />
        ) : (
          <div className="h-24 rounded-xl bg-smoke/40 light:bg-smoke-light/50 animate-pulse" aria-hidden="true" />
        )}
      </div>
    </section>
  )
}

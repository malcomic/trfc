import { useEffect, useState } from 'react'
import {
  decideDispute,
  decideMissingScan,
  getAwardsPreview,
  getInTheRace,
  getPointsSettings,
  listAwardEntries,
  listCaptainScores,
  listDisputes,
  listMissingScans,
  listPointsFlags,
  postAwardWinner,
  postDisqualify,
  postSeasonAdjustment,
  postZoneChange,
  resolvePointsFlag,
  updatePointsSettings,
} from '../../api/admin/points'

export default function AdminPoints() {
  const [settings, setSettings] = useState<Record<string, unknown> | null>(null)
  const [flags, setFlags] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [race, setRace] = useState<any[]>([])
  const [awards, setAwards] = useState<any>(null)
  const [disputes, setDisputes] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [scores, setScores] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [adjust, setAdjust] = useState({ userId: '', points: '10', reason: '' })
  const [zoneChange, setZoneChange] = useState({ userId: '', newCaptainId: '', reason: '' })
  const [disqualify, setDisqualify] = useState({ userId: '', reason: '' })

  const reload = () => {
    getPointsSettings().then(setSettings).catch(() => undefined)
    listPointsFlags().then(setFlags).catch(() => undefined)
    listMissingScans().then(setReports).catch(() => undefined)
    getInTheRace().then(setRace).catch(() => undefined)
    getAwardsPreview().then(setAwards).catch(() => undefined)
    listDisputes().then(setDisputes).catch(() => undefined)
    listAwardEntries().then(setEntries).catch(() => undefined)
    listCaptainScores().then(setScores).catch(() => undefined)
  }

  useEffect(() => {
    reload()
  }, [])

  if (!settings) return <p className="p-6 text-gray-500">Loading points…</p>

  return (
    <div className="space-y-8 p-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Season points</h1>
        <p className="text-sm text-gray-500 mt-1">Settings, fairness flags, missing scans, and awards preview.</p>
        {message && <p className="mt-2 text-sm text-emerald-600">{message}</p>}
      </div>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-semibold">Point values</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {(
            [
              ['zoneRunPoints', 'Zone run'],
              ['commonRunPoints', 'Common run'],
              ['hikeFitfestPoints', 'Hike / Fit Fest'],
              ['marathonPoints', 'Marathon'],
              ['streakBonusPoints', 'Streak bonus'],
              ['scanGraceHours', 'Scan grace hours'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-gray-500">{label}</span>
              <input
                type="number"
                className="mt-1 w-full rounded border px-3 py-2 dark:bg-gray-900"
                value={Number(settings[key] ?? 0)}
                onChange={(e) => setSettings({ ...settings, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          className="rounded bg-gray-900 text-white px-4 py-2 text-sm"
          onClick={async () => {
            try {
              const next = await updatePointsSettings(settings)
              setSettings(next)
              setMessage('Settings saved')
            } catch {
              setMessage('Could not save settings')
            }
          }}
        >
          Save settings
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-semibold">Season adjustment</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            className="rounded border px-3 py-2 dark:bg-gray-900"
            placeholder="User id"
            value={adjust.userId}
            onChange={(e) => setAdjust({ ...adjust, userId: e.target.value })}
          />
          <input
            className="rounded border px-3 py-2 dark:bg-gray-900"
            placeholder="Points (+/-)"
            value={adjust.points}
            onChange={(e) => setAdjust({ ...adjust, points: e.target.value })}
          />
          <input
            className="rounded border px-3 py-2 dark:bg-gray-900"
            placeholder="Reason"
            value={adjust.reason}
            onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })}
          />
        </div>
        <button
          type="button"
          className="rounded bg-gray-900 text-white px-4 py-2 text-sm"
          onClick={async () => {
            try {
              await postSeasonAdjustment({
                userId: adjust.userId.trim(),
                points: Number(adjust.points),
                reason: adjust.reason.trim(),
              })
              setMessage('Adjustment posted')
              setAdjust({ userId: '', points: '10', reason: '' })
            } catch {
              setMessage('Adjustment failed')
            }
          }}
        >
          Post adjustment
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-3">Open flags ({flags.length})</h2>
        <ul className="space-y-2 text-sm">
          {flags.map((f) => (
            <li key={f.id} className="flex justify-between gap-3 border-b border-gray-100 dark:border-gray-800 py-2">
              <span>
                <strong>{f.type}</strong> — {f.detail}
              </span>
              <button type="button" className="underline" onClick={() => resolvePointsFlag(f.id).then(reload)}>
                Resolve
              </button>
            </li>
          ))}
          {flags.length === 0 && <li className="text-gray-500">No open flags</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-3">Missing scan reports</h2>
        <ul className="space-y-2 text-sm">
          {reports.map((r) => (
            <li key={r.id} className="border-b border-gray-100 dark:border-gray-800 py-2">
              <p>
                {r.member_name} · {r.event_title}
              </p>
              <div className="mt-1 flex gap-3">
                <button type="button" className="underline" onClick={() => decideMissingScan(r.id, 'approved').then(reload)}>
                  Approve
                </button>
                <button type="button" className="underline" onClick={() => decideMissingScan(r.id, 'rejected').then(reload)}>
                  Reject
                </button>
              </div>
            </li>
          ))}
          {reports.length === 0 && <li className="text-gray-500">No pending reports</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-3">In the race ({race.length})</h2>
        <p className="text-sm text-gray-500 mb-2">Fully paid by the cutoff.</p>
        <ul className="text-sm max-h-48 overflow-auto space-y-1">
          {race.slice(0, 50).map((m) => (
            <li key={m.id}>
              {m.name} · {m.zone || 'No zone'}
            </li>
          ))}
        </ul>
      </section>

      {awards && (
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-2">
          <h2 className="font-semibold">Awards preview</h2>
          <p>Champion: {awards.champion?.name ?? '—'} ({awards.champion?.points ?? 0} pts)</p>
          <p>Mombasa draw pool: {awards.mombasaDraw?.length ?? 0} members</p>
          <p>Most consistent: {awards.mostConsistent?.name ?? '—'}</p>
          <p>Most improved: {awards.mostImproved?.name ?? '—'}</p>
          <p>Top referrer: {awards.topReferrer?.name ?? '—'}</p>
          {awards.captainOfTheYear && (
            <p>Captain of the Year (avg): {awards.captainOfTheYear.zoneName} · {awards.captainOfTheYear.avg}</p>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-semibold">Admin zone / captain change</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <input className="rounded border px-3 py-2 dark:bg-gray-900" placeholder="Member user id" value={zoneChange.userId} onChange={(e) => setZoneChange({ ...zoneChange, userId: e.target.value })} />
          <input className="rounded border px-3 py-2 dark:bg-gray-900" placeholder="New captain user id" value={zoneChange.newCaptainId} onChange={(e) => setZoneChange({ ...zoneChange, newCaptainId: e.target.value })} />
          <input className="rounded border px-3 py-2 dark:bg-gray-900" placeholder="Reason" value={zoneChange.reason} onChange={(e) => setZoneChange({ ...zoneChange, reason: e.target.value })} />
        </div>
        <button type="button" className="rounded bg-gray-900 text-white px-4 py-2 text-sm" onClick={async () => {
          try {
            await postZoneChange(zoneChange)
            setMessage('Zone/captain changed')
            setZoneChange({ userId: '', newCaptainId: '', reason: '' })
          } catch { setMessage('Zone change failed (zones may be locked)') }
        }}>Apply change</button>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
        <h2 className="font-semibold">Disqualify (cheat)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className="rounded border px-3 py-2 dark:bg-gray-900" placeholder="User id" value={disqualify.userId} onChange={(e) => setDisqualify({ ...disqualify, userId: e.target.value })} />
          <input className="rounded border px-3 py-2 dark:bg-gray-900" placeholder="Reason" value={disqualify.reason} onChange={(e) => setDisqualify({ ...disqualify, reason: e.target.value })} />
        </div>
        <button type="button" className="rounded bg-red-700 text-white px-4 py-2 text-sm" onClick={async () => {
          try {
            await postDisqualify(disqualify)
            setMessage('Member disqualified')
            setDisqualify({ userId: '', reason: '' })
            reload()
          } catch { setMessage('Disqualify failed') }
        }}>Strip season points</button>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-3">Disputes</h2>
        <ul className="space-y-2 text-sm">
          {disputes.map((d) => (
            <li key={d.id} className="border-b border-gray-100 dark:border-gray-800 py-2">
              <p>{d.member_name}: {d.body}</p>
              <div className="mt-1 flex gap-3">
                <button type="button" className="underline" onClick={() => decideDispute(d.id, { decision: 'approved' }).then(reload)}>Approve</button>
                <button type="button" className="underline" onClick={() => decideDispute(d.id, { decision: 'rejected' }).then(reload)}>Reject</button>
              </div>
            </li>
          ))}
          {disputes.length === 0 && <li className="text-gray-500">No pending disputes</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-3">Award entries</h2>
        <ul className="space-y-2 text-sm max-h-48 overflow-auto">
          {entries.map((e) => (
            <li key={e.id} className="flex justify-between gap-2 border-b border-gray-100 dark:border-gray-800 py-1">
              <span>{e.award} · {e.member_name} · {e.source}</span>
              <button type="button" className="underline" onClick={() => postAwardWinner({ award: e.award, userId: e.user_id }).then(() => setMessage(`Winner set for ${e.award}`))}>Mark winner</button>
            </li>
          ))}
          {entries.length === 0 && <li className="text-gray-500">No entries yet</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-semibold mb-3">Captain scorecards</h2>
        <ul className="text-sm space-y-1 max-h-48 overflow-auto">
          {scores.map((s) => (
            <li key={s.id}>{s.month} · {s.zone_name}: {Number(s.total).toFixed(1)}</li>
          ))}
          {scores.length === 0 && <li className="text-gray-500">No scores yet</li>}
        </ul>
      </section>
    </div>
  )
}

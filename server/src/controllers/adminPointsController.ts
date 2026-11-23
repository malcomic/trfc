import { Request, Response } from 'express'
import { query } from '../config/db.js'
import {
  captainOfTheYear,
  freezeSeason,
  lockZonesForSeason,
  mombasaDrawList,
  mostConsistent,
  mostImproved,
  openSeason2,
  seasonChampion,
  topReferrer,
} from '../utils/pointsAwards.js'
import { getCurrentSeason } from '../utils/pointsEligibility.js'
import { appendSeasonPoints } from '../utils/pointsLedger.js'
import {
  getPointsSettings,
  parsePointsSettings,
  updatePointsSettings,
} from '../utils/pointsSettings.js'
import { appendRewardPoints } from '../utils/rewardLedger.js'

export async function getSettings(_req: Request, res: Response) {
  try {
    res.json(await getPointsSettings({ fresh: true }))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load points settings' })
  }
}

export async function putSettings(req: Request, res: Response) {
  try {
    const current = await getPointsSettings({ fresh: true })
    const parsed = parsePointsSettings(req.body, current)
    if (typeof parsed === 'string') return res.status(400).json({ error: parsed })
    await updatePointsSettings(parsed, req.user!.id)
    res.json(parsed)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update points settings' })
  }
}

export async function postAdjustment(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
    const points = Number(req.body?.points)
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    if (!userId || !Number.isInteger(points) || points === 0) {
      return res.status(400).json({ error: 'userId and non-zero integer points are required' })
    }
    if (!reason || reason.length < 3) return res.status(400).json({ error: 'A written reason is required' })
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    if (season.status === 'frozen' || season.frozen_at) {
      return res.status(403).json({ error: 'Season results are frozen' })
    }
    const row = await appendSeasonPoints({
      seasonId: season.id,
      userId,
      points,
      kind: 'adjustment',
      reason,
      createdBy: req.user!.id,
    })
    res.status(201).json(row)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to post adjustment' })
  }
}

export async function listFlags(req: Request, res: Response) {
  try {
    const open = req.query.open !== 'false'
    const result = await query(
      `SELECT * FROM points_flags
       WHERE ($1::boolean = false OR resolved_at IS NULL)
       ORDER BY created_at DESC
       LIMIT 200`,
      [open]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load flags' })
  }
}

export async function resolveFlag(req: Request, res: Response) {
  try {
    const result = await query(
      `UPDATE points_flags SET resolved_by = $2, resolved_at = NOW()
       WHERE id = $1 AND resolved_at IS NULL
       RETURNING *`,
      [req.params.id, req.user!.id]
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Flag not found' })
    res.json(result.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to resolve flag' })
  }
}

export async function listMissingScans(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending'
    const result = await query(
      `SELECT msr.*, u.name AS member_name, e.title AS event_title, e.event_date
       FROM missing_scan_reports msr
       JOIN users u ON u.id = msr.user_id
       JOIN events e ON e.id = msr.event_id
       WHERE msr.status = $1
       ORDER BY msr.created_at ASC
       LIMIT 200`,
      [status]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load reports' })
  }
}

export async function decideMissingScan(req: Request, res: Response) {
  try {
    const decision = req.body?.decision === 'approved' ? 'approved' : req.body?.decision === 'rejected' ? 'rejected' : null
    if (!decision) return res.status(400).json({ error: 'decision must be approved or rejected' })
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : null
    const updated = await query(
      `UPDATE missing_scan_reports
       SET status = $2, decided_by = $3, decided_at = NOW(),
           note = CASE WHEN $4::text IS NULL THEN note ELSE COALESCE(note || E'\\n', '') || $4 END
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id, decision, req.user!.id, note]
    )
    const row = updated.rows[0]
    if (!row) return res.status(404).json({ error: 'Report not found' })

    if (decision === 'approved') {
      const season = await getCurrentSeason()
      const event = await query(
        `SELECT id, season_id, points_kind, event_date FROM events WHERE id = $1`,
        [row.event_id]
      )
      const ev = event.rows[0]
      if (season && ev) {
        const checkin = await query(
          `INSERT INTO event_checkins (event_id, user_id, scanned_by, method)
           VALUES ($1, $2, $3, 'code')
           ON CONFLICT (event_id, user_id) DO NOTHING
           RETURNING id`,
          [row.event_id, row.user_id, req.user!.id]
        )
        const { pointsForKind, getPointsSettings } = await import('../utils/pointsSettings.js')
        const settings = await getPointsSettings()
        const pts = pointsForKind(settings, ev.points_kind)
        if (pts > 0 && checkin.rows[0]) {
          await appendSeasonPoints({
            seasonId: ev.season_id || season.id,
            userId: row.user_id,
            points: pts,
            kind: 'scan',
            eventId: row.event_id,
            checkinId: checkin.rows[0].id,
            reason: 'Missing scan approved',
            createdBy: req.user!.id,
          })
        } else if (pts > 0) {
          await appendSeasonPoints({
            seasonId: ev.season_id || season.id,
            userId: row.user_id,
            points: pts,
            kind: 'adjustment',
            eventId: row.event_id,
            reason: 'Missing scan approved',
            createdBy: req.user!.id,
          })
        }
      }
    }
    res.json(row)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to decide report' })
  }
}

export async function listInTheRace(_req: Request, res: Response) {
  try {
    const settings = await getPointsSettings()
    const result = await query(
      `SELECT u.id, u.name, u.email, u.fully_paid_at, r.name AS zone
       FROM users u
       LEFT JOIN captains c ON c.user_id = u.captain_id
       LEFT JOIN regions r ON r.id = COALESCE(u.referred_by_region_id, c.region_id)
       LEFT JOIN captains cap ON cap.user_id = u.id AND cap.status = 'active'
       WHERE cap.user_id IS NULL
         AND u.fully_paid_at IS NOT NULL
         AND u.fully_paid_at <= $1
       ORDER BY u.fully_paid_at, u.name`,
      [settings.raceCutoffAt]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load race list' })
  }
}

export async function getAwardsPreview(_req: Request, res: Response) {
  try {
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const [champion, draw, consistent, improved, referrer, coty] = await Promise.all([
      seasonChampion(season.id),
      mombasaDrawList(season.id),
      mostConsistent(season.id),
      mostImproved(season.id),
      topReferrer(),
      captainOfTheYear(season.id),
    ])
    res.json({
      champion,
      mombasaDraw: draw,
      mostConsistent: consistent,
      mostImproved: improved,
      topReferrer: referrer,
      captainOfTheYear: coty,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to preview awards' })
  }
}

export async function postFreeze(req: Request, res: Response) {
  try {
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    await freezeSeason(season.id)
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to freeze season' })
  }
}

export async function postLockZones(_req: Request, res: Response) {
  try {
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    await lockZonesForSeason(season.id)
    res.json({ ok: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to lock zones' })
  }
}

export async function postOpenSeason2(_req: Request, res: Response) {
  try {
    const id = await openSeason2()
    res.json({ seasonId: id })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to open Season 2' })
  }
}

export async function postRewardAdjustment(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId : ''
    const points = Number(req.body?.points)
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    if (!userId || !Number.isInteger(points) || points === 0 || reason.length < 3) {
      return res.status(400).json({ error: 'userId, non-zero points, and reason are required' })
    }
    const row = await appendRewardPoints({
      userId,
      points,
      kind: 'adjustment',
      reason,
      createdBy: req.user!.id,
      expiresAt: points > 0 ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null,
    })
    res.status(201).json(row)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to adjust reward points' })
  }
}

export async function postZoneChange(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
    const newCaptainId = typeof req.body?.newCaptainId === 'string' ? req.body.newCaptainId.trim() : ''
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    if (!userId || !newCaptainId || reason.length < 3) {
      return res.status(400).json({ error: 'userId, newCaptainId, and reason are required' })
    }
    const locked = await query(`SELECT 1 FROM regions WHERE locked_at IS NOT NULL LIMIT 1`)
    if (locked.rows[0]) {
      return res.status(403).json({ error: 'Zones are locked for the season' })
    }
    const member = await query(
      `SELECT u.captain_id, COALESCE(u.referred_by_region_id, oc.region_id) AS zone_id
       FROM users u
       LEFT JOIN captains oc ON oc.user_id = u.captain_id
       WHERE u.id = $1`,
      [userId]
    )
    if (!member.rows[0]) return res.status(404).json({ error: 'Member not found' })
    const captain = await query(
      `SELECT c.user_id, c.region_id FROM captains c
       JOIN regions r ON r.id = c.region_id
       WHERE c.user_id = $1 AND c.status = 'active' AND r.is_active = true`,
      [newCaptainId]
    )
    if (!captain.rows[0]) return res.status(400).json({ error: 'Choose an active captain' })

    const oldCaptainId = member.rows[0].captain_id
    const oldZoneId = member.rows[0].zone_id
    await query(
      `UPDATE users SET captain_id = $2, captain_chosen_at = NOW(),
             referred_by_region_id = COALESCE(referred_by_region_id, $3)
       WHERE id = $1`,
      [userId, newCaptainId, captain.rows[0].region_id]
    )
    const row = await query(
      `INSERT INTO zone_changes
         (user_id, old_captain_id, new_captain_id, old_zone_id, new_zone_id, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        oldCaptainId,
        newCaptainId,
        oldZoneId,
        captain.rows[0].region_id,
        req.user!.id,
        reason,
      ]
    )
    res.status(201).json(row.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to change zone/captain' })
  }
}

export async function postDisqualify(req: Request, res: Response) {
  try {
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
    if (!userId || reason.length < 3) {
      return res.status(400).json({ error: 'userId and reason are required' })
    }
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const balance = await query(
      `SELECT COALESCE(SUM(points), 0)::int AS total FROM points_ledger WHERE user_id = $1 AND season_id = $2`,
      [userId, season.id]
    )
    const total = Number(balance.rows[0]?.total ?? 0)
    if (total !== 0) {
      await appendSeasonPoints({
        seasonId: season.id,
        userId,
        points: -total,
        kind: 'adjustment',
        reason: `Disqualified: ${reason}`,
        createdBy: req.user!.id,
      })
    }
    await query(`UPDATE users SET points_disqualified_season_id = $2 WHERE id = $1`, [userId, season.id])
    res.json({ ok: true, pointsRemoved: total })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to disqualify member' })
  }
}

export async function listDisputes(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : 'pending'
    const result = await query(
      `SELECT d.*, u.name AS member_name
       FROM points_disputes d
       JOIN users u ON u.id = d.user_id
       WHERE d.status = $1
       ORDER BY d.created_at ASC
       LIMIT 200`,
      [status]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load disputes' })
  }
}

export async function decideDispute(req: Request, res: Response) {
  try {
    const decision = req.body?.decision === 'approved' ? 'approved' : req.body?.decision === 'rejected' ? 'rejected' : null
    if (!decision) return res.status(400).json({ error: 'decision must be approved or rejected' })
    const coachId = typeof req.body?.coachId === 'string' ? req.body.coachId : null
    const otherCaptainId = typeof req.body?.otherCaptainId === 'string' ? req.body.otherCaptainId : null
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : null
    const updated = await query(
      `UPDATE points_disputes
       SET status = $2, decided_by = $3, decided_at = NOW(),
           coach_id = $4, other_captain_id = $5, decision_note = $6
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id, decision, req.user!.id, coachId, otherCaptainId, note]
    )
    if (!updated.rows[0]) return res.status(404).json({ error: 'Dispute not found' })
    res.json(updated.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to decide dispute' })
  }
}

export async function listAwardEntries(req: Request, res: Response) {
  try {
    const award = typeof req.query.award === 'string' ? req.query.award : null
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const result = await query(
      `SELECT ae.*, u.name AS member_name
       FROM award_entries ae
       JOIN users u ON u.id = ae.user_id
       WHERE ae.season_id = $1 AND ($2::text IS NULL OR ae.award = $2)
       ORDER BY ae.created_at DESC
       LIMIT 500`,
      [season.id, award]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load award entries' })
  }
}

export async function postAwardWinner(req: Request, res: Response) {
  try {
    const award = typeof req.body?.award === 'string' ? req.body.award.trim() : ''
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : ''
    if (!award || !userId) return res.status(400).json({ error: 'award and userId are required' })
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const row = await query(
      `INSERT INTO award_winners (season_id, award, user_id, decided_by, decided_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (season_id, award) DO UPDATE
         SET user_id = EXCLUDED.user_id, decided_by = EXCLUDED.decided_by, decided_at = NOW()
       RETURNING *`,
      [season.id, award, userId, req.user!.id]
    )
    res.status(201).json(row.rows[0])
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to mark winner' })
  }
}

export async function listCaptainScores(req: Request, res: Response) {
  try {
    const month = typeof req.query.month === 'string' ? req.query.month : null
    const season = await getCurrentSeason()
    if (!season) return res.status(404).json({ error: 'No active season' })
    const result = await query(
      `SELECT cs.*, r.name AS zone_name
       FROM captain_scores cs
       JOIN regions r ON r.id = cs.zone_id
       WHERE cs.season_id = $1 AND ($2::text IS NULL OR cs.month = $2)
       ORDER BY cs.month DESC, cs.total DESC`,
      [season.id, month]
    )
    res.json(result.rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load captain scores' })
  }
}

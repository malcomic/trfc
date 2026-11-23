import { getPointsSettings } from './pointsSettings.js'

/** Points → KSh after member discount, capped so due never goes negative. */
export function rewardKesForPoints(
  points: number,
  redeemKesPerPoint: number,
  maxKes: number
): { points: number; kes: number } {
  if (!Number.isInteger(points) || points <= 0 || maxKes <= 0 || redeemKesPerPoint <= 0) {
    return { points: 0, kes: 0 }
  }
  const maxPoints = Math.floor(maxKes / redeemKesPerPoint)
  const applied = Math.min(points, maxPoints)
  return { points: applied, kes: applied * redeemKesPerPoint }
}

export async function resolveRewardKes(points: number, maxKes: number) {
  const settings = await getPointsSettings()
  return rewardKesForPoints(points, settings.redeemKesPerPoint, maxKes)
}

import { LEVEL_STEP, MAX_LEVEL } from '@/shared/constants'

export function levelForXp(xp: number): number {
  if (xp <= 0) return 1
  const level = Math.floor(Math.sqrt(xp / LEVEL_STEP)) + 1
  return Math.min(MAX_LEVEL, Math.max(1, level))
}

export function xpForLevel(level: number): number {
  const bounded = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)))
  return (bounded - 1) ** 2 * LEVEL_STEP
}

export function progressToNextLevel(xp: number): {
  current: number
  next: number
  percent: number
} {
  const level = levelForXp(xp)
  const currentFloor = xpForLevel(level)
  const nextFloor = level >= MAX_LEVEL ? currentFloor : xpForLevel(level + 1)
  const span = Math.max(1, nextFloor - currentFloor)
  const percent = Math.min(100, Math.round(((xp - currentFloor) / span) * 100))
  return { current: currentFloor, next: nextFloor, percent }
}

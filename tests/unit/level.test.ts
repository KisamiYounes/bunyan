import { describe, expect, it } from 'vitest'
import { LEVEL_STEP, MAX_LEVEL } from '@/shared/constants'
import { levelForXp, progressToNextLevel, xpForLevel } from '@/shared/utils/level'

describe('level curve', () => {
  it('starts every account at level 1', () => {
    expect(levelForXp(0)).toBe(1)
    expect(levelForXp(-10)).toBe(1)
  })

  it('increases level with the documented square-root curve', () => {
    expect(levelForXp(LEVEL_STEP)).toBe(2)
    expect(levelForXp(LEVEL_STEP * 4)).toBe(3)
    expect(levelForXp(LEVEL_STEP * 9)).toBe(4)
  })

  it('never exceeds the level cap', () => {
    expect(levelForXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL)
  })

  it('round-trips the XP floor for a level', () => {
    for (const level of [1, 2, 3, 7, 20, MAX_LEVEL]) {
      expect(levelForXp(xpForLevel(level))).toBe(level)
    }
  })

  it('reports bounded progress towards the next level', () => {
    expect(progressToNextLevel(0)).toEqual({ current: 0, next: LEVEL_STEP, percent: 0 })
    expect(progressToNextLevel(LEVEL_STEP).percent).toBe(0)
    const midLevelTwo = progressToNextLevel(LEVEL_STEP * 2)
    expect(midLevelTwo.current).toBe(LEVEL_STEP)
    expect(midLevelTwo.next).toBe(LEVEL_STEP * 4)
    expect(midLevelTwo.percent).toBe(33)
    const levelThree = progressToNextLevel(LEVEL_STEP * 4)
    expect(levelThree.current).toBe(LEVEL_STEP * 4)
    expect(levelThree.percent).toBe(0)
    const midLevelThree = progressToNextLevel(LEVEL_STEP * 5)
    expect(midLevelThree.current).toBe(LEVEL_STEP * 4)
    expect(midLevelThree.next).toBe(LEVEL_STEP * 9)
    expect(midLevelThree.percent).toBeGreaterThan(0)
    expect(midLevelThree.percent).toBeLessThan(100)
  })
})

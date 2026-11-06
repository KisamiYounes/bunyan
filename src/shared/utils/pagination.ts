import { MAX_PAGE_SIZE, PAGE_SIZE } from '@/shared/constants'

export interface Pagination {
  page: number
  limit: number
  skip: number
}

export function parsePagination(
  pageInput?: string | number | null,
  limitInput?: string | number | null,
): Pagination {
  const page = Math.max(1, toInt(pageInput, 1))
  const requestedLimit = toInt(limitInput, PAGE_SIZE)
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit))
  return { page, limit, skip: (page - 1) * limit }
}

function toInt(value: string | number | null | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

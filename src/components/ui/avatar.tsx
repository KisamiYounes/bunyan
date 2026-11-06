import { cn } from '@/shared/utils/cn'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0]!.slice(0, 2)
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`
}

function hue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360
  }
  return hash
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dimensions =
    size === 'sm' ? 'h-8 w-8 text-xs' : size === 'lg' ? 'h-16 w-16 text-xl' : 'h-10 w-10 text-sm'

  if (src) {
    return (
      // Avatars are arbitrary user-supplied https URLs, so next/image remote patterns cannot be
      // declared ahead of time. The image is lazy-loaded and sized by CSS.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          'shrink-0 rounded-full border border-border object-cover',
          dimensions,
          className,
        )}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    )
  }

  const h = hue(name)
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-border font-semibold',
        dimensions,
        className,
      )}
      style={{
        backgroundColor: `hsl(${h} 34% 88%)`,
        color: `hsl(${h} 45% 24%)`,
      }}
    >
      {initials(name)}
    </span>
  )
}

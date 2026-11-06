import { cn } from '@/shared/utils/cn'

export type BadgeVariant = 'neutral' | 'primary' | 'accent' | 'success' | 'danger' | 'warning'

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-muted text-muted-foreground border-border',
  primary: 'bg-primary/10 text-primary border-primary/25',
  accent: 'bg-accent/15 text-accent-foreground border-accent/30 dark:text-accent',
  success: 'bg-success/10 text-success border-success/25',
  danger: 'bg-danger/10 text-danger border-danger/25',
  warning: 'bg-warning/10 text-warning border-warning/25',
}

export function Badge({
  variant = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

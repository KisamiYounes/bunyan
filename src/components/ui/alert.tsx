import { cn } from '@/shared/utils/cn'

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

const variants: Record<AlertVariant, string> = {
  info: 'border-primary/25 bg-primary/5 text-foreground',
  success: 'border-success/30 bg-success/10 text-foreground',
  warning: 'border-warning/30 bg-warning/10 text-foreground',
  danger: 'border-danger/30 bg-danger/10 text-foreground',
}

export function Alert({
  variant = 'info',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }) {
  return (
    <div
      className={cn('rounded-md border p-4 text-sm', variants[variant], className)}
      role={variant === 'danger' ? 'alert' : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

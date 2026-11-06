export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 animate-pulse">
      <header className="border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 h-16" />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-surface-200 dark:bg-surface-800 rounded" />
            <div className="h-4 w-64 bg-surface-200 dark:bg-surface-800 rounded" />
          </div>
          <div className="h-10 w-36 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-surface-200 dark:bg-surface-800 rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  )
}
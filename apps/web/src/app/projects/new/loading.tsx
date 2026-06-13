export default function NewProjectLoading() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg animate-pulse space-y-6">
        <div className="h-8 w-48 bg-surface-200 dark:bg-surface-800 rounded mx-auto" />
        <div className="h-4 w-64 bg-surface-200 dark:bg-surface-800 rounded mx-auto" />
        <div className="h-12 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-surface-200 dark:bg-surface-800 rounded-lg" />
          <div className="h-24 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        </div>
        <div className="h-12 bg-surface-200 dark:bg-surface-800 rounded-lg" />
      </div>
    </div>
  )
}
'use client'

import { Button } from '@nexcut/ui/components/Button'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">Dashboard Error</h1>
        <p className="text-surface-500 mb-6 text-sm">
          {error.message || 'Failed to load dashboard'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
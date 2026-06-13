'use client'

import { Button } from '@nexcut/ui/components/Button'

export default function ProjectsError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">Project Error</h1>
        <p className="text-surface-500 mb-6 text-sm">
          {error.message || 'Something went wrong'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
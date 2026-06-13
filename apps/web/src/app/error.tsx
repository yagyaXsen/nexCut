'use client'

import { Button } from '@nexcut/ui/components/Button'

export default function RootError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-surface-400 mb-6 text-sm">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  )
}
'use client'

import { Button } from '@nexcut/ui/components/Button'

export default function ProjectStepError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-3xl mx-auto py-12 text-center">
      <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100 mb-2">Step Error</h2>
      <p className="text-surface-500 mb-6 text-sm">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
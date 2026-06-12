'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Input } from '@nexcut/ui/components/Input'
import { Card } from '@nexcut/ui/components/Card'

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'CREATOR' | 'BUSINESS'>('CREATOR')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mode }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create project')
      }

      const { project } = await res.json()
      router.push(`/projects/${project.id}/references`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Create New Project</h1>
          <p className="mt-1 text-surface-500 dark:text-surface-400">Start by naming your project and choosing a mode</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Project Name"
            placeholder="e.g., Gym Progress Reel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('CREATOR')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  mode === 'CREATOR'
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 dark:border-brand-400'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">Creator</h3>
                <p className="text-sm text-surface-500">Reference reels + footage → styled reel</p>
              </button>
              <button
                type="button"
                onClick={() => setMode('BUSINESS')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  mode === 'BUSINESS'
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 dark:border-brand-400'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                }`}
              >
                <h3 className="font-semibold text-surface-900 dark:text-surface-100">Business</h3>
                <p className="text-sm text-surface-500">Assets + brand kit → marketing reels</p>
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" fullWidth size="lg" loading={loading}>
            Create Project
          </Button>
        </form>
      </Card>
    </div>
  )
}
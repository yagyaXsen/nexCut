'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Progress } from '@nexcut/ui/components/Progress'
import { Play, Pause, Maximize2, RefreshCw, CheckCircle2 } from 'lucide-react'

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [status, setStatus] = useState<'analyzing' | 'preview_ready' | 'rendering' | 'ready' | 'error'>('analyzing')
  const [progress, setProgress] = useState(30)

  async function handleRegenerate() {
    setStatus('analyzing')
    setProgress(10)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval)
          return 90
        }
        return prev + 5
      })
    }, 2000)

    try {
      await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' })
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => setStatus('preview_ready'), 500)
    } catch {
      clearInterval(interval)
      setStatus('error')
    }
  }

  async function handleGenerateFinal() {
    setStatus('rendering')
    setProgress(10)

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval)
          return 95
        }
        return prev + 2
      })
    }, 3000)

    try {
      await fetch(`/api/projects/${projectId}/render`, { method: 'POST' })
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => setStatus('ready'), 1000)
    } catch {
      clearInterval(interval)
      setStatus('error')
    }
  }

  const [playing, setPlaying] = useState(false)

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Preview</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          Review the AI-generated reel. Regenerate if needed, then render the final version.
        </p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="aspect-[9/16] bg-surface-900 flex items-center justify-center relative">
          {status === 'analyzing' || status === 'rendering' ? (
            <div className="text-center text-white">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
              <p className="text-lg font-medium mb-2">
                {status === 'analyzing' ? 'Analyzing footage...' : 'Rendering reel...'}
              </p>
              <p className="text-sm text-white/60">This may take a few minutes</p>
              <div className="w-64 mx-auto mt-6">
                <Progress value={progress} size="md" variant="default" />
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                className="w-full h-full object-contain"
                src=""
                controls={false}
              />
              <button
                onClick={() => setPlaying(!playing)}
                className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
              >
                {playing ? (
                  <Pause className="h-16 w-16 text-white" />
                ) : (
                  <Play className="h-16 w-16 text-white ml-2" />
                )}
              </button>
              <button className="absolute bottom-4 right-4 text-white/60 hover:text-white">
                <Maximize2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">30s</p>
                <p className="text-xs text-surface-500">Duration</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">9:16</p>
                <p className="text-xs text-surface-500">Aspect Ratio</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">1080p</p>
                <p className="text-xs text-surface-500">Resolution</p>
              </div>
            </div>

            {status === 'ready' && (
              <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Final reel ready!</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/voice-moments`)}>
          Back to Voice Moments
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleRegenerate} loading={status === 'analyzing'}>
            <RefreshCw className="h-4 w-4" />
            Regenerate Preview
          </Button>
          <Button onClick={handleGenerateFinal} loading={status === 'rendering'} size="lg" disabled={status === 'analyzing'}>
            Generate Final Reel
          </Button>
        </div>
      </div>
    </div>
  )
}
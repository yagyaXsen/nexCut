'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Download, Share2, Film, RefreshCw, Award, Layers } from 'lucide-react'

interface OutputReel {
  id: string
  aspectRatio: string
  url: string | null
  duration: number | null
  status: string
}

const aspectLabels: Record<string, string> = {
  VERTICAL_9_16: '9:16 Vertical',
  SQUARE_1_1: '1:1 Square',
  PORTRAIT_4_5: '4:5 Portrait',
}

export default function OutputPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [outputs, setOutputs] = useState<OutputReel[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}/outputs`)
        if (res.ok) {
          const data = await res.json()
          const latest = data.versions?.[0]?.reels || []
          setOutputs(latest)
        }
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  function handleCopyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDownload(url: string, label: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = `nexcut-reel-${label.replace(/\s+/g, '-').toLowerCase()}.mp4`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-4">
          <Award className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Your Reel is Ready!</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">Download or share your professionally styled reel.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {outputs.map((output) => (
          <Card key={output.id} variant="elevated" padding="none" className="overflow-hidden">
            <div className="aspect-[9/16] bg-surface-800 flex items-center justify-center relative group overflow-hidden">
              <video
                className="w-full h-full object-cover"
                src={output.url || undefined}
                muted
                loop
                preload="metadata"
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0 }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Film className="h-6 w-6 text-white ml-0.5" />
                </div>
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {aspectLabels[output.aspectRatio] || output.aspectRatio}
              </div>
              {output.duration && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                  {Math.round(output.duration)}s
                </div>
              )}
            </div>
            <CardContent className="p-4 space-y-2">
              {output.status === 'FINAL_READY' || output.status === 'PREVIEW_READY' ? (
                <>
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => output.url && handleDownload(output.url, aspectLabels[output.aspectRatio] || output.aspectRatio)}
                    disabled={!output.url}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    size="sm"
                    onClick={() => output.url && handleCopyLink(output.url, output.id)}
                    disabled={!output.url}
                  >
                    <Share2 className="h-4 w-4" />
                    {copiedId === output.id ? 'Copied!' : 'Copy Link'}
                  </Button>
                </>
              ) : (
                <Button fullWidth size="sm" disabled>
                  Processing...
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">Want to make changes?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => router.push(`/projects/${projectId}/versions`)}>
                <Layers className="h-4 w-4" />
                All Versions
              </Button>
              <Button variant="outline" onClick={() => router.push('/projects/new')}>
                Create New Project
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
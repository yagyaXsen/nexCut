'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Download, Share2, Plus, Layers, RefreshCw, CheckCircle2, Clock, Film, Music, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewVersionDialog } from '@/components/NewVersionDialog'

interface OutputReel {
  id: string
  aspectRatio: string
  version: number
  status: string
  url: string | null
  previewUrl: string | null
  duration: number | null
  settings: string
  createdAt: string
}

interface VersionGroup {
  version: number
  reels: OutputReel[]
  createdAt: string
  status: string
}

const aspectLabels: Record<string, string> = {
  VERTICAL_9_16: '9:16 Vertical',
  SQUARE_1_1: '1:1 Square',
  PORTRAIT_4_5: '4:5 Portrait',
}

const aspectShort: Record<string, string> = {
  VERTICAL_9_16: '9:16',
  SQUARE_1_1: '1:1',
  PORTRAIT_4_5: '4:5',
}

export default function VersionsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [versions, setVersions] = useState<VersionGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  async function loadVersions() {
    try {
      const res = await fetch(`/api/projects/${projectId}/outputs`)
      if (res.ok) {
        const data = await res.json()
        setVersions(data.versions || [])
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadVersions() }, [projectId])

  async function handleGenerate(settings: { variant: string; music_mood: string; targetDuration: number }) {
    setGenerating(true)
    setShowNewDialog(false)
    try {
      await fetch(`/api/projects/${projectId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      await loadVersions()
    } catch {} finally {
      setGenerating(false)
    }
  }

  function handleCopyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function handleDownload(url: string, label: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = `nexcut-v${label}.mp4`
    a.click()
  }

  function getSettings(reels: OutputReel[]) {
    try {
      const s = JSON.parse(reels[0]?.settings || '{}')
      return {
        variant: s.variant || 'balanced',
        music_mood: s.music_mood || 'auto',
        duration: s.targetDuration || 30,
      }
    } catch {
      return { variant: 'balanced', music_mood: 'auto', duration: 30 }
    }
  }

  const variantLabel = (v: string) => {
    const labels: Record<string, string> = { fast: 'Fast Cuts', balanced: 'Balanced', cinematic: 'Cinematic' }
    return labels[v] || v
  }

  const moodLabel = (m: string) => {
    const labels: Record<string, string> = {
      auto: 'Auto', high_energy: 'High Energy', motivational: 'Motivational',
      chill: 'Chill', cinematic: 'Cinematic', viral: 'Viral',
    }
    return labels[m] || m
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Layers className="h-6 w-6 text-brand-600" /> Reel Versions
          </h2>
          <p className="mt-1 text-surface-500 dark:text-surface-400">
            Browse, compare, and generate different versions of your reel.
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} size="lg">
          <Plus className="h-4 w-4" /> New Version
        </Button>
      </div>

      {generating && (
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <div>
              <p className="font-medium text-surface-900 dark:text-surface-100">Generating new version...</p>
              <p className="text-sm text-surface-500">This may take a few minutes.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {versions.length === 0 && !generating ? (
        <Card>
          <CardContent className="text-center py-16">
            <Film className="h-12 w-12 text-surface-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-1">No versions yet</h3>
            <p className="text-sm text-surface-500 mb-6">Generate your first version to get started.</p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Sparkles className="h-4 w-4" /> Generate First Version
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {versions.map((group) => {
            const s = getSettings(group.reels)
            const isReady = group.status === 'ready'
            return (
              <Card key={group.version} variant="elevated" className="overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold',
                      isReady ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300'
                    )}>
                      V{group.version}
                    </div>
                    <div>
                      <span className="font-semibold text-surface-900 dark:text-surface-100">Version {group.version}</span>
                      <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                        <span>{variantLabel(s.variant)}</span>
                        <span>·</span>
                        <span>{moodLabel(s.music_mood)}</span>
                        <span>·</span>
                        <span>{s.duration}s</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isReady ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3.5 w-3.5" /> Processing
                      </span>
                    )}
                    <span className="text-xs text-surface-400">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {group.reels.map((reel) => (
                      <div key={reel.id} className="group">
                        <div className="aspect-[9/16] bg-surface-800 rounded-lg overflow-hidden relative">
                          {reel.url ? (
                            <video
                              src={reel.url}
                              className="w-full h-full object-cover"
                              muted
                              loop
                              preload="metadata"
                              onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                              onMouseLeave={(e) => {
                                (e.target as HTMLVideoElement).pause()
                                ;(e.target as HTMLVideoElement).currentTime = 0
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-surface-600">
                              <Film className="h-8 w-8" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                            {aspectShort[reel.aspectRatio] || reel.aspectRatio}
                          </div>
                          {reel.duration && (
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                              {Math.round(reel.duration)}s
                            </div>
                          )}
                          {!isReady && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {isReady && reel.url && (
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              fullWidth
                              onClick={() => handleDownload(reel.url!, `v${group.version}-${aspectShort[reel.aspectRatio]}`)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              fullWidth
                              onClick={() => handleCopyLink(reel.url!, reel.id)}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                              {copiedId === reel.id ? 'Copied!' : 'Copy'}
                            </Button>
                          </div>
                        )}
                        {!isReady && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" fullWidth disabled>
                              <Clock className="h-3.5 w-3.5" /> Processing
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <NewVersionDialog
        open={showNewDialog}
        onClose={() => setShowNewDialog(false)}
        onGenerate={handleGenerate}
      />
    </div>
  )
}

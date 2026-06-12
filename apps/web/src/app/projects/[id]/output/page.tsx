'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Download, Share2, Film, RefreshCw, Award } from 'lucide-react'

export default function OutputPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [copied, setCopied] = useState(false)

  const outputs = [
    { id: 'v1', label: '9:16 Vertical', url: '#', duration: '30s', status: 'ready' },
    { id: 'v2', label: '1:1 Square', url: '#', duration: '30s', status: 'ready' },
    { id: 'v3', label: '4:5 Portrait', url: '#', duration: '30s', status: 'ready' },
  ]

  function handleCopyLink(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload(url: string, label: string) {
    const a = document.createElement('a')
    a.href = url
    a.download = `nexcut-reel-${label.replace(/\s+/g, '-').toLowerCase()}.mp4`
    a.click()
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
                {output.label}
              </div>
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                {output.duration}
              </div>
            <CardContent className="p-4 space-y-2">
              <Button
                fullWidth
                size="sm"
                onClick={() => handleDownload(output.url, output.label)}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                fullWidth
                size="sm"
                onClick={() => handleCopyLink(output.url)}
              >
                <Share2 className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold text-surface-900 dark:text-surface-100">Want to make changes?</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => router.push(`/projects/${projectId}/preview`)}>
                <RefreshCw className="h-4 w-4" />
                Regenerate
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
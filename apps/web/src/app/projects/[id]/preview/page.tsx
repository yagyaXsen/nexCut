'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Progress } from '@nexcut/ui/components/Progress'
import { Play, Pause, Maximize2, RefreshCw, CheckCircle2, Mic, Film, Music, Wand2 } from 'lucide-react'

type AnalysisStage = 'style_dna' | 'processing' | 'voice' | 'rendering' | 'preview_ready' | 'final_ready' | 'error'

const stageInfo = {
  style_dna:    { label: 'Extracting style from references...',  icon: Film,        progress: 25 },
  processing:   { label: 'Processing footage...',                 icon: Music,       progress: 50 },
  voice:        { label: 'Detecting voice moments...',            icon: Mic,         progress: 75 },
  rendering:    { label: 'Rendering preview...',                  icon: Wand2,       progress: 90 },
  preview_ready:{ label: 'Preview ready!',                       icon: CheckCircle2, progress: 100 },
  final_ready:  { label: 'Final reel ready!',                    icon: CheckCircle2, progress: 100 },
  error:        { label: 'Something went wrong',                  icon: CheckCircle2, progress: 0 },
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [stage, setStage] = useState<AnalysisStage>('style_dna')
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    startAnalysis()
  }, [])

  async function startAnalysis() {
    setStage('style_dna')
    await sleep(1500)
    setStage('processing')
    await sleep(1500)
    setStage('voice')
    await sleep(1500)
    setStage('rendering')

    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' })
      if (!res.ok) throw new Error('Analysis failed')
      setStage('preview_ready')

      const renderRes = await fetch(`/api/projects/${projectId}/render`, { method: 'POST' })
      if (renderRes.ok) {
        setStage('final_ready')
      }
    } catch {
      setStage('error')
    }
  }

  async function handleGenerateFinal() {
    setStage('rendering')
    try {
      const res = await fetch(`/api/projects/${projectId}/render`, { method: 'POST' })
      if (!res.ok) throw new Error('Render failed')
      setStage('final_ready')
    } catch {
      setStage('error')
    }
  }

  function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const currentStage = stageInfo[stage]
  const StageIcon = currentStage.icon

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Generating Your Reel</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          AI is analyzing your references and footage. No manual steps needed.
        </p>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="aspect-[9/16] bg-surface-900 flex items-center justify-center relative">
          {stage === 'style_dna' || stage === 'processing' || stage === 'voice' || stage === 'rendering' ? (
            <div className="text-center text-white px-6">
              <StageIcon className="h-10 w-10 mx-auto mb-4 text-brand-400 animate-pulse" />
              <p className="text-base font-medium mb-2">{currentStage.label}</p>
              <p className="text-sm text-white/60">This may take a few minutes</p>
              <div className="w-64 mx-auto mt-6">
                <Progress value={currentStage.progress} size="md" />
              </div>
              <div className="flex justify-center gap-6 mt-6 text-xs text-white/40">
                <div className={`flex items-center gap-1.5 ${stage === 'style_dna' || stage === 'processing' || stage === 'voice' || stage === 'rendering' ? 'text-brand-400' : 'text-white/40'}`}>
                  <Film className="h-3 w-3" /> Style
                </div>
                <div className={`flex items-center gap-1.5 ${stage === 'processing' || stage === 'voice' || stage === 'rendering' ? 'text-brand-400' : 'text-white/40'}`}>
                  <Music className="h-3 w-3" /> Footage
                </div>
                <div className={`flex items-center gap-1.5 ${stage === 'voice' || stage === 'rendering' ? 'text-brand-400' : 'text-white/40'}`}>
                  <Mic className="h-3 w-3" /> Voice
                </div>
                <div className={`flex items-center gap-1.5 ${stage === 'rendering' ? 'text-brand-400' : 'text-white/40'}`}>
                  <Wand2 className="h-3 w-3" /> Render
                </div>
              </div>
            </div>
          ) : stage === 'error' ? (
            <div className="text-center text-white">
              <p className="text-lg font-medium mb-2">Analysis failed</p>
              <p className="text-sm text-white/60 mb-4">Try again or check your footage</p>
              <Button variant="secondary" onClick={startAnalysis}>Retry</Button>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-surface-800">
              <div className="text-center">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                <p className="text-white font-medium">Reel ready!</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardContent>
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

          {stage === 'final_ready' && (
            <div className="flex items-center justify-center gap-2 mt-4 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Final reel rendered successfully!</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/footage`)}>
          Back to Footage
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={startAnalysis} loading={stage === 'style_dna' || stage === 'processing' || stage === 'voice'}>
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
          <Button
            onClick={handleGenerateFinal}
            loading={stage === 'rendering'}
            size="lg"
            disabled={stage !== 'preview_ready'}
          >
            Generate Final Reel
          </Button>
          {stage === 'final_ready' && (
            <Button onClick={() => router.push(`/projects/${projectId}/output`)} size="lg">
              View Output
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Progress } from '@nexcut/ui/components/Progress'
import { Play, Pause, Maximize2, RefreshCw, CheckCircle2, Mic, Film, Music, Wand2, Sparkles } from 'lucide-react'
import { StyleDNAEditor } from '@/components/StyleDNAEditor'
import { cn } from '@/lib/utils'

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

const variants = [
  { id: 'fast',       label: 'Fast Cuts',     desc: 'Quick cuts, high energy',     pacing: { cut_duration: 0.6, zoom_frequency: 0.6, beat_sync: 1.0 } },
  { id: 'balanced',   label: 'Balanced',      desc: 'Standard pacing',            pacing: { cut_duration: 1.2, zoom_frequency: 0.4, beat_sync: 0.8 } },
  { id: 'cinematic',  label: 'Cinematic',     desc: 'Slow cuts, dramatic feel',   pacing: { cut_duration: 2.5, zoom_frequency: 0.2, beat_sync: 0.5 } },
]

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [stage, setStage] = useState<AnalysisStage>('style_dna')
  const [playing, setPlaying] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState('balanced')
  const [musicMood, setMusicMood] = useState('auto')
  const [styleDNA, setStyleDNA] = useState<any>(null)
  const [dnaLoading, setDnaLoading] = useState(false)

  useEffect(() => {
    startAnalysis()
  }, [])

  async function startAnalysis(overrideDNA?: any) {
    setStage('style_dna')
    await sleep(800)
    setStage('processing')
    await sleep(800)
    setStage('voice')
    await sleep(800)
    setStage('rendering')

    try {
      const body: any = {}
      if (overrideDNA) body.style_dna = overrideDNA
      if (selectedVariant) body.variant = selectedVariant
      if (musicMood && musicMood !== 'auto') body.music_mood = musicMood

      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      })
      if (!res.ok) throw new Error('Analysis failed')

      const dnaRes = await fetch(`/api/projects/${projectId}`)
      if (dnaRes.ok) {
        const { project } = await dnaRes.json()
        if (project?.styleDNA) setStyleDNA(project.styleDNA)
      }

      setStage('preview_ready')

      const renderRes = await fetch(`/api/projects/${projectId}/render`, { method: 'POST' })
      if (renderRes.ok) {
        setStage('final_ready')
      }
    } catch {
      setStage('error')
    }
  }

  async function handleDnaRegenerate(dna: any) {
    setDnaLoading(true)
    setStyleDNA(dna)
    await startAnalysis(dna)
    setDnaLoading(false)
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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Generating Your Reel</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          AI is analyzing your references and footage. Use the controls below to fine-tune the output.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card padding="none" className="overflow-hidden">
            <div className="aspect-[9/16] bg-surface-900 flex items-center justify-center relative max-h-[500px]">
              {stage === 'style_dna' || stage === 'processing' || stage === 'voice' || stage === 'rendering' ? (
                <div className="text-center text-white px-6">
                  <StageIcon className="h-10 w-10 mx-auto mb-4 text-brand-400 animate-pulse" />
                  <p className="text-base font-medium mb-2">{currentStage.label}</p>
                  <p className="text-sm text-white/60">This may take a few minutes</p>
                  <div className="w-64 mx-auto mt-6">
                    <Progress value={currentStage.progress} size="md" />
                  </div>
                  <div className="flex justify-center gap-4 mt-6 text-xs text-white/40">
                    {[
                      { id: 'style_dna', icon: Film, label: 'Style', stage },
                      { id: 'processing', icon: Music, label: 'Footage', stage },
                      { id: 'voice', icon: Mic, label: 'Voice', stage },
                      { id: 'rendering', icon: Wand2, label: 'Render', stage },
                    ].map((s) => {
                      const stages = ['style_dna', 'processing', 'voice', 'rendering']
                      const active = stages.indexOf(s.id) <= stages.indexOf(stage)
                      return (
                        <div key={s.id} className={cn('flex items-center gap-1', active ? 'text-brand-400' : 'text-white/40')}>
                          <s.icon className="h-3 w-3" /> {s.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : stage === 'error' ? (
                <div className="text-center text-white">
                  <p className="text-lg font-medium mb-2">Analysis failed</p>
                  <p className="text-sm text-white/60 mb-4">Try again or check your footage</p>
                  <Button variant="secondary" onClick={() => startAnalysis()}>Retry</Button>
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
        </div>

        <div className="space-y-4">
          <Card padding="sm">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" /> Pacing
            </h3>
            <div className="space-y-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v.id)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-lg border transition-colors',
                    selectedVariant === v.id
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 dark:border-brand-400'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                  )}
                >
                  <p className="font-medium text-sm text-surface-900 dark:text-surface-100">{v.label}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{v.desc}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card padding="sm">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center gap-1.5">
              <Music className="h-3.5 w-3.5 text-brand-600" /> Music Mood
            </h3>
            <select
              value={musicMood}
              onChange={(e) => setMusicMood(e.target.value)}
              className="w-full text-sm bg-surface-100 dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-2 text-surface-900 dark:text-surface-100"
            >
              <option value="auto">Auto-detect from references</option>
              <option value="high_energy">High Energy (EDM, Pop)</option>
              <option value="motivational">Motivational (Hip Hop, Rock)</option>
              <option value="chill">Chill / Lo-fi</option>
              <option value="cinematic">Cinematic / Orchestral</option>
              <option value="viral">Viral / Trending sounds</option>
            </select>
          </Card>

          <StyleDNAEditor
            key={styleDNA ? 'loaded' : 'default'}
            initialDNA={styleDNA}
            onRegenerate={handleDnaRegenerate}
            loading={dnaLoading}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/footage`)}>
          Back to Footage
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => startAnalysis()} loading={stage === 'style_dna' || stage === 'processing' || stage === 'voice'}>
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
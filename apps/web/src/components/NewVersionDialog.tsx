'use client'

import { useState } from 'react'
import { Button } from '@nexcut/ui/components/Button'
import { Sparkles, X, Music, Zap, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onGenerate: (settings: { variant: string; music_mood: string; targetDuration: number }) => void
}

const variants = [
  { id: 'fast', label: 'Fast Cuts', desc: 'Quick cuts, high energy, fast paced', icon: Zap },
  { id: 'balanced', label: 'Balanced', desc: 'Standard pacing for general audiences', icon: Zap },
  { id: 'cinematic', label: 'Cinematic', desc: 'Slow cuts, dramatic transitions', icon: Zap },
]

const moods = [
  { id: 'auto', label: 'Auto', desc: 'Match reference reels' },
  { id: 'high_energy', label: 'High Energy', desc: 'EDM, Pop, upbeat' },
  { id: 'motivational', label: 'Motivational', desc: 'Hip Hop, Rock, driving' },
  { id: 'chill', label: 'Chill / Lo-fi', desc: 'Relaxed, mellow vibes' },
  { id: 'cinematic', label: 'Cinematic', desc: 'Orchestral, dramatic' },
  { id: 'viral', label: 'Viral', desc: 'Trending sounds, hooks' },
]

export function NewVersionDialog({ open, onClose, onGenerate }: Props) {
  const [variant, setVariant] = useState('balanced')
  const [musicMood, setMusicMood] = useState('auto')
  const [duration, setDuration] = useState(30)
  const [generating, setGenerating] = useState(false)

  if (!open) return null

  async function handleGenerate() {
    setGenerating(true)
    await onGenerate({ variant, music_mood: musicMood, targetDuration: duration })
    setGenerating(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-surface-900 rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-100">New Version</h2>
              <p className="text-sm text-surface-500">Configure settings for a new reel version.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg">
            <X className="h-5 w-5 text-surface-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-brand-600" /> Pacing
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {variants.map((v) => {
                const Icon = v.icon
                return (
                  <button
                    key={v.id}
                    onClick={() => setVariant(v.id)}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      variant === v.id
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 dark:border-brand-400'
                        : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 mb-1', variant === v.id ? 'text-brand-600' : 'text-surface-400')} />
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{v.label}</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">{v.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center gap-1.5">
              <Music className="h-4 w-4 text-brand-600" /> Music Mood
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {moods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMusicMood(m.id)}
                  className={cn(
                    'p-2.5 rounded-lg border text-left transition-all',
                    musicMood === m.id
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 dark:border-brand-400'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                  )}
                >
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{m.label}</p>
                  <p className="text-[10px] text-surface-500 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-600" /> Target Duration
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="flex-1 accent-brand-600"
              />
              <span className="text-sm font-mono text-surface-900 dark:text-surface-100 w-12 text-right">{duration}s</span>
            </div>
            <div className="flex justify-between text-xs text-surface-400 mt-1">
              <span>15s</span>
              <span>120s</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-surface-200 dark:border-surface-700">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} loading={generating} size="lg">
            <Sparkles className="h-4 w-4" />
            Generate Version {generating ? '...' : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Button } from '@nexcut/ui/components/Button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StyleDNAEditorProps {
  initialDNA: any
  onRegenerate: (dna: any) => void
  loading?: boolean
}

const defaultDNA = {
  editing: { avg_cut_duration: 1.2, cut_distribution: 'exponential', transition_style: 'zoom_flash', zoom_frequency: 0.4, zoom_intensity: 1.2, beat_sync: true, beat_sync_strength: 0.8 },
  visual: { contrast: 1.1, saturation: 0.9, grain: 0.05 },
  text: { position: 'center', animation: 'kinetic_typewriter', hooks: { font_size: 80 } },
  audio: { music_energy: 'high', target_bpm: 140, ducking: { ratio: 0.15 } },
  story: { structure: ['hook', 'build', 'climax', 'cta'], pacing_curve: 'accelerating' },
}

export function StyleDNAEditor({ initialDNA, onRegenerate, loading }: StyleDNAEditorProps) {
  const [dna, setDNA] = useState<any>(initialDNA || defaultDNA)
  const [expanded, setExpanded] = useState(false)

  function update(path: string[], value: any) {
    setDNA((prev: any) => {
      const next = { ...prev }
      let obj = next
      for (let i = 0; i < path.length - 1; i++) {
        if (!obj[path[i]]) obj[path[i]] = {}
        obj = obj[path[i]]
      }
      obj[path[path.length - 1]] = value
      return next
    })
  }

  function get(path: string[]): any {
    let obj = dna
    for (const key of path) {
      if (!obj) return undefined
      obj = obj[key]
    }
    return obj
  }

  const transitionStyles = ['zoom_flash', 'glitch', 'whip', 'crossfade', 'hard_cut']
  const energyLevels = ['low', 'medium', 'high', 'very_high']
  const pacingCurves = ['accelerating', 'wave', 'steady', 'decelerating']
  const textPositions = ['center', 'top', 'bottom', 'lower_third']
  const captionAnimations = ['kinetic_typewriter', 'pop_in', 'slide_up', 'fade_in', 'scale_in']

  function Slider({ label, path, min, max, step = 0.1 }: { label: string; path: string[]; min: number; max: number; step?: number }) {
    const val = get(path) ?? min
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-surface-500">{label}</span>
          <span className="text-surface-900 dark:text-surface-100 font-mono">{typeof val === 'number' ? val.toFixed(2) : val}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={val}
          onChange={(e) => update(path, parseFloat(e.target.value))}
          className="w-full h-1.5 appearance-none bg-surface-200 dark:bg-surface-700 rounded-full cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600
            [&::-webkit-slider-thumb]:shadow-sm"
        />
      </div>
    )
  }

  function Selector({ label, path, options }: { label: string; path: string[]; options: string[] }) {
    return (
      <div className="space-y-1">
        <span className="text-xs text-surface-500">{label}</span>
        <div className="flex flex-wrap gap-1">
          {options.map((opt) => {
            const active = get(path) === opt
            return (
              <button
                key={opt}
                onClick={() => update(path, opt)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-full border transition-colors',
                  active
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 dark:border-brand-400'
                    : 'border-surface-300 text-surface-600 hover:border-surface-400 dark:border-surface-600 dark:text-surface-400'
                )}
              >
                {opt.replace(/_/g, ' ')}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
      >
        <span className="font-semibold text-sm text-surface-900 dark:text-surface-100">Style DNA</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-surface-500">Adjust editing style</span>
          <svg className={cn('h-4 w-4 text-surface-500 transition-transform', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-4 space-y-5 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Editing</h4>
            <Slider label="Cut Duration (s)" path={['editing', 'avg_cut_duration']} min={0.3} max={4} step={0.1} />
            <Selector label="Transition Style" path={['editing', 'transition_style']} options={transitionStyles} />
            <Slider label="Zoom Frequency" path={['editing', 'zoom_frequency']} min={0} max={1} />
            <Slider label="Zoom Intensity" path={['editing', 'zoom_intensity']} min={1} max={2} step={0.05} />
            <Slider label="Beat Sync Strength" path={['editing', 'beat_sync_strength']} min={0} max={1} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Visual</h4>
            <Slider label="Contrast" path={['visual', 'contrast']} min={0.5} max={2} />
            <Slider label="Saturation" path={['visual', 'saturation']} min={0} max={2} />
            <Slider label="Film Grain" path={['visual', 'grain']} min={0} max={0.3} step={0.01} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Captions</h4>
            <Selector label="Position" path={['text', 'position']} options={textPositions} />
            <Selector label="Animation" path={['text', 'animation']} options={captionAnimations} />
            <Slider label="Font Size" path={['text', 'hooks', 'font_size']} min={40} max={160} step={5} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Audio</h4>
            <Selector label="Music Energy" path={['audio', 'music_energy']} options={energyLevels} />
            <Slider label="Target BPM" path={['audio', 'target_bpm']} min={60} max={200} step={5} />
            <Slider label="Voice Ducking" path={['audio', 'ducking', 'ratio']} min={0} max={1} />
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Story</h4>
            <Selector label="Pacing Curve" path={['story', 'pacing_curve']} options={pacingCurves} />
          </div>

          <Button
            fullWidth
            size="sm"
            onClick={() => onRegenerate(dna)}
            loading={loading}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Apply Changes & Regenerate
          </Button>
        </div>
      )}
    </div>
  )
}
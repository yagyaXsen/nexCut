'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardContent } from '@nexcut/ui/components/Card'
import { Mic, Play, Pause, Plus, Trash2 } from 'lucide-react'

interface VoiceSegment {
  id: string
  assetId: string
  assetName: string
  start: number
  end: number
  transcript: string
  label: string
}

export default function VoiceMomentsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [segments, setSegments] = useState<VoiceSegment[]>([
    { id: '1', assetId: 'a1', assetName: 'intro.MOV', start: 0.5, end: 4.2, transcript: 'Today we are going for a personal record on bench press', label: 'hook' },
    { id: '2', assetId: 'a2', assetName: 'workout.MOV', start: 12.1, end: 18.5, transcript: 'The key is to maintain proper form throughout the entire movement', label: 'story' },
  ])
  const [playing, setPlaying] = useState<string | null>(null)

  function addSegment() {
    const newSegment: VoiceSegment = {
      id: Math.random().toString(36).substring(2, 9),
      assetId: '',
      assetName: 'Select asset',
      start: 0,
      end: 5,
      transcript: '',
      label: 'story',
    }
    setSegments([...segments, newSegment])
  }

  function removeSegment(id: string) {
    setSegments(segments.filter(s => s.id !== id))
  }

  async function handleAnalyze() {
    await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' })
    router.push(`/projects/${projectId}/preview`)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Voice Moments</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          Select which parts of your original audio/voice to preserve in the final reel.
          The AI will blend your voice with the music automatically.
        </p>
      </div>

      <Card>
        <CardContent>
          {segments.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 text-surface-400 mx-auto mb-3" />
              <p className="text-surface-500">No voice segments selected yet.</p>
              <p className="text-sm text-surface-400 mt-1">Click below to add one, or skip to let AI auto-detect speech.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {segments.map((segment) => (
                <div key={segment.id} className="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mic className="h-5 w-5 text-brand-600" />
                      <span className="font-medium text-surface-900 dark:text-surface-100 text-sm">{segment.assetName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={segment.label}
                        onChange={(e) => {
                          const updated = segments.map(s =>
                            s.id === segment.id ? { ...s, label: e.target.value } : s
                          )
                          setSegments(updated)
                        }}
                        className="text-xs bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-600 rounded px-2 py-1"
                      >
                        <option value="hook">Hook</option>
                        <option value="story">Story</option>
                        <option value="climax">Climax</option>
                        <option value="cta">CTA</option>
                        <option value="filler">Filler</option>
                      </select>
                      <button onClick={() => removeSegment(segment.id)} className="text-surface-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-surface-900 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setPlaying(playing === segment.id ? null : segment.id)}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        {playing === segment.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <span className="text-xs text-surface-500">
                        {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s ({(segment.end - segment.start).toFixed(1)}s)
                      </span>
                    </div>
                    <div className="h-8 bg-surface-200 dark:bg-surface-700 rounded-full relative overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 bg-brand-500/30 rounded-full"
                        style={{
                          left: `${(segment.start / 60) * 100}%`,
                          width: `${((segment.end - segment.start) / 60) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-surface-600 dark:text-surface-400 italic">
                    &ldquo;{segment.transcript}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={addSegment}>
              <Plus className="h-4 w-4" /> Add Voice Segment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-2">Auto-Detect Speech Regions</h3>
          <p className="text-sm text-surface-500 mb-3">
            Let AI automatically find all speech segments in your footage and suggest the best moments to preserve.
          </p>
          <Button variant="secondary" size="sm">
            Auto-Detect
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/footage`)}>
          Back to Footage
        </Button>
        <Button onClick={handleAnalyze} size="lg">
          Analyze & Generate Preview
        </Button>
      </div>
    </div>
  )
}
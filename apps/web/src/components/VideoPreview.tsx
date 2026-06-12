'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Play, Pause, Maximize2, Volume2, VolumeX, Trash2 } from 'lucide-react'
import { Progress } from '@nexcut/ui/components/Progress'

interface VideoPreviewProps {
  src?: string
  fileName?: string
  duration?: number
  onRemove?: () => void
  showControls?: boolean
  aspectRatio?: '9:16' | '16:9' | '1:1'
}

export function VideoPreview({
  src,
  fileName,
  duration: propDuration,
  onRemove,
  showControls = true,
  aspectRatio = '9:16',
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(propDuration || 0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)

  useEffect(() => {
    if (!propDuration && videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', () => {
        setDuration(videoRef.current?.duration || 0)
      })
    }
  }, [propDuration])

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }, [])

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
    setCurrentTime(time)
  }, [])

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
    setIsMuted(!isMuted)
  }, [isMuted])

  const toggleFullscreen = useCallback(() => {
    if (!canvasRef.current) return
    if (!document.fullscreenElement) {
      canvasRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const tryWebCodecs = useCallback(async () => {
    if (!src || !('VideoDecoder' in window)) return

    setIsDecoding(true)
    try {
      const response = await fetch(src)
      const buffer = await response.arrayBuffer()
      const config = {
        codec: 'avc1.42001E',
        codedWidth: 1080,
        codedHeight: 1920,
      }

      const decoder = new VideoDecoder({
        output: (frame) => {
          const canvas = canvasRef.current
          if (!canvas) return
          canvas.width = frame.codedWidth
          canvas.height = frame.codedHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(frame, 0, 0)
          }
          frame.close()
        },
        error: (e) => {
          console.warn('WebCodecs error, falling back to <video> tag:', e)
          setIsDecoding(false)
        },
      })

      decoder.configure(config)
      const chunk = new EncodedVideoChunk({
        type: 'key',
        timestamp: 0,
        duration: 1000000,
        data: buffer,
      })
      decoder.decode(chunk)
      await decoder.flush()
    } catch (e) {
      console.warn('WebCodecs not available, using fallback:', e)
    }
    setIsDecoding(false)
  }, [src])

  useEffect(() => {
    if (src) {
      tryWebCodecs()
    }
  }, [src, tryWebCodecs])

  const aspectClass = {
    '9:16': 'aspect-[9/16]',
    '16:9': 'aspect-video',
    '1:1': 'aspect-square',
  }[aspectRatio]

  function formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={`relative ${aspectClass} bg-surface-900 rounded-lg overflow-hidden group`} ref={canvasRef}>
      {src ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration)
          }}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white/60">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Play className="h-8 w-8 ml-1" />
            </div>
            <p className="text-sm">No video loaded</p>
          </div>
        </div>
      )}

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/70"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}

      {showControls && src && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <Progress
            value={duration > 0 ? (currentTime / duration) * 100 : 0}
            max={100}
            size="sm"
            className="mb-3"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-white hover:text-white/80">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button onClick={toggleMute} className="text-white/70 hover:text-white">
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <span className="text-xs text-white/70 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white">
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute top-2 left-2 right-2 h-1 appearance-none bg-transparent cursor-pointer
              [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-runnable-track]:bg-white/20
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:-mt-1"
          />
        </div>
      )}

      {isDecoding && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      )}
    </div>
  )
}
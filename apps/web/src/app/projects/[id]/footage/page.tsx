'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card } from '@nexcut/ui/components/Card'
import { Progress } from '@nexcut/ui/components/Progress'
import { Upload, Film, X, CheckCircle2, AlertCircle } from 'lucide-react'

interface UploadingFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
}

export default function FootagePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('video/'))
    setFiles(prev => [...prev, ...droppedFiles.map(f => ({ file: f, progress: 0, status: 'pending' as const }))])
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).filter(f => f.type.startsWith('video/'))
      setFiles(prev => [...prev, ...selected.map(f => ({ file: f, progress: 0, status: 'pending' as const }))])
    }
  }

  async function uploadFile(fileEntry: UploadingFile, index: number) {
    const { file } = fileEntry
    setFiles(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], status: 'uploading' }
      return updated
    })

    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: 'footage',
        }),
      })

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, publicUrl } = await presignedRes.json()

      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setFiles(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], progress: pct }
            return updated
          })
        }
      }

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => resolve()
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      await fetch(`/api/projects/${projectId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: publicUrl,
          type: 'VIDEO',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })

      setFiles(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'done', progress: 100, url: publicUrl }
        return updated
      })
    } catch {
      setFiles(prev => {
        const updated = [...prev]
        updated[index] = { ...updated[index], status: 'error' }
        return updated
      })
    }
  }

  async function handleUploadAll() {
    setIsUploading(true)
    const pending = files.filter(f => f.status === 'pending')
    await Promise.all(pending.map((f, i) => uploadFile(f, files.indexOf(f))))
    setIsUploading(false)
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index))
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done')

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Upload Footage</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          Upload your raw video files. We'll analyze, transcribe, and intelligently select the best clips.
        </p>
      </div>

      <Card>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-12 text-center hover:border-brand-500 transition-colors cursor-pointer"
        >
          <Upload className="h-12 w-12 text-surface-400 mx-auto mb-4" />
          <p className="text-surface-700 dark:text-surface-300 font-medium mb-1">
            Drag & drop video files here
          </p>
          <p className="text-sm text-surface-500 mb-4">or click to browse (MP4, MOV, HEVC, ProRes)</p>
          <input
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            id="footage-upload"
          />
          <label htmlFor="footage-upload">
            <Button variant="outline" as-child>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
      </Card>

      {files.length > 0 && (
        <Card>
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 mb-4">
            {files.length} file{files.length > 1 ? 's' : ''} selected
          </h3>
          <div className="space-y-2">
            {files.map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Film className="h-5 w-5 text-brand-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-surface-500">
                      {(entry.file.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  <div className="w-24">
                    {entry.status === 'uploading' && <Progress value={entry.progress} size="sm" />}
                    {entry.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    {entry.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  </div>
                </div>
                <button onClick={() => removeFile(i)} className="text-surface-400 hover:text-red-500 ml-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setFiles([])}>Clear All</Button>
            <Button onClick={handleUploadAll} loading={isUploading} disabled={isUploading || files.every(f => f.status !== 'pending')}>
              {isUploading ? 'Uploading...' : 'Upload All'}
            </Button>
          </div>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectId}/references`)}>
          Back to References
        </Button>
        <Button onClick={() => router.push(`/projects/${projectId}/preview`)} disabled={!allDone} size="lg">
          Generate Reel
        </Button>
      </div>
    </div>
  )
}
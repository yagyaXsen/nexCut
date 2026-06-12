'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@nexcut/ui/components/Button'
import { Card } from '@nexcut/ui/components/Card'
import { Progress } from '@nexcut/ui/components/Progress'
import { Input } from '@nexcut/ui/components/Input'
import { Plus, X, Link, Upload, Film } from 'lucide-react'

export default function ReferencesPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [urls, setUrls] = useState<string[]>(['', '', '', ''])
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  function addUrl() {
    setUrls([...urls, ''])
  }

  function removeUrl(index: number) {
    setUrls(urls.filter((_, i) => i !== index))
  }

  function updateUrl(index: number, value: string) {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles([...files, ...Array.from(e.target.files)])
    }
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index))
  }

  async function handleContinue() {
    setUploading(true)
    const validUrls = urls.filter(u => u.trim())

    try {
      await fetch(`/api/projects/${projectId}/references`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      })
      router.push(`/projects/${projectId}/footage`)
    } catch (error) {
      console.error('Failed to save references:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Reference Reels</h2>
        <p className="mt-1 text-surface-500 dark:text-surface-400">
          Add 4-6 reference reels that match the style you want. We'll extract the editing DNA automatically.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Link className="h-4 w-4 text-brand-600" />
            URL Links
          </h3>
          <p className="text-sm text-surface-500">Paste TikTok, Instagram Reel, or YouTube Shorts URLs</p>

          <div className="space-y-3">
            {urls.map((url, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => updateUrl(i, e.target.value)}
                  placeholder={`Reference reel URL ${i + 1}`}
                  fullWidth
                />
                {urls.length > 4 && (
                  <button
                    onClick={() => removeUrl(i)}
                    className="p-2 text-surface-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={addUrl}>
            <Plus className="h-4 w-4" /> Add another URL
          </Button>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <h3 className="font-semibold text-surface-900 dark:text-surface-100 flex items-center gap-2">
            <Upload className="h-4 w-4 text-brand-600" />
            Direct Upload
          </h3>
          <p className="text-sm text-surface-500">Or upload reference videos directly (max 100MB each)</p>

          <div className="border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-lg p-8 text-center">
            <Film className="h-10 w-10 text-surface-400 mx-auto mb-3" />
            <p className="text-sm text-surface-500 mb-2">Drag & drop files or click to browse</p>
            <input
              type="file"
              multiple
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="reference-upload"
            />
            <label htmlFor="reference-upload">
              <Button variant="outline" size="sm" as-child>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-surface-100 dark:bg-surface-800 rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    <Film className="h-5 w-5 text-brand-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-surface-500">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeFile(i)} className="text-surface-400 hover:text-red-500 ml-2">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {uploading && (
        <Card>
          <div className="space-y-3">
            <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Uploading references...</p>
            <Progress value={progress} size="md" />
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push('/')}>
          Cancel
        </Button>
        <Button onClick={handleContinue} loading={uploading} size="lg">
          Continue to Footage
        </Button>
      </div>
    </div>
  )
}
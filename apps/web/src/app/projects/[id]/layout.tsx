'use client'

import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, Video, Music, Mic, Eye, Download } from 'lucide-react'

const steps = [
  { id: 'references', label: 'References', icon: Video, href: '/references' },
  { id: 'footage', label: 'Footage', icon: Music, href: '/footage' },
  { id: 'voice-moments', label: 'Voice Moments', icon: Mic, href: '/voice-moments' },
  { id: 'preview', label: 'Preview', icon: Eye, href: '/preview' },
  { id: 'output', label: 'Output', icon: Download, href: '/output' },
]

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.id as string

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-lg font-bold text-brand-600 hover:opacity-80">NexCut</Link>
          <span className="text-surface-400">/</span>
          <span className="text-surface-700 dark:text-surface-300 font-medium">Project</span>
        </div>

        <div className="flex justify-between items-center mb-8">
          <nav className="flex items-center gap-2 sm:gap-4">
            {steps.map((step) => {
              const stepHref = `/projects/${projectId}${step.href}`
              const isActive = pathname === stepHref
              const Icon = step.icon

              return (
                <Link
                  key={step.id}
                  href={stepHref}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300'
                      : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{step.label}</span>
                </Link>
              )
            })}
          </nav>

          <Link
            href="/"
            className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          >
            Dashboard
          </Link>
        </div>

        {children}
      </div>
    </div>
  )
}
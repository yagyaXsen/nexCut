'use client'

import { useState, useEffect } from 'react'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@nexcut/ui/components/Card'
import Link from 'next/link'
import { Plus, FolderOpen, Video, Settings, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { DashboardSkeleton } from './DashboardSkeleton'

interface Project {
  id: string
  name: string
  mode: string
  status: string
  updatedAt: string
  _count: { assets: number; referenceReels: number; outputReels: number }
}

export function Dashboard() {
  const { user, isLoaded, organization } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
        }
      } catch {
        // API might not be available
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  if (!isLoaded || loading) {
    return <DashboardSkeleton />
  }

  const modeIcon = (mode: string) => {
    return mode === 'BUSINESS' ? Settings : Video
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <header className="border-b border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold text-brand-600">NexCut</Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/projects" className="text-sm font-medium text-surface-700 dark:text-surface-300 hover:text-brand-600">
                  Projects
                </Link>
                <Link href="/library" className="text-sm font-medium text-surface-700 dark:text-surface-300 hover:text-brand-600">
                  Library
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {organization && (
                <span className="text-sm text-surface-500 dark:text-surface-400">{organization.name}</span>
              )}
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt={user.fullName || ''} className="w-8 h-8 rounded-full" />
                ) : (
                  <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                    {user?.firstName?.[0] || 'U'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Projects</h1>
            <p className="mt-1 text-surface-500 dark:text-surface-400">Create and manage your video projects</p>
          </div>
          <Link href="/projects/new">
            <Button size="lg">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Link href="/projects/new" className="block">
            <Card variant="outlined" className="border-2 border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-500 transition-colors h-full">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center mb-4">
                  <Plus className="h-8 w-8 text-brand-600 dark:text-brand-400" />
                </div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Create Project</h3>
                <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">Start a new video project</p>
              </CardContent>
            </Card>
          </Link>

          <Card variant="default" className="sm:col-span-2 lg:col-span-2 xl:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Projects
                <span className="text-sm font-normal text-surface-500">{projects.length} total</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-8 text-surface-500">
                  <FolderOpen className="h-10 w-10 mx-auto mb-3" />
                  <p className="font-medium">No projects yet</p>
                  <p className="text-sm mt-1">Create your first project to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => {
                    const Icon = modeIcon(project.mode)
                    const statusColor = project.status === 'COMPLETED' ? 'text-green-500' :
                      project.status === 'DRAFT' ? 'text-surface-400' :
                      project.status === 'FAILED' ? 'text-red-500' : 'text-brand-500'
                    return (
                      <Link key={project.id} href={`/projects/${project.id}/references`} className="block">
                        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                            <Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{project.name}</p>
                            <p className="text-sm text-surface-500 dark:text-surface-400">
                              {project._count.assets} assets · {project._count.referenceReels} references ·{' '}
                              <span className={statusColor}>{project.status}</span>
                            </p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-surface-400" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
'use client'

import { useUser, useOrganization } from '@clerk/nextjs'
import { Button } from '@nexcut/ui/components/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@nexcut/ui/components/Card'
import Link from 'next/link'
import { Plus, FolderOpen, Video, Settings, ChevronRight } from 'lucide-react'

export function Dashboard() {
  const { user, isLoaded } = useUser()
  const { organization } = useOrganization()

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
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

          <Card variant="default" className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Projects
                <span className="text-sm font-normal text-surface-500">3 this week</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {['Gym Progress Reel', 'Product Launch', 'Travel Montage'].map((project, i) => (
                <Link key={i} href={`/projects/proj-${i+1}`} className="block">
                  <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                      <Video className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{project}</p>
                      <p className="text-sm text-surface-500 dark:text-surface-400">Updated 2 hours ago</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-surface-400" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
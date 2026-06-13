'use client'

import { ReactNode } from 'react'
import { Providers } from '@/app/providers'

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>
}
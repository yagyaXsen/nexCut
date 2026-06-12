'use client'

import { ClerkProvider } from '@clerk/nextjs'
import { ReactNode } from 'react'
import { DevAuthProvider, ClerkAdapter, isClerkConfigured } from '@/lib/auth-context'

export function Providers({ children }: { children: ReactNode }) {
  if (!isClerkConfigured()) {
    return <DevAuthProvider>{children}</DevAuthProvider>
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ClerkAdapter>
        {children}
      </ClerkAdapter>
    </ClerkProvider>
  )
}
'use client'

import { createContext, useContext, ReactNode, useEffect, useState } from 'react'

interface AuthUser {
  id: string
  firstName: string
  imageUrl: string | null
  fullName: string | null
}

interface AuthContextValue {
  user: AuthUser | null
  isLoaded: boolean
  organization: { name: string } | null
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoaded: false,
  organization: null,
})

const DEV_USER: AuthUser = {
  id: 'dev-user-id',
  firstName: 'Dev',
  imageUrl: null,
  fullName: 'Dev User',
}

export function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return !!key && key.startsWith('pk_') && !key.includes('placeholder')
}

export function DevAuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: DEV_USER, isLoaded: true, organization: null }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ClerkAdapter({ children }: { children: ReactNode }) {
  // Lazy require to avoid module-level Clerk key validation
  const { useUser, useOrganization } = require('@clerk/nextjs')
  const { user: clerkUser, isLoaded } = useUser()
  const { organization: clerkOrg } = useOrganization()

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        firstName: clerkUser.firstName || 'User',
        imageUrl: clerkUser.imageUrl || null,
        fullName: clerkUser.fullName || null,
      }
    : null

  const organization: { name: string } | null = clerkOrg
    ? { name: clerkOrg.name }
    : null

  return (
    <AuthContext.Provider value={{ user, isLoaded, organization }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
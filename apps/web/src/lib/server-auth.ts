import { auth } from '@clerk/nextjs/server'

const CLERK_CONFIGURED = (() => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  return !!key && key.startsWith('pk_') && !key.includes('placeholder')
})()

export function getServerUserId(): string | null {
  if (!CLERK_CONFIGURED) {
    return 'dev-user-id'
  }

  try {
    const { userId } = auth()
    return userId
  } catch {
    return null
  }
}

export function isAuthConfigured(): boolean {
  return CLERK_CONFIGURED
}
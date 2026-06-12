import { authMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isDevMode = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes('placeholder')

const clerkMiddleware = authMiddleware({
  publicRoutes: ['/', '/sign-in', '/sign-up'],
})

export default function middleware(request: NextRequest) {
  if (isDevMode) {
    return NextResponse.next()
  }
  return clerkMiddleware(request)
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
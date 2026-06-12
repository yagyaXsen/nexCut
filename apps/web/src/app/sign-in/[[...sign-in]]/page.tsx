'use client'

import { SignIn } from '@clerk/nextjs'
import { isClerkConfigured } from '@/lib/auth-context'
import Link from 'next/link'

export default function SignInPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Clerk Auth Not Configured</h1>
          <p className="mt-2 text-surface-500">
            Set <code className="px-2 py-0.5 rounded bg-surface-200 text-sm">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your .env.local file.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-brand-600 hover:text-brand-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-100">Welcome back</h1>
          <p className="mt-2 text-surface-500 dark:text-surface-400">Sign in to continue to NexCut</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: 'bg-brand-600 hover:bg-brand-700 text-white',
              card: 'shadow-lg border-surface-200 dark:border-surface-700',
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
        />
      </div>
    </div>
  )
}
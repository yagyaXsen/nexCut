import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
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
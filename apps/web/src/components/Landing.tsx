import Link from 'next/link'
import { Film, Sparkles, Zap, Upload, ArrowRight } from 'lucide-react'

export function Landing() {
  return (
    <div className="min-h-screen bg-surface-950">
      <header className="border-b border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-brand-500">NexCut</div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm text-surface-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-950 text-brand-300 text-sm mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered video editing
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold text-white max-w-3xl mx-auto leading-tight">
            Upload footage.
            <br />
            <span className="text-brand-400">Get a perfect reel.</span>
          </h1>
          <p className="mt-6 text-lg text-surface-400 max-w-xl mx-auto">
            Upload your raw footage and 3-5 reference reels. NexCut extracts the editing style
            and creates a professionally styled reel automatically.
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 text-white rounded-xl text-lg font-medium hover:bg-brand-700 transition-colors"
            >
              Start Creating
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 text-left max-w-4xl mx-auto">
            <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
              <Upload className="h-8 w-8 text-brand-500 mb-4" />
              <h3 className="text-white font-semibold mb-2">Upload Footage</h3>
              <p className="text-sm text-surface-400">Drag & drop your raw videos. We accept MP4, MOV, HEVC, and more.</p>
            </div>
            <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
              <Film className="h-8 w-8 text-brand-500 mb-4" />
              <h3 className="text-white font-semibold mb-2">Add References</h3>
              <p className="text-sm text-surface-400">Paste TikTok, Instagram, or YouTube Shorts URLs. We&apos;ll analyze the style.</p>
            </div>
            <div className="p-6 rounded-xl bg-surface-900 border border-surface-800">
              <Zap className="h-8 w-8 text-brand-500 mb-4" />
              <h3 className="text-white font-semibold mb-2">Generate</h3>
              <p className="text-sm text-surface-400">One click. AI extracts the DNA and renders a styled reel in minutes.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
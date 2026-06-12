# NexCut - AI Video Editor

Upload your footage and 3-5 reference reels. Get a professionally styled reel in the same style automatically.

## Architecture

- **Web**: Next.js 14 (App Router), Clerk auth, Tailwind CSS, Prisma + Neon
- **Workers**: Modal (Python: OpenAI, OpenCV, Librosa, Whisper, FFmpeg)
- **Storage**: Cloudflare R2 (S3-compatible)

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example apps/web/.env.local
# Edit .env.local with your keys

# Run database migrations
pnpm db:push

# Start development
pnpm dev
```

## Project Structure

```
apps/
  web/          - Next.js frontend
  workers/      - Modal cloud functions
    style-dna/  - Extract editing style from references
    asset-intel/ - Process footage, generate EDL
    render/     - FFmpeg-based video rendering
packages/
  db/           - Prisma schema + client
  ui/           - Shared React components
  core/         - TypeScript types
  ffmpeg-dsl/   - FFmpeg filtergraph builder
```

## Environment

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o) |
| `MODAL_TOKEN_ID` | Modal API token ID |
| `MODAL_TOKEN_SECRET` | Modal API token secret |

## Development

```bash
pnpm dev          # Start all apps
pnpm lint         # Lint all packages
pnpm typecheck    # TypeScript check
pnpm test         # Run tests
pnpm db:studio    # Open Prisma Studio
```

## Deploy

```bash
# Web (Vercel)
vercel deploy

# Workers (Modal)
modal deploy apps/workers/main.py
```
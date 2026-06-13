import { NextRequest, NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/server-auth'
import { prisma } from '@nexcut/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getServerUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Parse optional overrides from frontend
    let body: any = {}
    try { body = await request.json() } catch {}
    const overrideDNA = body.style_dna
    const variant = body.variant || 'balanced'
    const musicMood = body.music_mood || 'auto'

    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'PROCESSING' },
    })

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        referenceReels: true,
        assets: true,
        voiceSegments: true,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Step 1: Extract Style DNA from reference reels (only if no override provided)
    let styleDNA = overrideDNA
    if (!styleDNA) {
      const referenceUrls = project.referenceReels.map(r => r.url).filter(Boolean) as string[]
      if (referenceUrls.length > 0) {
        try {
          const modalResponse = await fetch(
            `https://api.modal.com/nexcut-style-dna/extract_style_dna`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.MODAL_TOKEN_ID}:${process.env.MODAL_TOKEN_SECRET}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                project_id: params.id,
                reference_urls: referenceUrls,
                r2_config: {
                  bucket: process.env.R2_BUCKET_NAME,
                  account_id: process.env.R2_ACCOUNT_ID,
                },
              }),
            }
          )
          if (modalResponse.ok) {
            const dnaResult = await modalResponse.json()
            styleDNA = dnaResult.style_dna
          }
        } catch (workerError) {
          console.error('Style DNA worker call failed:', workerError)
        }
      }
    }

    // Save Style DNA to project
    if (styleDNA) {
      await prisma.project.update({
        where: { id: params.id },
        data: { styleDNA: JSON.stringify(styleDNA) },
      })
    }

    // Step 2: Auto-detect voice segments from footage
    const assetsWithAudio = project.assets.filter(a => a.words || a.transcript)
    for (const asset of assetsWithAudio) {
      const words = (asset.words as Array<{ word: string; start: number; end: number; confidence: number }>) || []
      if (words.length === 0) continue

      // Group consecutive words into voice segments
      let currentSegment: { start: number; end: number; words: string[] } | null = null
      const gapThreshold = 1.5 // 1.5s gap = new segment

      for (const word of words) {
        if (!currentSegment) {
          currentSegment = { start: word.start, end: word.end, words: [word.word] }
        } else if (word.start - currentSegment.end <= gapThreshold) {
          currentSegment.end = word.end
          currentSegment.words.push(word.word)
        } else {
          // Save current segment, start new one
          if (currentSegment.words.length >= 3) {
            await prisma.voiceSegment.create({
              data: {
                projectId: params.id,
                assetId: asset.id,
                start: currentSegment.start,
                end: currentSegment.end,
                transcript: currentSegment.words.join(' '),
                confidence: 0.8,
                isPreserved: true,
              },
            })
          }
          currentSegment = { start: word.start, end: word.end, words: [word.word] }
        }
      }
      // Save last segment
      if (currentSegment && currentSegment.words.length >= 3) {
        await prisma.voiceSegment.create({
          data: {
            projectId: params.id,
            assetId: asset.id,
            start: currentSegment.start,
            end: currentSegment.end,
            transcript: currentSegment.words.join(' '),
            confidence: 0.8,
            isPreserved: true,
          },
        })
      }
    }

    // If no Whisper words available, create segments from duration
    if (project.voiceSegments.length === 0) {
      for (const asset of project.assets) {
        if (asset.type === 'VIDEO' && asset.duration && asset.duration > 3) {
          const midPoint = asset.duration / 2
          await prisma.voiceSegment.create({
            data: {
              projectId: params.id,
              assetId: asset.id,
              start: Math.max(0, midPoint - 3),
              end: Math.min(asset.duration, midPoint + 3),
              transcript: '',
              confidence: 0.5,
              isPreserved: true,
            },
          })
        }
      }
    }

    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
    })

    return NextResponse.json({ status: 'analyzed', projectId: params.id })
  } catch (error) {
    console.error('Analyze error:', error)
    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'FAILED' },
    })
    return NextResponse.json({ error: 'Failed to analyze project' }, { status: 500 })
  }
}
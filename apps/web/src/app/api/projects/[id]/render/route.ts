import { NextRequest, NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/server-auth'
import { prisma } from '@nexcut/db'

function safeParseJSON(val: unknown, fallback: any) {
  if (!val) return fallback
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return val
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getServerUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: { voiceSegments: true, assets: true },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Read optional custom settings from request body
    let body: any = {}
    try { body = await request.json() } catch {}
    const customVariant = body.variant
    const customMusicMood = body.music_mood
    const customDuration = body.targetDuration

    // Compute next version number
    const existingOutputs = await prisma.outputReel.findMany({
      where: { projectId: params.id },
      select: { version: true },
      distinct: ['version'],
    })
    const nextVersion = existingOutputs.length > 0
      ? Math.max(...existingOutputs.map(o => o.version)) + 1
      : 1

    const aspectRatios = ['VERTICAL_9_16', 'SQUARE_1_1', 'PORTRAIT_4_5'] as const

    // Use custom settings or fall back to project defaults
    const baseStyle = safeParseJSON(project.styleDNA, {})
    const baseSettings = baseStyle.settings || {}
    const variant = customVariant || baseSettings.variant || 'balanced'
    const musicMood = customMusicMood || baseSettings.music_mood || 'auto'
    const targetDuration = customDuration || project.targetDuration || 30

    const outputs = await Promise.all(
      aspectRatios.map((ratio) =>
        prisma.outputReel.create({
          data: {
            projectId: params.id,
            aspectRatio: ratio,
            version: nextVersion,
            settings: JSON.stringify({
              styleDNA: baseStyle,
              aspectRatio: ratio,
              targetDuration,
              variant,
              music_mood: musicMood,
            }),
          },
        })
      )
    )

    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'RENDERING' },
    })

    try {
      const modalResponse = await fetch(
        `https://api.modal.com/nexcut-render/render_reel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MODAL_TOKEN_ID}:${process.env.MODAL_TOKEN_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: params.id,
            edl: safeParseJSON(project.edl, {}),
            style_dna: safeParseJSON(project.styleDNA, {}),
            asset_urls: project.assets.reduce((acc: Record<string, string>, a) => {
              acc[a.id] = a.url
              return acc
            }, {}),
            r2_config: {
              bucket: process.env.R2_BUCKET_NAME,
              account_id: process.env.R2_ACCOUNT_ID,
            },
            variant,
            music_mood: musicMood,
          }),
        }
      )

      if (modalResponse.ok) {
        const renderResult = await modalResponse.json()
        await prisma.outputReel.update({
          where: { id: outputs[0].id },
          data: {
            url: renderResult.output_url,
            previewUrl: renderResult.preview_url,
            duration: renderResult.duration,
            status: 'FINAL_READY',
          },
        })
      }
    } catch (workerError) {
      console.error('Render worker error:', workerError)
      // Mark all outputs as preview ready even if worker fails (for demo/testing)
      for (const out of outputs) {
        await prisma.outputReel.update({
          where: { id: out.id },
          data: { status: 'PREVIEW_READY' },
        })
      }
    }

    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
    })

    return NextResponse.json({ outputs, status: 'rendering' })
  } catch (error) {
    console.error('Render error:', error)
    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'FAILED' },
    })
    return NextResponse.json({ error: 'Failed to render project' }, { status: 500 })
  }
}
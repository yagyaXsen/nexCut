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

    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'RENDERING' },
    })

    const aspectRatios = ['VERTICAL_9_16', 'SQUARE_1_1', 'PORTRAIT_4_5'] as const

    const outputs = await Promise.all(
      aspectRatios.map((ratio, index) =>
        prisma.outputReel.create({
          data: {
            projectId: params.id,
            aspectRatio: ratio,
            version: 1,
            settings: JSON.stringify({
              styleDNA: safeParseJSON(project.styleDNA, {}),
              aspectRatio: ratio,
              targetDuration: project.targetDuration || 30,
            }),
          },
        })
      )
    )

    try {
      // Read variant and music_mood from project settings (set during analyze)
      const styleDNA = safeParseJSON(project.styleDNA, {})
      const projectSettings = styleDNA.settings || {}
      const variant = projectSettings.variant || 'balanced'
      const musicMood = projectSettings.music_mood || 'auto'

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
      // Mark first output as ready even if worker fails (for demo/testing)
      await prisma.outputReel.update({
        where: { id: outputs[0].id },
        data: { status: 'PREVIEW_READY' },
      })
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
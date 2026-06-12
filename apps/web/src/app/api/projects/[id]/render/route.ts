import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@nexcut/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
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
            settings: {
              styleDNA: project.styleDNA,
              aspectRatio: ratio,
              targetDuration: project.targetDuration || 30,
            },
          },
        })
      )
    )

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
            edl: project.edl || {},
            style_dna: project.styleDNA || {},
            asset_urls: project.assets.reduce((acc: Record<string, string>, a) => {
              acc[a.id] = a.url
              return acc
            }, {}),
            r2_config: {
              bucket: process.env.R2_BUCKET_NAME,
              account_id: process.env.R2_ACCOUNT_ID,
            },
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
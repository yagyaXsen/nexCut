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
          await prisma.project.update({
            where: { id: params.id },
            data: { styleDNA: dnaResult.style_dna },
          })
        }
      } catch (workerError) {
        console.error('Worker call failed (non-fatal):', workerError)
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
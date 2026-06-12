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

    const { urls, files } = await request.json()

    const reels = await Promise.all(
      urls.map((url: string, index: number) =>
        prisma.referenceReel.create({
          data: {
            projectId: params.id,
            url,
            platform: url.includes('tiktok') ? 'TIKTOK' : url.includes('instagram') ? 'INSTAGRAM' : 'YOUTUBE',
            order: index,
          },
        })
      )
    )

    await prisma.project.update({
      where: { id: params.id },
      data: { status: 'ANALYZING' },
    })

    return NextResponse.json({ reels }, { status: 201 })
  } catch (error) {
    console.error('Save references error:', error)
    return NextResponse.json({ error: 'Failed to save references' }, { status: 500 })
  }
}
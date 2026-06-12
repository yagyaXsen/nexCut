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

    const body = await request.json()

    const asset = await prisma.asset.create({
      data: {
        projectId: params.id,
        url: body.url,
        type: body.type || 'VIDEO',
        thumbnailUrl: body.thumbnailUrl,
        duration: body.duration,
        width: body.width,
        height: body.height,
        fps: body.fps,
        fileSize: body.fileSize,
        mimeType: body.mimeType,
        aiTags: body.tags || [],
        qualityScore: body.qualityScore,
      },
    })

    return NextResponse.json({ asset }, { status: 201 })
  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const assets = await prisma.asset.findMany({
      where: { projectId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ assets })
  } catch (error) {
    console.error('Get assets error:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 })
  }
}
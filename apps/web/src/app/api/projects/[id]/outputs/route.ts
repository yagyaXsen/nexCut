import { NextRequest, NextResponse } from 'next/server'
import { getServerUserId } from '@/lib/server-auth'
import { prisma } from '@nexcut/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = getServerUserId()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const project = await prisma.project.findUnique({ where: { id: params.id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const outputs = await prisma.outputReel.findMany({
      where: { projectId: params.id },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    })

    // Group by version
    const grouped: Record<number, typeof outputs> = {}
    for (const output of outputs) {
      if (!grouped[output.version]) grouped[output.version] = []
      grouped[output.version].push(output)
    }

    const versions = Object.entries(grouped)
      .map(([version, reels]) => ({
        version: parseInt(version),
        reels,
        createdAt: reels[0].createdAt,
        status: reels.every(r => r.status === 'FINAL_READY') ? 'ready' : 'processing',
      }))
      .sort((a, b) => b.version - a.version)

    return NextResponse.json({ versions, outputs })
  } catch (error) {
    console.error('Get outputs error:', error)
    return NextResponse.json({ error: 'Failed to fetch outputs' }, { status: 500 })
  }
}

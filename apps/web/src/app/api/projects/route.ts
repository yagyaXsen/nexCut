import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@nexcut/db'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  mode: z.enum(['CREATOR', 'BUSINESS']).default('CREATOR'),
  targetDuration: z.number().min(5).max(120).optional(),
  aspectRatio: z.enum(['VERTICAL_9_16', 'SQUARE_1_1', 'PORTRAIT_4_5']).default('VERTICAL_9_16'),
})

export async function GET(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    })

    const workspaceIds = memberships.map(m => m.workspaceId)

    const projects = await prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds } },
      include: {
        _count: { select: { assets: true, referenceReels: true, outputReels: true } },
        outputReels: { where: { status: 'FINAL_READY' }, take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, mode, targetDuration, aspectRatio } = createProjectSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { clerkId: userId } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    })

    if (!membership) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        workspaceId: membership.workspaceId,
        name,
        mode,
        targetDuration,
        aspectRatio,
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Create project error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: 'dev-user-id' },
    update: {},
    create: { id: 'dev-user-id', clerkId: 'dev-user-id', email: 'dev@nexcut.local', name: 'Dev User' },
  })

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'dev-workspace' },
    update: {},
    create: { name: 'My Workspace', slug: 'dev-workspace', plan: 'PRO' },
  })

  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: user.id, workspaceId: workspace.id, role: 'OWNER' },
  })

  const projects = [
    { id: 'proj-demo-1', name: 'Gym Progress Reel', status: 'COMPLETED', mode: 'CREATOR', targetDuration: 30 },
    { id: 'proj-demo-2', name: 'Product Launch', status: 'DRAFT', mode: 'BUSINESS', targetDuration: 45 },
    { id: 'proj-demo-3', name: 'Travel Montage', status: 'COMPLETED', mode: 'CREATOR', targetDuration: 60 },
  ]

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, workspaceId: workspace.id,
        styleDNA: JSON.stringify({
          pacing: { cut_duration: 1.2, zoom_frequency: 0.4, transition: 'crossfade', beat_sync: 0.8 },
          color: { primary: '#FF6B35', temperature: 6500, saturations: 1.2, contrast: 1.1, style: 'vibrant' },
          typography: { font: 'Inter', style: 'kinetic', size: 48, color: '#FFFFFF', position: 'bottom' },
          audio: { genre: 'hiphop', bpm: 120, energy: 0.8, ducking: 0.3 },
          music_mood: 'high_energy', variant: 'balanced',
        }),
      },
    })
  }

  await prisma.referenceReel.deleteMany({ where: { projectId: 'proj-demo-1' } })
  await prisma.referenceReel.createMany({
    data: [
      { projectId: 'proj-demo-1', url: 'https://example.com/reels/1.mp4', platform: 'TIKTOK', order: 0, status: 'completed' },
      { projectId: 'proj-demo-1', url: 'https://example.com/reels/2.mp4', platform: 'INSTAGRAM', order: 1, status: 'completed' },
      { projectId: 'proj-demo-1', url: 'https://example.com/reels/3.mp4', platform: 'YOUTUBE', order: 2, status: 'completed' },
    ],
  })

  await prisma.asset.deleteMany({ where: { projectId: 'proj-demo-1' } })
  await prisma.asset.createMany({
    data: [
      { projectId: 'proj-demo-1', type: 'VIDEO', url: 'https://example.com/assets/video1.mp4', duration: 120, width: 1920, height: 1080, fps: 30, fileSize: 52428800, mimeType: 'video/mp4', qualityScore: 0.85 },
      { projectId: 'proj-demo-1', type: 'VIDEO', url: 'https://example.com/assets/video2.mp4', duration: 90, width: 1920, height: 1080, fps: 60, fileSize: 41943040, mimeType: 'video/mp4', qualityScore: 0.92 },
    ],
  })

  await prisma.outputReel.deleteMany({ where: { projectId: 'proj-demo-1' } })
  await prisma.outputReel.createMany({
    data: [
      { projectId: 'proj-demo-1', version: 1, status: 'FINAL_READY', aspectRatio: 'VERTICAL_9_16', url: 'https://example.com/outputs/9x16.mp4', duration: 30, settings: '{}' },
      { projectId: 'proj-demo-1', version: 1, status: 'FINAL_READY', aspectRatio: 'SQUARE_1_1', url: 'https://example.com/outputs/1x1.mp4', duration: 30, settings: '{}' },
      { projectId: 'proj-demo-1', version: 1, status: 'FINAL_READY', aspectRatio: 'PORTRAIT_4_5', url: 'https://example.com/outputs/4x5.mp4', duration: 30, settings: '{}' },
    ],
  })

  console.log('Seed complete:', projects.length, 'projects')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

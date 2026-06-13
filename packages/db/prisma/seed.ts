import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const devUserId = 'dev-user-id'
  const devEmail = 'dev@nexcut.local'

  // Upsert dev user
  const user = await prisma.user.upsert({
    where: { clerkId: devUserId },
    update: {},
    create: {
      id: devUserId,
      clerkId: devUserId,
      email: devEmail,
      name: 'Dev User',
    },
  })

  // Upsert workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: 'dev-workspace' },
    update: {},
    create: {
      name: 'My Workspace',
      slug: 'dev-workspace',
      plan: 'PRO',
    },
  })

  // Ensure membership
  await prisma.workspaceMember.upsert({
    where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: 'OWNER',
    },
  })

  // Seed demo projects
  const projects = [
    {
      id: 'proj-demo-1',
      name: 'Gym Progress Reel',
      status: 'COMPLETED' as const,
      mode: 'CREATOR' as const,
      targetDuration: 30,
    },
    {
      id: 'proj-demo-2',
      name: 'Product Launch',
      status: 'DRAFT' as const,
      mode: 'BUSINESS' as const,
      targetDuration: 45,
    },
    {
      id: 'proj-demo-3',
      name: 'Travel Montage',
      status: 'COMPLETED' as const,
      mode: 'CREATOR' as const,
      targetDuration: 60,
    },
  ]

  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        workspaceId: workspace.id,
      },
    })
  }

  console.log('✅ Seed complete')
  console.log(`  - User: ${user.email}`)
  console.log(`  - Workspace: ${workspace.name}`)
  console.log(`  - Projects: ${projects.length}`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

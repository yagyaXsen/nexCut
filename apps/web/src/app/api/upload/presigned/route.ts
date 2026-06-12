import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getServerUserId } from '@/lib/server-auth'
import { z } from 'zod'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const presignedSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().max(500 * 1024 * 1024), // 500MB max
  folder: z.enum(['references', 'footage', 'music', 'brand', 'outputs']).default('footage'),
})

export async function POST(request: NextRequest) {
  try {
    const userId = getServerUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, fileType, fileSize, folder } = presignedSchema.parse(body)

    const key = `${userId}/${folder}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
    })

    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 }) // 1 hour
    const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN || `${process.env.R2_BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${key}`

    return NextResponse.json({
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Presigned URL error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
  }
}
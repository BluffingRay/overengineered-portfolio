import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}
function getR2Endpoint(): string | undefined {
  const direct = pickEnv('R2_ENDPOINT');
  if (direct) return direct;
  const accountId = pickEnv('R2_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID');
  if (accountId) return `https://${accountId}.r2.cloudflarestorage.com`;
  return undefined;
}
function getR2Bucket(): string {
  return pickEnv('R2_BUCKET', 'R2_BUCKET_NAME', 'CLOUDFLARE_R2_BUCKET') ?? 'overengineered-portfolio';
}
function getR2Client(): S3Client | null {
  const endpoint = getR2Endpoint();
  const accessKeyId = pickEnv('R2_ACCESS_KEY_ID', 'R2_ACCESS_KEY', 'CLOUDFLARE_R2_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID');
  const secretAccessKey = pickEnv('R2_SECRET_ACCESS_KEY', 'R2_SECRET_KEY', 'R2_SECRET_ACCESS_KEY_ID', 'CLOUDFLARE_R2_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY');
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const k = key.join('/');
  if (!k.startsWith('uploads/')) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const r2 = getR2Client();
  if (!r2) return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  const bucket = getR2Bucket();
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: k }));
    const body = res.Body as unknown as { transformToByteArray?: () => Promise<Uint8Array>; transformToWebStream?: () => ReadableStream };
    const headers: Record<string, string> = {};
    if (res.ContentType) headers['Content-Type'] = res.ContentType;
    if (res.ContentLength) headers['Content-Length'] = String(res.ContentLength);
    if (res.CacheControl) headers['Cache-Control'] = res.CacheControl;
    else headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    if (res.ETag) headers['ETag'] = res.ETag;

    if (body?.transformToByteArray) {
      const bytes = await body.transformToByteArray();
      return new NextResponse(Buffer.from(bytes) as unknown as BodyInit, { headers });
    }
    if (body?.transformToWebStream) {
      return new NextResponse(body.transformToWebStream() as unknown as BodyInit, { headers });
    }
    return new NextResponse(res.Body as unknown as BodyInit, { headers });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message ?? 'Not found' }, { status: 404 });
  }
}

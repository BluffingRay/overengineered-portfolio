import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

/**
 * Local asset vault — the "place that stores an image." Documents only
 * ever keep the returned URL. Moving to the cloud later means swapping
 * this file's internals for S3/CDN; every consumer keeps working.
 */
const ALLOWED_TYPES: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
};

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  let file: File | null = null;

  try {
    const form = await request.formData();
    const candidate = form.get('file');
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type || 'unknown'}` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'Image is larger than 8MB' },
      { status: 413 },
    );
  }

  const id = randomUUID();
  const dir = path.join(process.cwd(), 'public', 'uploads');

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${id}${ext}`),
      Buffer.from(await file.arrayBuffer()),
    );
  } catch {
    return NextResponse.json(
      { error: 'Could not save the file' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: `/uploads/${id}${ext}`,
    name: file.name,
  });
}

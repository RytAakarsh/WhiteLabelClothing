import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminSession();
    if (!authResult) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, WEBP, and AVIF are supported.' }, { status: 400 });
    }

    // Max file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split('.').pop() || 'png';
    const filename = `products/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const client = authResult.client;

    const { data: uploadData, error: uploadError } = await client.storage
      .from('product-images')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = client.storage
      .from('product-images')
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: uploadData.path,
    });
  } catch (err: any) {
    console.error('Upload handler exception:', err);
    return NextResponse.json({ error: err.message || 'Image upload failed' }, { status: 500 });
  }
}

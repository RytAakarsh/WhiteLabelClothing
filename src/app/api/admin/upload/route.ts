import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const adminClient = createAdminClient();
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== 'admin') {
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

    const { data: uploadData, error: uploadError } = await adminClient.storage
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
    const { data: { publicUrl } } = adminClient.storage
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

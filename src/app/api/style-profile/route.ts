import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { STYLE_PROFILE_ID } from '@/lib/supabase/types';

export const runtime = 'nodejs';

/** Upsert the single-user style blueprint. */
export async function PUT(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Server owns identity and timestamps — never trust them from the client.
  delete body.id;
  delete body.created_at;
  delete body.updated_at;

  const supa = createAdminClient();
  const { error } = await supa
    .from('style_profile')
    .upsert({ id: STYLE_PROFILE_ID, ...body, updated_at: new Date().toISOString() });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client (anon key). Use in RSC / route handlers where you
 * want to read user data without bypassing RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — ignore.
          }
        },
      },
    }
  );
}

/**
 * Admin client using the service role key. Only usable in route handlers /
 * server actions. Never import into client components.
 *
 * Bypasses RLS by design. In V1, RLS is disabled anyway (single-user app — see
 * schema.sql), so reads/writes would work with the anon client too; using the
 * service role here keeps generation routes independent of request cookies and
 * ready for the day RLS is switched on for multi-user.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

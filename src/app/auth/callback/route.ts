import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tatadana-local.supabase.co';
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-tatadana';

    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    });

    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }
    } catch {
      // Fallback to next redirect
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

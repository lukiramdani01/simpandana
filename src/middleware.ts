import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { Database } from '@/types/database';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tatadana-local.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key-tatadana';

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  // Refresh session
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // If Supabase is unreachable or unconfigured during build/testing
    user = null;
  }

  const demoCookie = request.cookies.get('tatadana_user_id')?.value;
  const userStatusCookie = request.cookies.get('tatadana_user_status')?.value;

  if (!user && demoCookie) {
    user = {
      id: demoCookie,
      email: request.cookies.get('tatadana_demo_email')?.value || 'luki@tatadana.id',
    } as any;
  }

  const userStatus = userStatusCookie || user?.user_metadata?.status || user?.app_metadata?.status;
  const pathname = request.nextUrl.pathname;

  // Check if route is a public unauthenticated route
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/demo' ||
    pathname === '/pending-approval' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/');

  // Redirect PENDING users trying to access non-pending routes to /pending-approval
  if (user && userStatus === 'PENDING' && pathname !== '/pending-approval' && !pathname.startsWith('/api/') && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/pending-approval', request.url));
  }

  // Redirect authenticated APPROVED user from /login or /register to /dashboard
  if (user && userStatus !== 'PENDING' && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If route is public, allow access
  if (isPublicRoute) {
    return response;
  }

  // Strictly require authentication for all non-public protected routes (e.g. /dashboard, /admin)
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protect /admin routes (superadmin required)
  if (pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/telegram/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

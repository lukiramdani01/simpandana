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
    user = null;
  }

  const userIdCookie = request.cookies.get('tatadana_user_id')?.value;
  const userEmailCookie = request.cookies.get('tatadana_demo_email')?.value?.toLowerCase();
  const userStatusCookie = request.cookies.get('tatadana_user_status')?.value;

  if (!user && userIdCookie && userIdCookie.trim().length > 0) {
    user = {
      id: userIdCookie,
      email: userEmailCookie || 'pengguna@simpandana.my.id',
    } as any;
  }

  const userStatus = userStatusCookie || user?.user_metadata?.status || user?.app_metadata?.status;
  const pathname = request.nextUrl.pathname;

  // Public unauthenticated routes
  const isPublicRoute =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/demo' ||
    pathname === '/verify-email' ||
    pathname === '/pending-approval' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/');

  // If unauthenticated user tries to access protected routes
  if (!isPublicRoute && (!user || !userIdCookie || userIdCookie.trim().length === 0)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /admin route strictly for lramdanie02@gmail.com / superadmin
  if (pathname.startsWith('/admin')) {
    const activeEmail = userEmailCookie || user?.email?.toLowerCase();
    if (activeEmail !== 'lramdanie02@gmail.com') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized_admin', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/telegram/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

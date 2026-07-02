import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getHomeRouteForRole,
  getRequiredRoleForPath,
  isAuthPath,
  isProtectedPath,
} from '@/lib/supabase/auth-helpers'
import type { UserRole } from '@/types'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      url.pathname = profile?.role
        ? getHomeRouteForRole(profile.role as UserRole)
        : '/login'
    } else {
      url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (isAuthPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = profile?.role
        ? getHomeRouteForRole(profile.role as UserRole)
        : '/login'
      url.searchParams.delete('redirect')
      return NextResponse.redirect(url)
    }

    if (isProtectedPath(pathname)) {
      if (!profile?.role) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('error', 'missing_profile')
        return NextResponse.redirect(url)
      }

      const requiredRole = getRequiredRoleForPath(pathname)
      if (requiredRole && profile.role !== requiredRole) {
        const url = request.nextUrl.clone()
        url.pathname = getHomeRouteForRole(profile.role as UserRole)
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

import type { UserRole } from '@/types'

export const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  teacher: '/teacher',
  parent: '/parent',
}

export const AUTH_ROUTES = ['/login', '/forgot-password']

export function getHomeRouteForRole(role: UserRole): string {
  return ROLE_HOME_ROUTES[role]
}

export function getRequiredRoleForPath(pathname: string): UserRole | null {
  if (pathname.startsWith('/admin')) return 'admin'
  if (pathname.startsWith('/teacher')) return 'teacher'
  if (pathname.startsWith('/parent')) return 'parent'
  return null
}

export function isProtectedPath(pathname: string): boolean {
  return getRequiredRoleForPath(pathname) !== null
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

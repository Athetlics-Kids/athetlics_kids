'use client'

import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { getHomeRouteForRole } from '@/lib/supabase/auth-helpers'
import { DashboardLayout } from './dashboard-layout'
import { PageLoader } from './page-loader'
import type { UserRole } from '@/types'

function RoleLayoutInner({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (user.role !== role) {
      router.replace(getHomeRouteForRole(user.role))
    }
  }, [user, loading, role, router])

  if (loading || !user || user.role !== role) {
    return <PageLoader />
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>
}

export function RoleDashboardLayout({ role, children }: { role: UserRole; children: ReactNode }) {
  return (
    <AuthProvider>
      <RoleLayoutInner role={role}>{children}</RoleLayoutInner>
    </AuthProvider>
  )
}

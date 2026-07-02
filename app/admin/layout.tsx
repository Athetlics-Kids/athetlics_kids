import { ReactNode } from 'react'
import { RoleDashboardLayout } from '@/components/layout/role-dashboard-layout'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleDashboardLayout role="admin">{children}</RoleDashboardLayout>
}

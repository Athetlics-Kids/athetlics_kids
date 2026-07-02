import { ReactNode } from 'react'
import { RoleDashboardLayout } from '@/components/layout/role-dashboard-layout'

export default function ParentLayout({ children }: { children: ReactNode }) {
  return <RoleDashboardLayout role="parent">{children}</RoleDashboardLayout>
}

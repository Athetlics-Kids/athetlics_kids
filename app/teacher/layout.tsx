import { ReactNode } from 'react'
import { RoleDashboardLayout } from '@/components/layout/role-dashboard-layout'

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return <RoleDashboardLayout role="teacher">{children}</RoleDashboardLayout>
}

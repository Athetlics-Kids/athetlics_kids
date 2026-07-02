import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  CreditCard,
  Settings,
  Home,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavLink {
  href: string
  label: string
  icon: LucideIcon
  mobileLabel?: string
}

export const adminLinks: NavLink[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, mobileLabel: 'Inicio' },
  { href: '/admin/students', label: 'Alumnos', icon: Users },
  { href: '/admin/teachers', label: 'Profesores', icon: GraduationCap },
  { href: '/admin/classes', label: 'Clases', icon: Calendar },
  { href: '/admin/payments', label: 'Pagos', icon: CreditCard },
  { href: '/admin/settings', label: 'Configuración', icon: Settings },
]

export const teacherLinks: NavLink[] = [
  { href: '/teacher', label: 'Mi Agenda', icon: LayoutDashboard, mobileLabel: 'Agenda' },
  { href: '/teacher/students', label: 'Mis Alumnos', icon: Users, mobileLabel: 'Alumnos' },
  { href: '/teacher/attendance', label: 'Asistencia', icon: Calendar },
  { href: '/teacher/earnings', label: 'Ganancias', icon: CreditCard },
]

export const parentLinks: NavLink[] = [
  { href: '/parent', label: 'Inicio', icon: Home },
  { href: '/parent/classes', label: 'Clases', icon: Calendar },
  { href: '/parent/payments', label: 'Pagos', icon: CreditCard },
  { href: '/parent/progress', label: 'Progreso', icon: GraduationCap },
]

export function getNavLinks(role: UserRole): NavLink[] {
  if (role === 'admin') return adminLinks
  if (role === 'teacher') return teacherLinks
  return parentLinks
}

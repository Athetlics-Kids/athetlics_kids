'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNavLinks } from './nav-config'
import { LogoutButton } from './logout-button'
import type { UserRole } from '@/types'

interface SidebarNavProps {
  role: UserRole
  collapsed?: boolean
  onNavigate?: () => void
  showLabels?: boolean
}

export function SidebarNav({
  role,
  collapsed = false,
  onNavigate,
  showLabels = true,
}: SidebarNavProps) {
  const pathname = usePathname()
  const links = getNavLinks(role)

  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((link) => {
          const isActive = pathname === link.href
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {showLabels && !collapsed && (
                <span className="truncate">{link.label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <LogoutButton collapsed={collapsed} showLabel={showLabels} onNavigate={onNavigate} />
      </div>
    </>
  )
}

'use client'

import { ReactNode, useState } from 'react'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { MobileNav } from './mobile-nav'
import { SidebarNav } from './sidebar-nav'
import { BrandLogo } from './brand-logo'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { UserRole } from '@/types'

interface DashboardLayoutProps {
  children: ReactNode
  user: {
    name: string
    email: string
    avatar?: string
    role: UserRole
  }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={user.role} />

      <div className="flex min-h-screen flex-col lg:ml-[280px]">
        <Navbar
          user={user}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-3 pb-24 sm:p-4 lg:pb-6 lg:p-6">
          {children}
        </main>
      </div>

      <MobileNav role={user.role} />

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-[280px] bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground">
          <SheetHeader className="border-b border-sidebar-border p-4 text-left">
            <SheetTitle className="flex items-center gap-2 text-sidebar-foreground">
              <BrandLogo size={36} />
              Athletic Kids
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-4rem)] flex-col">
            <SidebarNav
              role={user.role}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

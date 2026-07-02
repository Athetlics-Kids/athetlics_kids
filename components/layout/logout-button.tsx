'use client'

import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

interface LogoutButtonProps {
  collapsed?: boolean
  showLabel?: boolean
  onNavigate?: () => void
  className?: string
}

export function LogoutButton({
  collapsed = false,
  showLabel = true,
  onNavigate,
  className,
}: LogoutButtonProps) {
  const { signOut } = useAuth()

  return (
    <Button
      variant="ghost"
      className={cn(
        'w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2',
        className
      )}
      onClick={async () => {
        onNavigate?.()
        await signOut()
      }}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {showLabel && !collapsed && <span>Cerrar Sesión</span>}
    </Button>
  )
}

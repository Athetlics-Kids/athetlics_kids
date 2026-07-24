'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { PaymentStatus } from '@/types'

interface PaymentStatusBadgeProps {
  status: PaymentStatus
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        status === 'paid' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        status === 'overdue' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}
    >
      {status === 'paid' && 'Pagado'}
      {status === 'pending' && 'Pendiente'}
      {status === 'overdue' && 'Vencido'}
    </Badge>
  )
}

interface PlanTypeBadgeProps {
  plan: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'one_off'
}

export function PlanTypeBadge({ plan }: PlanTypeBadgeProps) {
  const labels = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
    one_off: 'Clase única',
  }

  return (
    <Badge variant="outline" className="font-medium">
      {labels[plan]}
    </Badge>
  )
}

interface StatusBadgeProps {
  active: boolean
}

export function StatusBadge({ active }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium',
        active
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      )}
    >
      {active ? 'Activo' : 'Inactivo'}
    </Badge>
  )
}

interface LevelBadgeProps {
  level: string
}

export function LevelBadge({ level }: LevelBadgeProps) {
  const getColor = () => {
    switch (level.toLowerCase()) {
      case 'principiante':
      case 'bebés':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'intermedio':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'avanzado':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  return (
    <Badge variant="secondary" className={cn('font-medium', getColor())}>
      {level}
    </Badge>
  )
}

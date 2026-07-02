'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  delay?: number
}

export function DashboardCard({
  title,
  description,
  action,
  children,
  className,
  delay = 0,
}: DashboardCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        'rounded-xl border border-border bg-card shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-4 lg:p-6">{children}</div>
    </motion.div>
  )
}

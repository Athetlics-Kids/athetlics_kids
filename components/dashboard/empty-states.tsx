'use client'

import { motion } from 'framer-motion'
import { LucideIcon, FileX, Users, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </motion.div>
  )
}

export function NoStudents({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No hay alumnos registrados"
      description="Comienza agregando tu primer alumno para gestionar la academia."
      actionLabel="Agregar Alumno"
      onAction={onAdd}
    />
  )
}

export function NoClasses({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No hay clases programadas"
      description="Crea una nueva clase para comenzar a organizar el horario."
      actionLabel="Crear Clase"
      onAction={onAdd}
    />
  )
}

export function NoPayments() {
  return (
    <EmptyState
      icon={CreditCard}
      title="No hay pagos registrados"
      description="Los pagos aparecerán aquí cuando los alumnos realicen sus pagos."
    />
  )
}

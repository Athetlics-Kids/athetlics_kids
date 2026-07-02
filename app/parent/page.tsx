'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar,
  CreditCard,
  Award,
  Bell,
  ChevronRight,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { DashboardCard, PaymentStatusBadge, NoStudents } from '@/components/dashboard'
import { formatCurrency, formatDate } from '@/lib/locale'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import {
  fetchClassSessions,
  fetchNotifications,
  fetchPayments,
  fetchStudents,
} from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'

export default function ParentDashboardPage() {
  const user = useRequireRole('parent')
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: classSessions = [] } = useSupabaseLoader((client) => fetchClassSessions(client))
  const { data: payments = [] } = useSupabaseLoader((client) => fetchPayments(client))
  const { data: notifications = [] } = useSupabaseLoader((client) => fetchNotifications(client))

  const myChildren = user.parentId
    ? students.filter((s) => s.parentId === user.parentId)
    : []
  const myPayments = user.parentId
    ? payments.filter((p) => p.parentId === user.parentId)
    : []
  const myNotifications = notifications.filter((n) => !n.read).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bienvenido/a, {user.name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">
          Aquí puedes ver la información de tus hijos y gestionar sus clases.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/parent/classes', icon: Calendar, label: 'Ver Clases', color: 'bg-primary/10 text-primary' },
          { href: '/parent/payments', icon: CreditCard, label: 'Ver Pagos', color: 'bg-secondary/10 text-secondary' },
          { href: '/parent/progress', icon: Award, label: 'Progreso', color: 'bg-accent/10 text-accent' },
          { href: '#', icon: Bell, label: `${myNotifications.length} Notificaciones`, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
        ].map((action, i) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link href={action.href}>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <span className="font-medium">{action.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Children Cards */}
      <DashboardCard
        title="Mis Hijos"
        description="Información y progreso de tus hijos"
        delay={0.2}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {myChildren.map((child, i) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="rounded-xl border border-border p-4"
            >
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={child.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {child.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{child.name}</h3>
                    <PaymentStatusBadge status={child.paymentStatus} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {child.age} años • {child.level}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Profesor: {child.teacherName}
                  </p>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Progreso</span>
                      <span className="font-medium">{child.progress}%</span>
                    </div>
                    <Progress value={child.progress} className="h-2" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </DashboardCard>

      {/* Upcoming Classes & Payments Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <DashboardCard
          title="Próximas Clases"
          description="Clases programadas para esta semana"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parent/classes">Ver todas</Link>
            </Button>
          }
          delay={0.4}
        >
          <div className="space-y-3">
            {classSessions.slice(0, 3).map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.teacherName}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{session.startTime}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(session.date, 'EEE d')}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardCard>

        {/* Recent Payments */}
        <DashboardCard
          title="Pagos Recientes"
          description="Historial de pagos"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/parent/payments">Ver todos</Link>
            </Button>
          }
          delay={0.5}
        >
          <div className="space-y-3">
            {myPayments.slice(0, 3).map((payment, i) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    payment.status === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : payment.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {payment.status === 'paid' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{payment.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payment.dueDate, 'PP')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                  <PaymentStatusBadge status={payment.status} />
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Notifications */}
      {myNotifications.length > 0 && (
        <DashboardCard
          title="Notificaciones"
          description="Mensajes importantes"
          delay={0.6}
        >
          <div className="space-y-3">
            {myNotifications.map((notification, i) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${
                  notification.type === 'warning'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : notification.type === 'success'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-blue-100 dark:bg-blue-900/30'
                }`}>
                  <Bell className={`h-4 w-4 ${
                    notification.type === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : notification.type === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {formatDate(notification.createdAt, 'PP')}
                </Badge>
              </motion.div>
            ))}
          </div>
        </DashboardCard>
      )}
    </div>
  )
}

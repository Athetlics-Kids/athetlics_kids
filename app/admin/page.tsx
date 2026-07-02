'use client'

import { motion } from 'framer-motion'
import {
  Users,
  GraduationCap,
  Calendar,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { StatCard, DashboardCard, NoClasses, NoPayments, NoStudents, StatCardSkeleton } from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PaymentStatusBadge } from '@/components/dashboard'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import Link from 'next/link'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchAdminDashboardData } from '@/lib/supabase/data'
import { formatCurrency, formatCompactCurrency } from '@/lib/locale'

export default function AdminDashboardPage() {
  const { data, loading } = useSupabaseLoader((client) => fetchAdminDashboardData(client))

  const dashboardStats = data?.stats ?? {
    totalStudents: 0,
    activeClasses: 0,
    activeTeachers: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    attendanceRate: 0,
  }
  const revenueData = data?.revenueData ?? []
  const weeklySchedule = data?.weeklySchedule ?? []
  const classSessions = data?.classSessions ?? []
  const students = data?.students ?? []
  const payments = data?.payments ?? []

  const upcomingClasses = classSessions.filter(
    (c) => c.status === 'scheduled'
  ).slice(0, 4)

  const pendingPayments = payments.filter(
    (p) => p.status === 'pending' || p.status === 'overdue'
  ).slice(0, 4)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Bienvenido de vuelta. Aquí está el resumen de tu academia.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/admin/classes">Ver Calendario</Link>
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link href="/admin/students">
              Agregar Alumno
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Alumnos"
          value={dashboardStats.totalStudents}
          change={dashboardStats.totalStudents > 0 ? 'Registrados' : 'Sin registros'}
          changeType="neutral"
          icon={Users}
          iconColor="bg-primary/10 text-primary"
          index={0}
        />
        <StatCard
          title="Clases Activas"
          value={dashboardStats.activeClasses}
          change={dashboardStats.activeClasses > 0 ? 'Programadas' : 'Sin clases'}
          changeType="neutral"
          icon={Calendar}
          iconColor="bg-secondary/10 text-secondary"
          index={1}
        />
        <StatCard
          title="Profesores Activos"
          value={dashboardStats.activeTeachers}
          change={dashboardStats.activeTeachers > 0 ? 'Activos' : 'Sin profesores'}
          changeType="neutral"
          icon={GraduationCap}
          iconColor="bg-accent/10 text-accent"
          index={2}
        />
        <StatCard
          title="Ingresos del Mes"
          value={formatCurrency(dashboardStats.monthlyRevenue)}
          change={dashboardStats.monthlyRevenue > 0 ? 'Este mes' : 'Sin ingresos'}
          changeType="neutral"
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          index={3}
        />
      </div>

      {/* Charts and Tables Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Revenue Chart */}
        <DashboardCard
          title="Ingresos Mensuales"
          description="Comparativa de ingresos del año"
          action={
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <TrendingUp className="h-4 w-4" />
              <span>+8.5%</span>
            </div>
          }
          className="lg:col-span-4"
          delay={0.2}
        >
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => formatCompactCurrency(value)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                />
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* Weekly Schedule */}
        <DashboardCard
          title="Agenda Semanal"
          description="Clases programadas por día"
          className="lg:col-span-3"
          delay={0.3}
        >
          <div className="space-y-4">
            {weeklySchedule.map((day, i) => (
              <motion.div
                key={day.day}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05 }}
                className="flex items-center justify-between"
              >
                <span className="font-medium">{day.day}</span>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-muted sm:w-32">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(day.classes / 8) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.5 + i * 0.05 }}
                      className="h-full bg-primary"
                    />
                  </div>
                  <span className="w-8 text-sm text-muted-foreground">{day.classes}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <DashboardCard
          title="Próximas Clases"
          description="Clases programadas para hoy"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/classes">Ver todas</Link>
            </Button>
          }
          delay={0.4}
        >
          <div className="space-y-4">
            {upcomingClasses.length === 0 ? (
              <NoClasses />
            ) : (
              upcomingClasses.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-12 sm:w-12">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{session.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {session.teacherName} • {session.level}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="font-medium text-sm sm:text-base">{session.startTime} - {session.endTime}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.enrolled}/{session.capacity} alumnos
                  </p>
                </div>
              </motion.div>
              ))
            )}
          </div>
        </DashboardCard>

        {/* Pending Payments */}
        <DashboardCard
          title="Pagos Pendientes"
          description="Pagos que requieren atención"
          action={
            <Badge variant="destructive" className="rounded-full">
              {dashboardStats.pendingPayments} pendientes
            </Badge>
          }
          delay={0.5}
        >
          <div className="space-y-4">
            {pendingPayments.length === 0 ? (
              <NoPayments />
            ) : (
              pendingPayments.map((payment, i) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar className="shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {payment.studentName.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{payment.studentName}</p>
                    <p className="text-sm text-muted-foreground truncate">{payment.parentName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <p className="font-medium">{formatCurrency(payment.amount)}</p>
                  <PaymentStatusBadge status={payment.status} />
                </div>
              </motion.div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/payments">Ver todos los pagos</Link>
            </Button>
          </div>
        </DashboardCard>
      </div>

      {/* Recent Students */}
      <DashboardCard
        title="Alumnos Recientes"
        description="Últimos alumnos inscritos"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/students">Ver todos</Link>
          </Button>
        }
        delay={0.6}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {students.length === 0 ? (
            <div className="col-span-full">
              <NoStudents />
            </div>
          ) : (
            students.slice(0, 6).map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.7 + i * 0.05 }}
              className="flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={student.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{student.name}</p>
                <p className="text-sm text-muted-foreground">{student.age} años • {student.level}</p>
              </div>
              <PaymentStatusBadge status={student.paymentStatus} />
            </motion.div>
            ))
          )}
        </div>
      </DashboardCard>
    </div>
  )
}

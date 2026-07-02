'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, DollarSign, TrendingUp, Calendar, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard, DashboardCard } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchMonthlyRevenue, fetchTeachers } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'
import { formatCompactCurrency, formatCurrency } from '@/lib/locale'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export default function TeacherEarningsPage() {
  const user = useRequireRole('teacher')
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))
  const { data: revenueData = [] } = useSupabaseLoader((client) => fetchMonthlyRevenue(client))
  const teacher = teachers.find((t) => t.id === user.teacherId)
  const teacherScheduleCount = teacher?.schedule.length ?? 0
  const teacherStudentsCount = teacher?.studentsCount ?? 0
  const teacherEarnings = teacher?.earnings ?? 0

  // Mock earnings data per month
  const earningsData = revenueData.map((item) => ({
    month: item.month,
    earnings: Math.floor(item.revenue * 0.33), // Teacher gets ~33% of class revenue
  }))

  const totalYearEarnings = earningsData.reduce((sum, item) => sum + item.earnings, 0)
  const avgMonthlyEarnings = Math.floor(totalYearEarnings / 12)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Ganancias</h1>
          <p className="text-muted-foreground">
            Resumen de ingresos y comisiones
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ganancias del Mes"
          value={formatCurrency(teacher?.earnings ?? 0)}
          change="+12% vs mes anterior"
          changeType="positive"
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          index={0}
        />
        <StatCard
          title="Promedio Mensual"
          value={formatCurrency(avgMonthlyEarnings)}
          icon={TrendingUp}
          iconColor="bg-primary/10 text-primary"
          index={1}
        />
        <StatCard
          title="Clases este Mes"
          value={teacherScheduleCount * 4}
          icon={Calendar}
          iconColor="bg-secondary/10 text-secondary"
          index={2}
        />
        <StatCard
          title="Alumnos Activos"
          value={teacherStudentsCount}
          icon={Users}
          iconColor="bg-accent/10 text-accent"
          index={3}
        />
      </div>

      {/* Earnings Chart */}
      <DashboardCard
        title="Historial de Ganancias"
        description="Ganancias mensuales del año"
        delay={0.2}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earningsData}>
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
                formatter={(value: number) => [formatCurrency(value), 'Ganancias']}
              />
              <Bar
                dataKey="earnings"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      {/* Earnings Breakdown */}
      <DashboardCard
        title="Desglose de Ganancias"
        description="Cómo se calculan tus ingresos"
        delay={0.3}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-lg border border-border p-4 text-center"
            >
              <p className="text-3xl font-bold text-primary">$500</p>
              <p className="text-sm text-muted-foreground">Por clase impartida</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="rounded-lg border border-border p-4 text-center"
            >
              <p className="text-3xl font-bold text-secondary">10%</p>
              <p className="text-sm text-muted-foreground">Bono por alumno nuevo</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-lg border border-border p-4 text-center"
            >
              <p className="text-3xl font-bold text-accent">5%</p>
              <p className="text-sm text-muted-foreground">Bono por asistencia perfecta</p>
            </motion.div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <h4 className="font-medium mb-2">Próximo Pago</h4>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Se procesará el día 15 del próximo mes
              </p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(teacherEarnings)}
              </p>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  )
}

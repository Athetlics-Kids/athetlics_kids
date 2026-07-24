'use client'

import Link from 'next/link'
import { ChevronLeft, DollarSign, Calendar, Users, CheckCircle2, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatCard, DashboardCard } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchTeacherMonthlyEarnings, fetchTeachers } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'
import { formatCompactCurrency, formatCurrency } from '@/lib/locale'
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export default function TeacherEarningsPage() {
  const user = useRequireRole('teacher')
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))
  const teacher = teachers.find((t) => t.id === user.teacherId)

  const { data: earningsData = [] } = useSupabaseLoader((client) =>
    user.teacherId
      ? fetchTeacherMonthlyEarnings(client, user.teacherId)
      : Promise.resolve([])
  )

  const teacherStudentsCount = teacher?.studentsCount ?? 0
  const projected = teacher?.earningsProjected ?? 0
  const pending = teacher?.pendingBalance ?? 0
  const currentMonth = earningsData[new Date().getMonth()]

  const chartData = earningsData.map((m) => ({
    month: m.month,
    Proyección: m.projected,
    'Saldo pendiente': m.pending,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Ganancias</h1>
          <p className="text-muted-foreground">
            Proyección vs saldo pendiente (clases ejecutadas aún no pagadas)
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Proyección del Mes"
          value={formatCurrency(projected)}
          icon={DollarSign}
          iconColor="bg-secondary/10 text-secondary"
          index={0}
        />
        <StatCard
          title="Saldo Pendiente"
          value={formatCurrency(pending)}
          icon={Wallet}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          index={1}
        />
        <StatCard
          title="Ejecutadas / Pagadas"
          value={`${currentMonth?.classesDone ?? 0} / ${currentMonth?.classesPaid ?? 0}`}
          icon={CheckCircle2}
          iconColor="bg-primary/10 text-primary"
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

      <DashboardCard
        title="Historial de Ganancias"
        description="Proyección del mes vs saldo pendiente por mes"
        delay={0.2}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
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
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="Proyección" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Saldo pendiente" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title="Cómo se calculan" delay={0.3}>
        <div className="space-y-3 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Proyección:</strong> todas las clases del mes
            (no canceladas).
          </p>
          <p>
            <strong className="text-foreground">Saldo pendiente:</strong> clases con fecha ya
            pasada que aún no se marcaron como <em>Pagado</em> al profesor.
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Clases este mes: {currentMonth?.classes ?? 0}
          </p>
        </div>
      </DashboardCard>
    </div>
  )
}

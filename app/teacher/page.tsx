'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { StatCard, DashboardCard, LevelBadge, NoClasses, NoStudents } from '@/components/dashboard'
import { formatCurrency, formatDate } from '@/lib/locale'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchAttendanceRecords, fetchClassSessions, fetchStudents, fetchTeachers } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'

export default function TeacherDashboardPage() {
  const user = useRequireRole('teacher')
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: classSessions = [] } = useSupabaseLoader((client) => fetchClassSessions(client))
  const { data: attendanceRecords = [] } = useSupabaseLoader((client) => fetchAttendanceRecords(client))

  const teacher = teachers.find((t) => t.id === user.teacherId) ?? {
    id: user.teacherId ?? '',
    name: user.name,
    email: user.email,
    specialty: '',
    phone: '',
    schedule: [],
    studentsCount: 0,
    earnings: 0,
    isActive: true,
    createdAt: new Date(),
  }
  const myStudents = user.teacherId
    ? students.filter((s) => s.teacherId === user.teacherId)
    : []
  const todayClasses = user.teacherId
    ? classSessions.filter((c) => c.teacherId === user.teacherId && c.status === 'scheduled')
    : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenido, {teacher.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          Aquí está el resumen de tu agenda de hoy.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clases Hoy"
          value={todayClasses.length}
          icon={Calendar}
          iconColor="bg-primary/10 text-primary"
          index={0}
        />
        <StatCard
          title="Mis Alumnos"
          value={myStudents.length}
          icon={Users}
          iconColor="bg-secondary/10 text-secondary"
          index={1}
        />
        <StatCard
          title="Ganancias del Mes"
          value={formatCurrency(teacher.earnings)}
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          index={2}
        />
        <StatCard
          title="Próxima Clase"
          value={todayClasses[0]?.startTime || 'Sin clases'}
          icon={Clock}
          iconColor="bg-accent/10 text-accent"
          index={3}
        />
      </div>

      {/* Today's Classes */}
      <DashboardCard
        title="Agenda de Hoy"
        description={formatDate(new Date(), 'PPPP')}
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teacher/attendance">Ver todas</Link>
          </Button>
        }
        delay={0.2}
      >
        {todayClasses.length > 0 ? (
          <div className="space-y-4">
            {todayClasses.map((session, i) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{session.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <LevelBadge level={session.level} />
                      <span className="text-sm text-muted-foreground">
                        {session.enrolled}/{session.capacity} alumnos
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold">{session.startTime}</p>
                    <p className="text-sm text-muted-foreground">
                      - {session.endTime}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href="/teacher/attendance">
                      Tomar Asistencia
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No tienes clases programadas para hoy</p>
          </div>
        )}
      </DashboardCard>

      {/* My Students */}
      <DashboardCard
        title="Mis Alumnos"
        description="Alumnos asignados a tu cargo"
        action={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/teacher/students">
              Ver todos
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        }
        delay={0.3}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myStudents.map((student, i) => (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-3 rounded-lg border border-border p-3"
            >
              <Avatar>
                <AvatarImage src={student.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {student.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{student.name}</p>
                <p className="text-sm text-muted-foreground">
                  {student.age} años • {student.level}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </DashboardCard>

      {/* Schedule Summary */}
      <DashboardCard
        title="Mi Horario"
        description="Horario semanal de clases"
        delay={0.4}
      >
        <div className="space-y-2">
          {teacher.schedule.map((schedule, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
            >
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{schedule}</span>
            </motion.div>
          ))}
        </div>
      </DashboardCard>
    </div>
  )
}

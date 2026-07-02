'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Award, TrendingUp, Calendar, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { DashboardCard, LevelBadge, NoStudents } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchAttendanceRecords, fetchStudents } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'

export default function ParentProgressPage() {
  const user = useRequireRole('parent')
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: attendanceRecords = [] } = useSupabaseLoader((client) => fetchAttendanceRecords(client))
  const myChildren = user.parentId
    ? students.filter((s) => s.parentId === user.parentId)
    : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Progreso de mis Hijos</h1>
          <p className="text-muted-foreground">
            Seguimiento del desarrollo y logros
          </p>
        </div>
      </div>

      {/* Progress Cards */}
      {myChildren.map((child, index) => {
        const childAttendance = attendanceRecords.filter((a) => a.studentId === child.id)
        const attendanceRate = childAttendance.length > 0
          ? (childAttendance.filter((a) => a.present).length / childAttendance.length) * 100
          : 100

        return (
          <motion.div
            key={child.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
          >
            <DashboardCard
              title={child.name}
              description={`${child.age} años • ${child.teacherName}`}
            >
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={child.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {child.name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <LevelBadge level={child.level} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Inscrito desde hace {Math.floor((Date.now() - child.enrolledAt.getTime()) / (1000 * 60 * 60 * 24 * 30))} meses
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold text-primary">
                      <Award className="h-6 w-6" />
                      {child.progress}%
                    </div>
                    <p className="text-sm text-muted-foreground">Progreso General</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold text-green-600">
                      <Calendar className="h-6 w-6" />
                      {Math.round(attendanceRate)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Asistencia</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold text-secondary">
                      <TrendingUp className="h-6 w-6" />
                      {childAttendance.filter((a) => a.present).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Clases Asistidas</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <div className="flex items-center justify-center gap-2 text-3xl font-bold text-accent">
                      <Target className="h-6 w-6" />
                      3
                    </div>
                    <p className="text-sm text-muted-foreground">Logros</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Progreso hacia siguiente nivel</span>
                    <span className="text-sm text-muted-foreground">{child.progress}%</span>
                  </div>
                  <Progress value={child.progress} className="h-3" />
                  <p className="text-sm text-muted-foreground">
                    {child.level === 'Principiante'
                      ? `${100 - child.progress}% para alcanzar nivel Intermedio`
                      : child.level === 'Intermedio'
                      ? `${100 - child.progress}% para alcanzar nivel Avanzado`
                      : 'Nivel máximo alcanzado'}
                  </p>
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="font-medium mb-3">Habilidades Desarrolladas</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { name: 'Coordinación', value: Math.min(child.progress + 10, 100) },
                      { name: 'Flexibilidad', value: Math.min(child.progress + 5, 100) },
                      { name: 'Equilibrio', value: Math.min(child.progress - 5, 100) },
                      { name: 'Fuerza', value: Math.min(child.progress - 10, 100) },
                    ].map((skill) => (
                      <div key={skill.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{skill.name}</span>
                          <span className="font-medium">{Math.max(skill.value, 0)}%</span>
                        </div>
                        <Progress value={Math.max(skill.value, 0)} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </motion.div>
        )
      })}
    </div>
  )
}

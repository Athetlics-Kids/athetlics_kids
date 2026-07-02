'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Check, X, Save, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { DashboardCard, LevelBadge, NoClasses } from '@/components/dashboard'
import { formatDate } from '@/lib/locale'
import { cn } from '@/lib/utils'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchClassSessions, fetchStudents } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'

interface AttendanceState {
  [studentId: string]: {
    present: boolean | null
    notes: string
  }
}

export default function TeacherAttendancePage() {
  const user = useRequireRole('teacher')
  const { data: classSessions = [] } = useSupabaseLoader((client) => fetchClassSessions(client))
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))

  const todayClasses = user.teacherId
    ? classSessions.filter((c) => c.teacherId === user.teacherId && c.status === 'scheduled')
    : []

  const [selectedClass, setSelectedClass] = useState(todayClasses[0] || null)
  const [attendance, setAttendance] = useState<AttendanceState>({})

  const classStudents = selectedClass
    ? students.filter((s) => selectedClass.students.includes(s.id))
    : []

  const markAttendance = (studentId: string, present: boolean) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        present,
        notes: prev[studentId]?.notes || '',
      },
    }))
  }

  const updateNotes = (studentId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        present: prev[studentId]?.present ?? null,
        notes,
      },
    }))
  }

  const saveAttendance = () => {
    console.log('Saving attendance:', attendance)
    // Here you would save to the database
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Registro de Asistencia</h1>
          <p className="text-muted-foreground">
            {formatDate(new Date(), 'PPPP')}
          </p>
        </div>
      </div>

      {/* Class Selector */}
      <DashboardCard
        title="Seleccionar Clase"
        description="Elige la clase para tomar asistencia"
      >
        <div className="flex flex-wrap gap-2">
          {todayClasses.length > 0 ? (
            todayClasses.map((session) => (
              <Button
                key={session.id}
                variant={selectedClass?.id === session.id ? 'default' : 'outline'}
                onClick={() => setSelectedClass(session)}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                {session.startTime} - {session.title}
              </Button>
            ))
          ) : (
            <p className="text-muted-foreground">No hay clases programadas para hoy</p>
          )}
        </div>
      </DashboardCard>

      {/* Attendance List */}
      {selectedClass && (
        <DashboardCard
          title={selectedClass.title}
          description={`${selectedClass.startTime} - ${selectedClass.endTime}`}
          action={
            <div className="flex items-center gap-2">
              <LevelBadge level={selectedClass.level} />
              <Badge variant="secondary">
                {classStudents.length} alumnos
              </Badge>
            </div>
          }
        >
          <div className="space-y-4">
            {classStudents.map((student, i) => {
              const studentAttendance = attendance[student.id]
              const isPresent = studentAttendance?.present

              return (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    'rounded-xl border p-4 transition-colors',
                    isPresent === true && 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10',
                    isPresent === false && 'border-red-500/50 bg-red-50/50 dark:bg-red-900/10',
                    isPresent === null || isPresent === undefined && 'border-border'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {student.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {student.age} años • {student.level}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={isPresent === true ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          isPresent === true && 'bg-green-600 hover:bg-green-700'
                        )}
                        onClick={() => markAttendance(student.id, true)}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Presente
                      </Button>
                      <Button
                        variant={isPresent === false ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          isPresent === false && 'bg-red-600 hover:bg-red-700'
                        )}
                        onClick={() => markAttendance(student.id, false)}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Ausente
                      </Button>
                    </div>
                  </div>
                  {isPresent === false && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4"
                    >
                      <Textarea
                        placeholder="Notas sobre la ausencia..."
                        value={studentAttendance?.notes || ''}
                        onChange={(e) => updateNotes(student.id, e.target.value)}
                        className="resize-none"
                        rows={2}
                      />
                    </motion.div>
                  )}
                </motion.div>
              )
            })}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={saveAttendance} size="lg">
                <Save className="mr-2 h-4 w-4" />
                Guardar Asistencia
              </Button>
            </div>
          </div>
        </DashboardCard>
      )}
    </div>
  )
}

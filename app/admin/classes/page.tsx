'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  User,
  X,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LevelBadge, NoClasses } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchClassSessions, fetchTeachers } from '@/lib/supabase/data'
import { formatDate } from '@/lib/locale'
import {
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { cn } from '@/lib/utils'
import type { ClassSession } from '@/types'

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

export default function ClassesPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null)
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const { data: classSessions = [] } = useSupabaseLoader((client) => fetchClassSessions(client))
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const filteredSessions = filterTeacher === 'all'
    ? classSessions
    : classSessions.filter((s) => s.teacherId === filterTeacher)

  const getClassesForDayAndTime = (day: Date, time: string) => {
    return filteredSessions.filter(
      (session) =>
        isSameDay(session.date, day) && session.startTime === time
    )
  }

  const getStatusColor = (session: ClassSession) => {
    const percentage = (session.enrolled / session.capacity) * 100
    if (percentage >= 90) return 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
    if (percentage >= 70) return 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
    return 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservas de Clases</h1>
          <p className="text-muted-foreground">
            Gestiona el calendario y las reservaciones
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Clase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Nueva Clase</DialogTitle>
              <DialogDescription>
                Programa una nueva clase en el calendario
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Nombre de la clase</Label>
                <Input id="title" placeholder="Gimnasia Artística - Principiantes" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input id="date" type="date" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="time">Hora</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teacher">Profesor</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar profesor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.filter((t) => t.isActive).map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacidad máxima</Label>
                  <Input id="capacity" type="number" placeholder="12" min={1} max={30} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="level">Nivel</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Principiante</SelectItem>
                      <SelectItem value="intermediate">Intermedio</SelectItem>
                      <SelectItem value="advanced">Avanzado</SelectItem>
                      <SelectItem value="baby">Bebés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Crear Clase
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar Controls */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-4"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div>
            <h2 className="text-sm font-semibold sm:text-base">
              {formatDate(weekStart, "d 'de' MMMM")} -{' '}
              {formatDate(addDays(weekStart, 6), "d 'de' MMMM, yyyy")}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label className="text-sm shrink-0">Filtrar por profesor:</Label>
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los profesores</SelectItem>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span>Disponible (&lt;70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <span>Casi lleno (70-90%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span>Lleno (&gt;90%)</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
        {/* Days Header */}
        <div className="grid min-w-[720px] grid-cols-8 border-b border-border">
          <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r border-border">
            Hora
          </div>
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'p-3 text-center border-r border-border last:border-r-0',
                isSameDay(day, new Date()) && 'bg-primary/5'
              )}
            >
              <p className="text-sm font-medium">{formatDate(day, 'EEE')}</p>
              <p
                className={cn(
                  'text-2xl font-bold',
                  isSameDay(day, new Date()) && 'text-primary'
                )}
              >
                {formatDate(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="max-h-[600px] overflow-y-auto">
          {timeSlots.map((time) => (
            <div key={time} className="grid min-w-[720px] grid-cols-8 border-b border-border last:border-b-0">
              <div className="p-2 text-center text-sm text-muted-foreground border-r border-border flex items-center justify-center">
                {time}
              </div>
              {weekDays.map((day) => {
                const classes = getClassesForDayAndTime(day, time)
                return (
                  <div
                    key={`${day.toISOString()}-${time}`}
                    className={cn(
                      'min-h-[80px] p-1 border-r border-border last:border-r-0',
                      isSameDay(day, new Date()) && 'bg-primary/5'
                    )}
                  >
                    {classes.map((session) => (
                      <motion.button
                        key={session.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedClass(session)}
                        className={cn(
                          'w-full p-2 rounded-lg text-left text-xs border transition-colors',
                          getStatusColor(session)
                        )}
                      >
                        <p className="font-medium truncate">{session.title}</p>
                        <p className="text-muted-foreground truncate">
                          {session.teacherName}
                        </p>
                        <p className="mt-1">
                          {session.enrolled}/{session.capacity}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        </div>
      </motion.div>

      {/* Class Detail Modal */}
      <AnimatePresence>
        {selectedClass && (
          <Dialog open={!!selectedClass} onOpenChange={() => setSelectedClass(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedClass.title}</DialogTitle>
                <DialogDescription>
                  Detalles de la clase y reservaciones
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Profesor</p>
                    <p className="font-medium">{selectedClass.teacherName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                    <CalendarIcon className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fecha y hora</p>
                    <p className="font-medium">
                      {formatDate(selectedClass.date, 'PPPP')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedClass.startTime} - {selectedClass.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Capacidad</p>
                    <p className="font-medium">
                      {selectedClass.enrolled} de {selectedClass.capacity} alumnos
                    </p>
                    <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${(selectedClass.enrolled / selectedClass.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LevelBadge level={selectedClass.level} />
                  <Badge variant={selectedClass.status === 'scheduled' ? 'default' : 'secondary'}>
                    {selectedClass.status === 'scheduled' ? 'Programada' : selectedClass.status}
                  </Badge>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" className="w-full sm:w-auto">
                  Reagendar
                </Button>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Cancelar Clase
                </Button>
                <Button className="w-full sm:w-auto">
                  Ver Alumnos
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
}

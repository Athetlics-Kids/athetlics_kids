'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  User,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  fetchAcademySettings,
  fetchClassSessions,
  fetchStudentLevels,
  fetchTeachers,
} from '@/lib/supabase/data'
import { formatCurrency, formatDate, toInputDate } from '@/lib/locale'
import type { ClassLocation, ClassSession } from '@/types'
import {
  startOfWeek,
  addDays,
  isSameDay,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { cn } from '@/lib/utils'
import {
  assignTeacherToClass,
  createClassSession,
  createOneOffClass,
  deleteClassSession,
  markTeacherClassPaid,
  updateClassSession,
} from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/client'
import { fetchStudents } from '@/lib/supabase/data'

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00',
]

type ClassForm = {
  title: string
  classDate: string
  startTime: string
  teacherId: string
  studentId: string
  capacity: string
  level: string
  locationType: ClassLocation
  address: string
}

const emptyForm: ClassForm = {
  title: '',
  classDate: '',
  startTime: '',
  teacherId: '',
  studentId: '',
  capacity: '12',
  level: '',
  locationType: 'local',
  address: '',
}

export default function ClassesPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null)
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isOneOffOpen, setIsOneOffOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ClassForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [assignTeacherId, setAssignTeacherId] = useState('')

  const [oneOff, setOneOff] = useState({
    studentId: '',
    classDate: '',
    startTime: '09:00',
    teacherId: 'none',
    locationType: 'local' as ClassLocation,
    address: '',
  })

  const { data: classSessions = [], refetch } = useSupabaseLoader((client) =>
    fetchClassSessions(client)
  )
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: levels = [] } = useSupabaseLoader((client) =>
    fetchStudentLevels(client, { activeOnly: true })
  )
  const { data: rates } = useSupabaseLoader((client) => fetchAcademySettings(client))

  const previewFee =
    form.teacherId && form.teacherId !== 'none'
      ? form.locationType === 'domicilio'
        ? (rates?.rateDomicilio ?? 50_000)
        : (rates?.rateLocal ?? 30_000)
      : 0

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const unassignedCount = classSessions.filter(
    (s) => !s.teacherId || s.teacherName === 'Sin profesor'
  ).length

  const filteredSessions = classSessions.filter((s) => {
    if (filterTeacher === 'unassigned') {
      return !s.teacherId || s.teacherName === 'Sin profesor'
    }
    if (filterTeacher === 'one_off') return s.classKind === 'one_off'
    if (filterTeacher === 'all') return true
    return s.teacherId === filterTeacher
  })

  const getClassesForDayAndTime = (day: Date, time: string) => {
    return filteredSessions.filter(
      (session) => isSameDay(session.date, day) && session.startTime === time
    )
  }

  const getStatusColor = (session: ClassSession) => {
    if (session.teacherPaidAt) {
      return 'bg-emerald-600/20 border-emerald-600/50 text-emerald-900 hover:bg-emerald-600/30 dark:text-emerald-100'
    }
    const percentage = (session.enrolled / session.capacity) * 100
    if (percentage >= 90) return 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
    if (percentage >= 70) return 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
    return 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({
      ...emptyForm,
      classDate: new Date().toISOString().slice(0, 10),
      level: levels[0]?.label ?? 'Principiante',
      locationType: 'local',
      studentId: '',
      address: '',
    })
    setIsAddDialogOpen(true)
  }

  const openReschedule = (session: ClassSession) => {
    setEditingId(session.id)
    setForm({
      title: session.title,
      classDate: toInputDate(session.date),
      startTime: session.startTime,
      teacherId: session.teacherId || 'none',
      studentId: session.studentId || '',
      capacity: String(session.capacity),
      level: session.level,
      locationType: session.locationType || 'local',
      address: session.address ?? '',
    })
    setSelectedClass(null)
    setIsAddDialogOpen(true)
  }

  const applyStudentToForm = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) {
      setForm((f) => ({ ...f, studentId }))
      return
    }
    setForm((f) => ({
      ...f,
      studentId,
      title: `${student.name} · clase`,
      level: student.level || f.level,
      teacherId: student.teacherId || f.teacherId || 'none',
      address: student.address ?? '',
      capacity: '1',
    }))
  }

  const handleSave = async () => {
    if (!form.classDate || !form.startTime || !form.level) {
      toast.error('Completa fecha, hora y nivel')
      return
    }
    if (!editingId && !form.studentId) {
      toast.error('Selecciona el alumno de la clase')
      return
    }
    if (form.locationType === 'domicilio') {
      const student = students.find((s) => s.id === form.studentId)
      const address = form.address.trim() || student?.address?.trim() || ''
      if (!address) {
        toast.error('El alumno no tiene dirección. Agrégala en Alumnos o escríbela aquí.')
        return
      }
    }

    setSaving(true)
    const client = createClient()
    const teacherId =
      !form.teacherId || form.teacherId === 'none' ? null : form.teacherId
    const student = students.find((s) => s.id === form.studentId)
    const address =
      form.locationType === 'domicilio'
        ? form.address.trim() || student?.address?.trim() || null
        : null
    const title =
      form.title.trim() ||
      (student ? `${student.name} · clase` : 'Clase')

    const payload = {
      title,
      teacherId,
      classDate: form.classDate,
      startTime: form.startTime,
      capacity: Number(form.capacity) || (form.studentId ? 1 : 12),
      level: form.level,
      locationType: form.locationType,
      address,
      teacherFee: teacherId ? previewFee : 0,
      classKind: 'plan' as const,
      studentId: form.studentId || undefined,
    }

    if (editingId) {
      const result = await updateClassSession(client, editingId, payload)
      setSaving(false)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success('Clase actualizada / reagendada')
    } else {
      const result = await createClassSession(client, payload)
      if (!result.ok) {
        setSaving(false)
        toast.error(result.error)
        return
      }
      if (form.studentId) {
        const { error: enrErr } = await client.from('class_enrollments').insert({
          class_session_id: result.data.id,
          student_id: form.studentId,
          status: 'reserved',
        })
        if (enrErr) {
          setSaving(false)
          toast.error(enrErr.message)
          return
        }
      }
      setSaving(false)
      toast.success('Clase creada')
    }

    setIsAddDialogOpen(false)
    refetch()
  }

  const handleAssignTeacher = async () => {
    if (!selectedClass || !assignTeacherId) {
      toast.error('Selecciona un profesor')
      return
    }
    const result = await assignTeacherToClass(
      createClient(),
      selectedClass.id,
      assignTeacherId,
      selectedClass.locationType
    )
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Profesor asignado')
    setSelectedClass(null)
    setAssignTeacherId('')
    refetch()
  }

  const handleOneOff = async () => {
    if (!oneOff.studentId || !oneOff.classDate || !oneOff.startTime) {
      toast.error('Completa alumno, fecha y hora')
      return
    }
    const student = students.find((s) => s.id === oneOff.studentId)
    const address = student?.address?.trim() || ''
    if (oneOff.locationType === 'domicilio' && !address) {
      toast.error('Ese alumno no tiene dirección. Agrégala en Alumnos primero.')
      return
    }
    setSaving(true)
    const result = await createOneOffClass(createClient(), {
      studentId: oneOff.studentId,
      classDate: oneOff.classDate,
      startTime: oneOff.startTime,
      teacherId: oneOff.teacherId === 'none' ? null : oneOff.teacherId || student?.teacherId || null,
      locationType: oneOff.locationType,
      address: oneOff.locationType === 'domicilio' ? address : undefined,
    })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Clase única creada')
    setIsOneOffOpen(false)
    refetch()
  }

  const handleCancelClass = async (session: ClassSession) => {
    if (!confirm(`¿Cancelar la clase "${session.title}"?`)) return
    const result = await updateClassSession(createClient(), session.id, {
      status: 'cancelled',
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Clase cancelada')
    setSelectedClass(null)
    refetch()
  }

  const handleDeleteClass = async (session: ClassSession) => {
    if (!confirm(`¿Eliminar permanentemente la clase "${session.title}"?`)) return
    const result = await deleteClassSession(createClient(), session.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Clase eliminada')
    setSelectedClass(null)
    refetch()
  }

  const isClassExecuted = (session: ClassSession) => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const classStr = toInputDate(session.date)
    return classStr < todayStr
  }

  const handleMarkTeacherPaid = async (session: ClassSession) => {
    if (
      !confirm(
        `¿Marcar como pagado al profesor ${session.teacherName} por ${formatCurrency(session.teacherFee)}?`
      )
    ) {
      return
    }
    const result = await markTeacherClassPaid(createClient(), session.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(`Pagado: ${formatCurrency(result.data.amount)} — se descontó del saldo pendiente`)
    setSelectedClass(null)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservas de Clases</h1>
          <p className="text-muted-foreground">
            Gestiona el calendario y las reservaciones
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => {
            setOneOff({
              studentId: '',
              classDate: new Date().toISOString().slice(0, 10),
              startTime: '09:00',
              teacherId: 'none',
              locationType: 'local',
              address: '',
            })
            setIsOneOffOpen(true)
          }}>
            Clase única
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Clase
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar / Reagendar Clase' : 'Crear Nueva Clase'}</DialogTitle>
              <DialogDescription>
                {editingId
                  ? 'Actualiza fecha, hora o modalidad'
                  : 'Asigna el alumno que requiere la clase'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!editingId && (
                <div className="grid gap-2">
                  <Label>Alumno</Label>
                  <Select value={form.studentId || undefined} onValueChange={applyStudentToForm}>
                    <SelectTrigger>
                      <SelectValue placeholder="¿Quién requiere la clase?" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="title">Nombre de la clase</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Se completa con el nombre del alumno"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.classDate}
                    onChange={(e) => setForm((f) => ({ ...f, classDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Hora</Label>
                  <Select
                    value={form.startTime}
                    onValueChange={(value) => setForm((f) => ({ ...f, startTime: value }))}
                  >
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
                <Label>Modalidad</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={form.locationType === 'local' ? 'default' : 'outline'}
                    onClick={() => setForm((f) => ({ ...f, locationType: 'local' }))}
                  >
                    Local
                  </Button>
                  <Button
                    type="button"
                    variant={form.locationType === 'domicilio' ? 'default' : 'outline'}
                    onClick={() => {
                      const student = students.find((s) => s.id === form.studentId)
                      setForm((f) => ({
                        ...f,
                        locationType: 'domicilio',
                        address: student?.address ?? f.address,
                      }))
                    }}
                  >
                    Domicilio
                  </Button>
                </div>
                {form.locationType === 'domicilio' && (
                  <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <p className="text-muted-foreground">Dirección del alumno</p>
                    <p className="font-medium">
                      {form.address ||
                        students.find((s) => s.id === form.studentId)?.address ||
                        'Sin dirección — edítala en Alumnos'}
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Tarifa profesor:{' '}
                  <strong>{formatCurrency(previewFee)}</strong>
                  {form.locationType === 'domicilio' ? ' (domicilio)' : ' (local)'}
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Profesor (opcional)</Label>
                <Select
                  value={form.teacherId || 'none'}
                  onValueChange={(value) => setForm((f) => ({ ...f, teacherId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin profesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin profesor — asignar después</SelectItem>
                    {teachers
                      .filter((t) => t.isActive)
                      .map((teacher) => (
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
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    max={30}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nivel</Label>
                  <Select
                    value={form.level}
                    onValueChange={(value) => setForm((f) => ({ ...f, level: value }))}
                    disabled={levels.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          levels.length === 0
                            ? 'Sin niveles — Configuración'
                            : 'Nivel'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.id} value={level.label}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {levels.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Configura niveles en Configuración → Niveles
                    </p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear Clase'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Dialog open={isOneOffOpen} onOpenChange={setIsOneOffOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Clase única</DialogTitle>
            <DialogDescription>
              Agenda una sola clase en un día específico (sin plan mensual)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Alumno</Label>
              <Select
                value={oneOff.studentId}
                onValueChange={(v) => {
                  const student = students.find((s) => s.id === v)
                  setOneOff((o) => ({
                    ...o,
                    studentId: v,
                    address: student?.address ?? '',
                    teacherId: student?.teacherId || o.teacherId || 'none',
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar alumno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={oneOff.classDate}
                  onChange={(e) => setOneOff((o) => ({ ...o, classDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={oneOff.startTime}
                  onChange={(e) => setOneOff((o) => ({ ...o, startTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Modalidad</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={oneOff.locationType === 'local' ? 'default' : 'outline'}
                  onClick={() => setOneOff((o) => ({ ...o, locationType: 'local' }))}
                >
                  Local
                </Button>
                <Button
                  type="button"
                  variant={oneOff.locationType === 'domicilio' ? 'default' : 'outline'}
                  onClick={() => {
                    const student = students.find((s) => s.id === oneOff.studentId)
                    setOneOff((o) => ({
                      ...o,
                      locationType: 'domicilio',
                      address: student?.address ?? '',
                    }))
                  }}
                >
                  Domicilio
                </Button>
              </div>
            </div>
            {oneOff.locationType === 'domicilio' && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p className="text-muted-foreground">Dirección del alumno</p>
                <p className="font-medium">
                  {students.find((s) => s.id === oneOff.studentId)?.address ||
                    'Sin dirección — agrégala en Alumnos'}
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Profesor (opcional)</Label>
              <Select
                value={oneOff.teacherId}
                onValueChange={(v) => setOneOff((o) => ({ ...o, teacherId: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin profesor</SelectItem>
                  {teachers
                    .filter((t) => t.isActive)
                    .map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOneOffOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOneOff} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear clase única'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          <Label className="text-sm shrink-0">Filtrar:</Label>
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las clases</SelectItem>
              <SelectItem value="unassigned">
                Sin profesor{unassignedCount ? ` (${unassignedCount})` : ''}
              </SelectItem>
              <SelectItem value="one_off">Solo clases únicas</SelectItem>
              {teachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-emerald-600/50" />
          <span>Pagada al profesor</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-500/30" />
          <span>Disponible</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-yellow-500/30" />
          <span>Casi lleno</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-red-500/30" />
          <span>Lleno</span>
        </div>
      </div>

      {filteredSessions.length === 0 && (
        <NoClasses onAdd={openCreate} />
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-8 border-b border-border bg-muted/50">
            <div className="p-3 text-center text-sm font-medium border-r border-border" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  'p-3 text-center border-r border-border last:border-r-0',
                  isSameDay(day, new Date()) && 'bg-primary/10'
                )}
              >
                <p className="text-sm font-medium">{formatDate(day, 'EEE')}</p>
                <p
                  className={cn(
                    'text-lg font-bold',
                    isSameDay(day, new Date()) && 'text-primary'
                  )}
                >
                  {formatDate(day, 'd')}
                </p>
              </div>
            ))}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {timeSlots.map((time) => (
              <div
                key={time}
                className="grid min-w-[720px] grid-cols-8 border-b border-border last:border-b-0"
              >
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
                            'w-full p-2 rounded-lg text-left text-xs border transition-colors mb-1',
                            session.status === 'cancelled'
                              ? 'bg-muted opacity-60'
                              : getStatusColor(session)
                          )}
                        >
                          <p className="font-medium truncate">{session.title}</p>
                          <p className="text-muted-foreground truncate">
                            {session.teacherName}
                          </p>
                          {session.locationType === 'domicilio' && (
                            <p className="mt-0.5 truncate text-[10px] text-amber-700 dark:text-amber-400">
                              {session.address || 'Domicilio · sin dirección'}
                            </p>
                          )}
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
                    <p className="font-medium">{formatDate(selectedClass.date, 'PPPP')}</p>
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
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LevelBadge level={selectedClass.level} />
                  <Badge
                    variant={
                      selectedClass.status === 'scheduled' ? 'default' : 'secondary'
                    }
                  >
                    {selectedClass.status === 'scheduled'
                      ? 'Programada'
                      : selectedClass.status === 'cancelled'
                        ? 'Cancelada'
                        : 'Completada'}
                  </Badge>
                  <Badge variant="outline">
                    {selectedClass.locationType === 'domicilio' ? 'Domicilio' : 'Local'}
                  </Badge>
                  {selectedClass.classKind === 'one_off' && (
                    <Badge variant="secondary">Clase única</Badge>
                  )}
                </div>
                {selectedClass.locationType === 'domicilio' && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20">
                    <p className="text-muted-foreground">Dirección</p>
                    <p className="font-medium">
                      {selectedClass.address || 'Sin dirección registrada'}
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ganancia profesor</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedClass.teacherFee ?? 0)}
                    </span>
                  </div>
                  {selectedClass.teacherPaidAt ? (
                    <Badge className="bg-green-600 hover:bg-green-600">Pagado al profesor</Badge>
                  ) : isClassExecuted(selectedClass) &&
                    selectedClass.teacherId &&
                    selectedClass.status !== 'cancelled' ? (
                    <p className="text-xs text-amber-600">Pendiente de pago al profesor</p>
                  ) : null}
                </div>
                {(!selectedClass.teacherId ||
                  selectedClass.teacherName === 'Sin profesor') && (
                  <div className="grid gap-2 rounded-lg border border-dashed border-border p-3">
                    <Label>Asignar profesor</Label>
                    <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir profesor" />
                      </SelectTrigger>
                      <SelectContent>
                        {teachers
                          .filter((t) => t.isActive)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleAssignTeacher}>
                      Asignar
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 flex-wrap">
                {selectedClass.teacherId &&
                  selectedClass.status !== 'cancelled' &&
                  !selectedClass.teacherPaidAt &&
                  isClassExecuted(selectedClass) &&
                  (selectedClass.teacherFee ?? 0) > 0 && (
                    <Button
                      className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                      onClick={() => handleMarkTeacherPaid(selectedClass)}
                    >
                      Pagado
                    </Button>
                  )}
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => openReschedule(selectedClass)}
                >
                  Reagendar
                </Button>
                {selectedClass.status === 'scheduled' && (
                  <Button
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => handleCancelClass(selectedClass)}
                  >
                    Cancelar Clase
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full sm:w-auto text-destructive"
                  onClick={() => handleDeleteClass(selectedClass)}
                >
                  Eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  )
}

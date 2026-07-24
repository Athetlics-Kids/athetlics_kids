'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ColumnDef } from '@tanstack/react-table'
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Filter, CalendarX } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  DataTable,
  PaymentStatusBadge,
  PlanTypeBadge,
  NoStudents,
  TableRowSkeleton,
} from '@/components/dashboard'
import type { Student } from '@/types'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import {
  fetchParents,
  fetchPlanConfigs,
  fetchStudentLevels,
  fetchStudents,
  fetchTeachers,
} from '@/lib/supabase/data'
import {
  createParent,
  createStudent,
  deleteAllStudentClasses,
  deleteStudent,
  updateStudent,
} from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/client'
import { formatPlanConfigLabel, PHONE_PLACEHOLDER } from '@/lib/locale'

type StudentForm = {
  name: string
  age: string
  level: string
  address: string
  parentId: string
  teacherId: string
  planConfigId: string
  newParentName: string
  newParentEmail: string
  newParentPhone: string
  createNewParent: boolean
}

const emptyForm: StudentForm = {
  name: '',
  age: '',
  level: '',
  address: '',
  parentId: '',
  teacherId: '',
  planConfigId: '',
  newParentName: '',
  newParentEmail: '',
  newParentPhone: '',
  createNewParent: false,
}

export default function StudentsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: students = [], loading, refetch } = useSupabaseLoader((client) =>
    fetchStudents(client)
  )
  const { data: teachers = [], refetch: refetchTeachers } = useSupabaseLoader((client) =>
    fetchTeachers(client)
  )
  const { data: parents = [], refetch: refetchParents } = useSupabaseLoader((client) =>
    fetchParents(client)
  )
  const { data: levels = [] } = useSupabaseLoader((client) =>
    fetchStudentLevels(client, { activeOnly: true })
  )
  const { data: plans = [] } = useSupabaseLoader((client) =>
    fetchPlanConfigs(client, { activeOnly: true })
  )

  const filteredStudents =
    filterStatus === 'all'
      ? students
      : students.filter((s) => s.paymentStatus === filterStatus)

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      level: levels[0]?.label ?? 'Principiante',
      planConfigId: plans[0]?.id ?? '',
    })
    setIsDialogOpen(true)
  }

  const openEdit = (student: Student) => {
    const matchedPlan =
      plans.find((p) => p.planType === student.planType) ?? plans[0]
    setEditing(student)
    setForm({
      name: student.name,
      age: String(student.age),
      level: student.level,
      address: student.address ?? '',
      parentId: student.parentId,
      teacherId: student.teacherId,
      planConfigId: matchedPlan?.id ?? '',
      newParentName: '',
      newParentEmail: '',
      newParentPhone: '',
      createNewParent: false,
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    const age = Number(form.age)
    const selectedPlan = plans.find((p) => p.id === form.planConfigId)
    if (!form.name.trim() || !age || !form.teacherId || !selectedPlan || !form.level) {
      toast.error('Completa los campos obligatorios')
      return
    }

    setSaving(true)
    const client = createClient()
    let parentId = form.parentId

    if (form.createNewParent) {
      if (!form.newParentName.trim() || !form.newParentEmail.trim() || !form.newParentPhone.trim()) {
        toast.error('Completa los datos del padre/tutor')
        setSaving(false)
        return
      }
      const parentResult = await createParent(client, {
        name: form.newParentName,
        email: form.newParentEmail,
        phone: form.newParentPhone,
      })
      if (!parentResult.ok) {
        toast.error(parentResult.error)
        setSaving(false)
        return
      }
      parentId = parentResult.data.id
    }

    if (!parentId) {
      toast.error('Selecciona o crea un padre/tutor')
      setSaving(false)
      return
    }

    const payload = {
      name: form.name,
      age,
      parentId,
      teacherId: form.teacherId,
      planType: selectedPlan.planType,
      planConfigId: selectedPlan.id,
      level: form.level,
      address: form.address.trim() || undefined,
    }

    const result = editing
      ? await updateStudent(client, editing.id, {
          ...payload,
          paymentStatus: editing.paymentStatus,
          progress: editing.progress,
        })
      : await createStudent(client, payload)

    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(
      editing
        ? 'Alumno actualizado'
        : result.data && 'paymentId' in result.data && result.data.paymentId
          ? 'Alumno creado con pago pendiente del plan'
          : 'Alumno creado'
    )
    setIsDialogOpen(false)
    refetch()
    refetchParents()
    refetchTeachers()
  }

  const handleDelete = async (student: Student) => {
    if (!confirm(`¿Eliminar a ${student.name}?`)) return
    const result = await deleteStudent(createClient(), student.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Alumno eliminado')
    refetch()
  }

  const handleDeleteAllClasses = async (student: Student) => {
    if (
      !confirm(
        `¿Eliminar TODAS las clases de ${student.name}?\nPodrás volver a agendarlas desde Pagos.`
      )
    ) {
      return
    }
    const result = await deleteAllStudentClasses(createClient(), student.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      result.data.count === 0
        ? 'No había clases para eliminar'
        : `Se eliminaron ${result.data.count} clase(s)`
    )
  }

  const columns: ColumnDef<Student>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Alumno',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={row.original.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {row.original.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.original.name}</p>
              <p className="text-sm text-muted-foreground">{row.original.age} años</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'parentName',
        header: 'Padre/Tutor',
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.parentName}</span>
        ),
      },
      {
        accessorKey: 'teacherName',
        header: 'Profesor',
        cell: ({ row }) => row.original.teacherName,
      },
      {
        accessorKey: 'level',
        header: 'Nivel',
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {row.original.level}
          </span>
        ),
      },
      {
        accessorKey: 'planType',
        header: 'Plan',
        cell: ({ row }) => <PlanTypeBadge plan={row.original.planType} />,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Estado de Pago',
        cell: ({ row }) => <PaymentStatusBadge status={row.original.paymentStatus} />,
      },
      {
        accessorKey: 'progress',
        header: 'Progreso',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${row.original.progress}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground">{row.original.progress}%</span>
          </div>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/admin/students/${row.original.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver detalle
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDeleteAllClasses(row.original)}>
                <CalendarX className="mr-2 h-4 w-4" />
                Eliminar todas las clases
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar alumno
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [levels, plans]
  )

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gestión de Alumnos</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Administra los alumnos de tu academia
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Alumno
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Alumno' : 'Agregar Nuevo Alumno'}</DialogTitle>
            <DialogDescription>
              Completa la información del alumno
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del alumno"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Calle, barrio, ciudad (para clases a domicilio)"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="age">Edad</Label>
                <Input
                  id="age"
                  type="number"
                  min={3}
                  max={18}
                  value={form.age}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                  placeholder="5"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Nivel</Label>
                  <Link
                    href="/admin/settings"
                    className="text-xs text-primary hover:underline"
                  >
                    Gestionar niveles
                  </Link>
                </div>
                <Select
                  value={form.level}
                  onValueChange={(value) => setForm((f) => ({ ...f, level: value }))}
                  disabled={levels.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        levels.length === 0
                          ? 'Sin niveles — créalos en Configuración'
                          : 'Seleccionar nivel'
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
                    Los niveles se definen en{' '}
                    <Link href="/admin/settings" className="text-primary hover:underline">
                      Configuración → Niveles
                    </Link>
                    . Si la lista está vacía, ejecuta la migración SQL de planes/niveles en Supabase.
                  </p>
                )}
              </div>
            </div>

            {!editing && (
              <div className="flex items-center gap-2">
                <input
                  id="new-parent"
                  type="checkbox"
                  checked={form.createNewParent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, createNewParent: e.target.checked }))
                  }
                />
                <Label htmlFor="new-parent">Crear padre/tutor nuevo</Label>
              </div>
            )}

            {form.createNewParent && !editing ? (
              <div className="grid gap-3 rounded-lg border border-border p-3">
                <div className="grid gap-2">
                  <Label>Nombre del padre/tutor</Label>
                  <Input
                    value={form.newParentName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newParentName: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.newParentEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newParentEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={form.newParentPhone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, newParentPhone: e.target.value }))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Padre/Tutor</Label>
                <Select
                  value={form.parentId}
                  onValueChange={(value) => setForm((f) => ({ ...f, parentId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar padre" />
                  </SelectTrigger>
                  <SelectContent>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Profesor asignado</Label>
              <Select
                value={form.teacherId}
                onValueChange={(value) => setForm((f) => ({ ...f, teacherId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar profesor" />
                </SelectTrigger>
                <SelectContent>
                  {teachers
                    .filter((t) => t.isActive)
                    .map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.specialty}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Tipo de plan</Label>
              <Select
                value={form.planConfigId}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, planConfigId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {formatPlanConfigLabel(plan.label, plan.price, plan.classesPerWeek)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar Alumno'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por estado:</span>
        </div>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'paid', label: 'Pagado' },
          { value: 'pending', label: 'Pendiente' },
          { value: 'overdue', label: 'Vencido' },
        ].map((filter) => (
          <Button
            key={filter.value}
            variant={filterStatus === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Alumnos</p>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pagados</p>
          <p className="text-2xl font-bold text-green-600">
            {students.filter((s) => s.paymentStatus === 'paid').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">
            {students.filter((s) => s.paymentStatus === 'pending').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">
            {students.filter((s) => s.paymentStatus === 'overdue').length}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border bg-card"
      >
        <DataTable
          columns={columns}
          data={filteredStudents}
          searchKey="name"
          searchPlaceholder="Buscar alumnos..."
        />
        {filteredStudents.length === 0 && <NoStudents onAdd={openCreate} />}
      </motion.div>
    </div>
  )
}

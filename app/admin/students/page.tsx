'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  FileDown,
  Filter,
} from 'lucide-react'
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
import { DataTable, PaymentStatusBadge, PlanTypeBadge, NoStudents, TableRowSkeleton } from '@/components/dashboard'
import type { Student } from '@/types'
import Link from 'next/link'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchParents, fetchStudents, fetchTeachers } from '@/lib/supabase/data'
import { formatPlanLabel } from '@/lib/locale'

const columns: ColumnDef<Student>[] = [
  {
    accessorKey: 'name',
    header: 'Alumno',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={row.original.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {row.original.name.split(' ').map(n => n[0]).join('')}
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
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

export default function StudentsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const { data: students = [], loading } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))
  const { data: parents = [] } = useSupabaseLoader((client) => fetchParents(client))

  const filteredStudents = filterStatus === 'all'
    ? students
    : students.filter(s => s.paymentStatus === filterStatus)

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
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gestión de Alumnos</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Administra los alumnos de tu academia
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full sm:w-auto">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Alumno
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Alumno</DialogTitle>
                <DialogDescription>
                  Completa la información del nuevo alumno
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" placeholder="Nombre del alumno" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="age">Edad</Label>
                    <Input id="age" type="number" placeholder="5" min={3} max={18} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="level">Nivel</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Principiante</SelectItem>
                        <SelectItem value="intermediate">Intermedio</SelectItem>
                        <SelectItem value="advanced">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="parent">Padre/Tutor</Label>
                  <Select>
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
                <div className="grid gap-2">
                  <Label htmlFor="teacher">Profesor asignado</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar profesor" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.filter(t => t.isActive).map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} - {teacher.specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="plan">Tipo de plan</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">{formatPlanLabel('monthly')}</SelectItem>
                      <SelectItem value="quarterly">{formatPlanLabel('quarterly')}</SelectItem>
                      <SelectItem value="semiannual">{formatPlanLabel('semiannual')}</SelectItem>
                      <SelectItem value="annual">{formatPlanLabel('annual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsAddDialogOpen(false)}>
                  Guardar Alumno
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
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

      {/* Stats Summary */}
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
            {students.filter(s => s.paymentStatus === 'paid').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-600">
            {students.filter(s => s.paymentStatus === 'pending').length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Vencidos</p>
          <p className="text-2xl font-bold text-red-600">
            {students.filter(s => s.paymentStatus === 'overdue').length}
          </p>
        </div>
      </motion.div>

      {/* Data Table */}
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
        {filteredStudents.length === 0 && <NoStudents onAdd={() => setIsAddDialogOpen(true)} />}
      </motion.div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Calendar,
  Users,
  Edit,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchTeachers } from '@/lib/supabase/data'
import { createTeacher, deleteTeacher, updateTeacher } from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, PHONE_PLACEHOLDER } from '@/lib/locale'
import type { Teacher } from '@/types'

type TeacherForm = {
  name: string
  email: string
  phone: string
  specialty: string
  isActive: boolean
}

const emptyForm: TeacherForm = {
  name: '',
  email: '',
  phone: '',
  specialty: '',
  isActive: true,
}

export default function TeachersPage() {
  const [showInactive, setShowInactive] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [form, setForm] = useState<TeacherForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const { data: teachers = [], loading, refetch } = useSupabaseLoader((client) =>
    fetchTeachers(client)
  )

  const filteredTeachers = showInactive
    ? teachers
    : teachers.filter((t) => t.isActive)

  const totalProjected = teachers.reduce((sum, t) => sum + t.earningsProjected, 0)
  const totalActual = teachers.reduce((sum, t) => sum + t.earningsActual, 0)
  const totalStudents = teachers.reduce((sum, t) => sum + t.studentsCount, 0)
  const activeTeachers = teachers.filter((t) => t.isActive).length

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher)
    setForm({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      specialty: teacher.specialty,
      isActive: teacher.isActive,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.specialty.trim()) {
      toast.error('Completa todos los campos')
      return
    }

    setSaving(true)
    const client = createClient()
    const result = editing
      ? await updateTeacher(client, editing.id, form)
      : await createTeacher(client, form)
    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(editing ? 'Profesor actualizado' : 'Profesor creado')
    setDialogOpen(false)
    refetch()
  }

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`¿Eliminar a ${teacher.name}?`)) return
    const result = await deleteTeacher(createClient(), teacher.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Profesor eliminado')
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Profesores</h1>
          <p className="text-muted-foreground">
            Administra el equipo de profesores de tu academia
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Profesor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Profesor' : 'Agregar Nuevo Profesor'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Actualiza la información del profesor'
                  : 'Completa la información del nuevo profesor'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre del profesor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="profesor@athletickids.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder={PHONE_PLACEHOLDER}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialty">Especialidad</Label>
                <Input
                  id="specialty"
                  value={form.specialty}
                  onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                  placeholder="Gimnasia Artística"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
                <Label htmlFor="is-active">Profesor activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Guardar Profesor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Profesores</p>
          <p className="text-2xl font-bold">{teachers.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Activos</p>
          <p className="text-2xl font-bold text-green-600">{activeTeachers}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Alumnos</p>
          <p className="text-2xl font-bold text-primary">{totalStudents}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Proyección del mes</p>
          <p className="text-2xl font-bold text-secondary">{formatCurrency(totalProjected)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Saldo pendiente</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalActual)}</p>
        </div>
      </motion.div>

      <div className="flex items-center gap-2">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
        <Label htmlFor="show-inactive">Mostrar profesores inactivos</Label>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando profesores...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeachers.map((teacher, i) => (
            <motion.div
              key={teacher.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card overflow-hidden"
            >
              <div className="relative bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
                <div className="absolute right-4 top-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => openEdit(teacher)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(teacher)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-4 border-background">
                    <AvatarImage src={teacher.avatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {teacher.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{teacher.name}</h3>
                    <p className="text-sm text-muted-foreground">{teacher.specialty}</p>
                    <StatusBadge active={teacher.isActive} />
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{teacher.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{teacher.phone}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Horario</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teacher.schedule.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sin horario</span>
                    ) : (
                      teacher.schedule.map((s, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                      <Users className="h-5 w-5" />
                      {teacher.studentsCount}
                    </div>
                    <p className="text-xs text-muted-foreground">Alumnos</p>
                  </div>
                  <div className="text-center space-y-2">
                    <div>
                      <div className="text-lg font-bold text-secondary">
                        {formatCurrency(teacher.earningsProjected)}
                      </div>
                      <p className="text-xs text-muted-foreground">Proyección</p>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(teacher.earningsActual)}
                      </div>
                      <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

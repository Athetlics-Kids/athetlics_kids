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
  DollarSign,
  Edit,
  Trash2,
} from 'lucide-react'
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
import { StatusBadge, EmptyState } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchTeachers } from '@/lib/supabase/data'
import { formatCurrency, PHONE_PLACEHOLDER } from '@/lib/locale'

export default function TeachersPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(true)
  const { data: teachers = [], loading } = useSupabaseLoader((client) => fetchTeachers(client))

  const filteredTeachers = showInactive
    ? teachers
    : teachers.filter((t) => t.isActive)

  const totalEarnings = teachers.reduce((sum, t) => sum + t.earnings, 0)
  const totalStudents = teachers.reduce((sum, t) => sum + t.studentsCount, 0)
  const activeTeachers = teachers.filter((t) => t.isActive).length

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Profesores</h1>
          <p className="text-muted-foreground">
            Administra el equipo de profesores de tu academia
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Profesor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Profesor</DialogTitle>
              <DialogDescription>
                Completa la información del nuevo profesor
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input id="name" placeholder="Nombre del profesor" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" placeholder="profesor@athletickids.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" placeholder={PHONE_PLACEHOLDER} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="specialty">Especialidad</Label>
                <Input id="specialty" placeholder="Gimnasia Artística" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>
                Guardar Profesor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-4"
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
          <p className="text-sm text-muted-foreground">Ganancias Totales</p>
          <p className="text-2xl font-bold text-secondary">{formatCurrency(totalEarnings)}</p>
        </div>
      </motion.div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-inactive"
          checked={showInactive}
          onCheckedChange={setShowInactive}
        />
        <Label htmlFor="show-inactive">Mostrar profesores inactivos</Label>
      </div>

      {/* Teachers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTeachers.map((teacher, i) => (
          <motion.div
            key={teacher.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Header */}
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
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-background">
                  <AvatarImage src={teacher.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {teacher.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{teacher.name}</h3>
                  <p className="text-sm text-muted-foreground">{teacher.specialty}</p>
                  <StatusBadge active={teacher.isActive} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Contact */}
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

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Horario</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {teacher.schedule.map((s, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-primary">
                    <Users className="h-5 w-5" />
                    {teacher.studentsCount}
                  </div>
                  <p className="text-xs text-muted-foreground">Alumnos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-2xl font-bold text-secondary">
                    <DollarSign className="h-5 w-5" />
                    {(teacher.earnings / 1000).toFixed(1)}k
                  </div>
                  <p className="text-xs text-muted-foreground">Ganancias</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

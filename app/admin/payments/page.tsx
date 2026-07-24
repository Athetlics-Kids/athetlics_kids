'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ColumnDef } from '@tanstack/react-table'
import {
  Plus,
  Filter,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Banknote,
  Eye,
  Receipt,
  Edit,
  Trash2,
  MoreHorizontal,
  GraduationCap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DataTable,
  PaymentStatusBadge,
  PlanTypeBadge,
} from '@/components/dashboard'
import type { Payment, PaymentStatus, PlanType, TeacherPayout } from '@/types'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import {
  fetchPayments,
  fetchPlanConfigs,
  fetchStudents,
  fetchTeacherPayouts,
  fetchTeachers,
} from '@/lib/supabase/data'
import {
  createPayment,
  deletePayment,
  ensurePendingPaymentsForStudents,
  generateClassesFromPayment,
  generateInvoiceNumber,
  markPaymentPaid,
  renewStudentPlan,
  syncOverduePayments,
  updatePayment,
} from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, formatPlanConfigLabel, toInputDate } from '@/lib/locale'
import { WEEKDAY_LABELS } from '@/lib/schedule'

const PAYMENT_METHODS = ['Pendiente', 'Efectivo', 'Nequi', 'PSE', 'Tarjeta de Crédito', 'Tarjeta de Débito']

type PaymentForm = {
  studentId: string
  amount: string
  planType: PlanType | ''
  dueDate: string
  status: PaymentStatus
  method: string
}

const emptyForm: PaymentForm = {
  studentId: '',
  amount: '',
  planType: '',
  dueDate: '',
  status: 'pending',
  method: 'Pendiente',
}

export default function PaymentsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [form, setForm] = useState<PaymentForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const { data: payments = [], refetch } = useSupabaseLoader((client) => fetchPayments(client))
  const { data: teacherPayouts = [], refetch: refetchPayouts } = useSupabaseLoader((client) =>
    fetchTeacherPayouts(client)
  )
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: plans = [] } = useSupabaseLoader((client) =>
    fetchPlanConfigs(client, { activeOnly: true })
  )
  const { data: teachers = [] } = useSupabaseLoader((client) => fetchTeachers(client))

  const [paymentsTab, setPaymentsTab] = useState<'students' | 'teachers'>('students')
  const [teacherFilter, setTeacherFilter] = useState<string>('all')

  const [schedulePayment, setSchedulePayment] = useState<Payment | null>(null)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [scheduleTeacherId, setScheduleTeacherId] = useState<string>('none')
  const [scheduleLocation, setScheduleLocation] = useState<'local' | 'domicilio'>('local')
  const [scheduleAddress, setScheduleAddress] = useState('')
  const [scheduling, setScheduling] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function syncPayments() {
      const client = createClient()
      await syncOverduePayments(client)
      const { created } = await ensurePendingPaymentsForStudents(client)
      if (!cancelled) {
        if (created > 0) {
          toast.success(
            created === 1
              ? 'Se generó 1 pago pendiente para un alumno sin factura'
              : `Se generaron ${created} pagos pendientes para alumnos sin factura`
          )
        }
        await refetch()
      }
    }
    syncPayments()
    return () => {
      cancelled = true
    }
    // Solo al montar la página de pagos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredPayments =
    filterStatus === 'all'
      ? payments
      : payments.filter((p) => p.status === filterStatus)

  const pendingCount = payments.filter((p) => p.status === 'pending').length
  const overdueCount = payments.filter((p) => p.status === 'overdue').length

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalPending = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalOverdue = payments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...emptyForm,
      dueDate: new Date().toISOString().slice(0, 10),
      planType: plans[0]?.planType ?? 'monthly',
      amount: String(plans[0]?.price ?? ''),
    })
    setDialogOpen(true)
  }

  const openEdit = (payment: Payment) => {
    setEditing(payment)
    setForm({
      studentId: payment.studentId,
      amount: String(payment.amount),
      planType: payment.planType,
      dueDate: toInputDate(payment.dueDate),
      status: payment.status,
      method: payment.method,
    })
    setSelectedPayment(null)
    setDialogOpen(true)
  }

  const onStudentChange = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    const plan = plans.find((p) => p.planType === (student?.planType ?? form.planType))
    setForm((f) => ({
      ...f,
      studentId,
      planType: student?.planType ?? f.planType,
      amount: plan ? String(plan.price) : f.amount,
    }))
  }

  const onPlanChange = (planType: PlanType) => {
    const plan = plans.find((p) => p.planType === planType)
    setForm((f) => ({
      ...f,
      planType,
      amount: plan ? String(plan.price) : f.amount,
    }))
  }

  const handleSave = async () => {
    if (!form.studentId || !form.planType || !form.dueDate || !form.amount) {
      toast.error('Completa todos los campos')
      return
    }

    const student = students.find((s) => s.id === form.studentId)
    if (!student) {
      toast.error('Alumno no encontrado')
      return
    }

    setSaving(true)
    const client = createClient()
    const payload = {
      studentId: form.studentId,
      parentId: student.parentId,
      amount: Number(form.amount),
      planType: form.planType as PlanType,
      dueDate: form.dueDate,
      status: form.status,
      method: form.method,
    }

    const result = editing
      ? await updatePayment(client, editing.id, payload)
      : await createPayment(client, {
          ...payload,
          invoiceNumber: generateInvoiceNumber(),
        })

    setSaving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success(editing ? 'Pago actualizado' : 'Pago creado')
    setDialogOpen(false)
    refetch()
  }

  const openScheduleDialog = (payment: Payment) => {
    const student = students.find((s) => s.id === payment.studentId)
    const plan = plans.find((p) => p.planType === payment.planType)
    const needed = plan?.classesPerWeek ?? 1
    setWeekdays([])
    setScheduleTime('09:00')
    setScheduleTeacherId(student?.teacherId || 'none')
    setScheduleLocation('local')
    setScheduleAddress(student?.address ?? '')
    setSchedulePayment(payment)
    // hint in toast
    if (needed > 1) {
      toast.message(`Elige ${needed} días de la semana para este plan`)
    }
  }

  const handleMarkPaid = async (payment: Payment) => {
    const result = await markPaymentPaid(createClient(), payment.id, 'Efectivo')
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Pago marcado como pagado')
    setSelectedPayment(null)
    await refetch()
    if (!payment.classesGenerated) {
      openScheduleDialog({ ...payment, status: 'paid', classesGenerated: false })
    }
  }

  const handleGenerateClasses = async () => {
    if (!schedulePayment) return
    const plan = resolveSchedulePlan(schedulePayment)
    const isOneOff = plan?.planType === 'one_off' || schedulePayment.planType === 'one_off'
    const needed = isOneOff ? 1 : (plan?.classesPerWeek ?? 1)
    if (weekdays.length !== needed) {
      toast.error(
        isOneOff
          ? 'La clase única solo permite elegir 1 día'
          : `Selecciona exactamente ${needed} día(s) de la semana`
      )
      return
    }
    setScheduling(true)
    const result = await generateClassesFromPayment(createClient(), {
      paymentId: schedulePayment.id,
      weekdays,
      startTime: scheduleTime,
      teacherId: scheduleTeacherId === 'none' ? null : scheduleTeacherId,
      locationType: scheduleLocation,
      address: scheduleAddress.trim() || undefined,
    })
    setScheduling(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success(
      isOneOff
        ? `Se agendó 1 clase única (${result.data.planEndDate})`
        : `Se agendaron ${result.data.count} clases (hasta ${result.data.planEndDate})`
    )
    setSchedulePayment(null)
    refetch()
  }

  const resolveSchedulePlan = (payment: Payment) => {
    if (payment.planType === 'one_off') {
      return plans.find((p) => p.planType === 'one_off') ?? plans.find((p) => p.label === 'Clase única')
    }
    return (
      plans.find((p) => p.planType === payment.planType && p.label.includes(`${payment.planType}`)) ??
      plans.find((p) => p.planType === payment.planType)
    )
  }

  const toggleWeekday = (day: number) => {
    const plan = schedulePayment ? resolveSchedulePlan(schedulePayment) : null
    const isOneOff = plan?.planType === 'one_off' || schedulePayment?.planType === 'one_off'
    const needed = isOneOff ? 1 : (plan?.classesPerWeek ?? 1)
    setWeekdays((prev) => {
      if (isOneOff) {
        return prev.includes(day) ? [] : [day]
      }
      if (prev.includes(day)) return prev.filter((d) => d !== day)
      if (prev.length >= needed) return [...prev.slice(1), day]
      return [...prev, day]
    })
  }

  const handleRenew = async (payment: Payment) => {
    if (!confirm(`¿Renovar el plan de ${payment.studentName}? Se creará un nuevo pago pendiente.`)) {
      return
    }
    const student = students.find((s) => s.id === payment.studentId)
    const plan = plans.find((p) => p.planType === payment.planType)
    const result = await renewStudentPlan(createClient(), {
      studentId: payment.studentId,
      planConfigId: plan?.id,
      generateClasses: false,
    })
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Plan renovado: nuevo pago pendiente creado. Márcalo pagado para agendar clases.')
    refetch()
  }

  const handleDelete = async (payment: Payment) => {
    if (!confirm(`¿Eliminar factura ${payment.invoiceNumber}?`)) return
    const result = await deletePayment(createClient(), payment.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Pago eliminado')
    setSelectedPayment(null)
    refetch()
  }

  const columns: ColumnDef<Payment>[] = useMemo(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Factura',
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.invoiceNumber}</span>
        ),
      },
      {
        accessorKey: 'studentName',
        header: 'Alumno',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {row.original.studentName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{row.original.studentName}</p>
              <p className="text-xs text-muted-foreground">{row.original.parentName}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'planType',
        header: 'Plan',
        cell: ({ row }) => <PlanTypeBadge plan={row.original.planType} />,
      },
      {
        accessorKey: 'amount',
        header: 'Monto',
        cell: ({ row }) => (
          <span className="font-semibold">{formatCurrency(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: 'method',
        header: 'Método',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.method.includes('Tarjeta') ? (
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            ) : row.original.method === 'Efectivo' ? (
              <Banknote className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Receipt className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">{row.original.method}</span>
          </div>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: 'Vencimiento',
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.dueDate, 'PP')}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
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
              <DropdownMenuItem onClick={() => setSelectedPayment(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {row.original.status !== 'paid' && (
                <DropdownMenuItem onClick={() => handleMarkPaid(row.original)}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Marcar pagado
                </DropdownMenuItem>
              )}
              {row.original.status === 'paid' && !row.original.classesGenerated && (
                <DropdownMenuItem onClick={() => openScheduleDialog(row.original)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Agendar clases del plan
                </DropdownMenuItem>
              )}
              {row.original.status === 'paid' && (
                <DropdownMenuItem onClick={() => handleRenew(row.original)}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Renovar plan
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDelete(row.original)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [students, plans]
  )

  const filteredTeacherPayouts =
    teacherFilter === 'all'
      ? teacherPayouts
      : teacherPayouts.filter((p) => p.teacherId === teacherFilter)

  const totalPaidToTeachers = teacherPayouts.reduce((sum, p) => sum + p.amount, 0)

  const teacherPayoutColumns: ColumnDef<TeacherPayout>[] = useMemo(
    () => [
      {
        accessorKey: 'paidAt',
        header: 'Fecha de pago',
        cell: ({ row }) => (
          <span className="text-sm">{formatDate(row.original.paidAt, 'PPp')}</span>
        ),
      },
      {
        accessorKey: 'teacherName',
        header: 'Profesor',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{row.original.teacherName}</span>
          </div>
        ),
      },
      {
        accessorKey: 'classTitle',
        header: 'Clase',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.classTitle}</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(row.original.classDate, 'PPP')}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Monto',
        cell: ({ row }) => (
          <span className="font-semibold text-green-600">
            {formatCurrency(row.original.amount)}
          </span>
        ),
      },
      {
        accessorKey: 'method',
        header: 'Método',
        cell: ({ row }) => <span className="text-sm">{row.original.method}</span>,
      },
    ],
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Pagos</h1>
          <p className="text-muted-foreground">
            Pagos de alumnos y pagos a profesores por clase
          </p>
        </div>
        {paymentsTab === 'students' && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Pago
          </Button>
        )}
      </div>

      <Tabs
        value={paymentsTab}
        onValueChange={(v) => setPaymentsTab(v as 'students' | 'teachers')}
      >
        <TabsList>
          <TabsTrigger value="students">Pagos de alumnos</TabsTrigger>
          <TabsTrigger value="teachers">Pagos a profesores</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-6 space-y-6">
      {/* Recuadro compacto: conteo pendientes / vencidos */}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setFilterStatus('pending')}
          className="inline-flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-50 px-4 py-2.5 text-left transition-colors hover:bg-yellow-100 dark:bg-yellow-950/40 dark:hover:bg-yellow-950/60"
        >
          <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">Pendientes</p>
            <p className="text-xl font-bold tabular-nums text-yellow-700 dark:text-yellow-200">
              {pendingCount}
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus('overdue')}
          className="inline-flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-50 px-4 py-2.5 text-left transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-xs font-medium text-red-800 dark:text-red-300">Vencidos</p>
            <p className="text-xl font-bold tabular-nums text-red-700 dark:text-red-200">
              {overdueCount}
            </p>
          </div>
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Pago' : 'Registrar Nuevo Pago'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Actualiza la información del pago' : 'Crea una nueva factura'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Alumno</Label>
              <Select value={form.studentId} onValueChange={onStudentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar alumno" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} — {student.parentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Plan</Label>
              <Select
                value={form.planType}
                onValueChange={(value) => onPlanChange(value as PlanType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.planType}>
                      {formatPlanConfigLabel(plan.label, plan.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Monto (COP)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vencimiento</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, status: value as PaymentStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Método</Label>
                <Select
                  value={form.method}
                  onValueChange={(value) => setForm((f) => ({ ...f, method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Recaudado</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendiente</p>
              <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Vencido</p>
              <p className="text-2xl font-bold">{formatCurrency(totalOverdue)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Facturas</p>
              <p className="text-2xl font-bold">{payments.length}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </motion.div>
      </div>

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
        className="rounded-xl border border-border bg-card"
      >
        <DataTable
          columns={columns}
          data={filteredPayments}
          searchKey="studentName"
          searchPlaceholder="Buscar por alumno..."
        />
      </motion.div>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Pago</DialogTitle>
            <DialogDescription>Información completa de la factura</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <span className="text-sm text-muted-foreground">Factura</span>
                <span className="font-mono font-semibold">
                  {selectedPayment.invoiceNumber}
                </span>
              </div>
              <div className="grid gap-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Alumno</span>
                  <span className="font-medium">{selectedPayment.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Padre/Tutor</span>
                  <span>{selectedPayment.parentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <PlanTypeBadge plan={selectedPayment.planType} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Método</span>
                  <span>{selectedPayment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vencimiento</span>
                  <span>{formatDate(selectedPayment.dueDate, 'PP')}</span>
                </div>
                {selectedPayment.paidDate && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fecha de pago</span>
                    <span>{formatDate(selectedPayment.paidDate, 'PP')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <PaymentStatusBadge status={selectedPayment.status} />
                </div>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedPayment.amount)}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {selectedPayment?.status !== 'paid' && (
              <Button
                className="w-full sm:w-auto"
                onClick={() => selectedPayment && handleMarkPaid(selectedPayment)}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar como Pagado
              </Button>
            )}
            {selectedPayment?.status === 'paid' && !selectedPayment.classesGenerated && (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  const p = selectedPayment
                  setSelectedPayment(null)
                  openScheduleDialog(p)
                }}
              >
                Agendar clases
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => selectedPayment && openEdit(selectedPayment)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              onClick={() => selectedPayment && handleDelete(selectedPayment)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agendar clases del plan tras pagar */}
      <Dialog open={!!schedulePayment} onOpenChange={() => setSchedulePayment(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar clases del plan</DialogTitle>
            <DialogDescription>
              {schedulePayment
                ? schedulePayment.planType === 'one_off'
                  ? `${schedulePayment.studentName} · clase única: elige 1 día`
                  : `${schedulePayment.studentName} · elige día(s), hora y profesor (opcional)`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {schedulePayment && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>
                  {schedulePayment.planType === 'one_off'
                    ? 'Día de la clase (solo 1)'
                    : `Días de la semana (${
                        plans.find((p) => p.planType === schedulePayment.planType)
                          ?.classesPerWeek ?? 1
                      } requerido${
                        weekdays.length
                          ? ` · ${weekdays.length} elegido${weekdays.length === 1 ? '' : 's'}`
                          : ''
                      })`}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_LABELS.map((label, day) => (
                    <Button
                      key={label}
                      type="button"
                      size="sm"
                      variant={weekdays.includes(day) ? 'default' : 'outline'}
                      onClick={() => toggleWeekday(day)}
                    >
                      {label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Modalidad</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={scheduleLocation === 'local' ? 'default' : 'outline'}
                    onClick={() => setScheduleLocation('local')}
                  >
                    Local
                  </Button>
                  <Button
                    type="button"
                    variant={scheduleLocation === 'domicilio' ? 'default' : 'outline'}
                    onClick={() => setScheduleLocation('domicilio')}
                  >
                    Domicilio
                  </Button>
                </div>
              </div>
              {scheduleLocation === 'domicilio' && (
                <div className="grid gap-2">
                  <Label>Dirección</Label>
                  <Input
                    value={scheduleAddress}
                    onChange={(e) => setScheduleAddress(e.target.value)}
                    placeholder="Dirección del domicilio"
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Profesor (opcional)</Label>
                <Select value={scheduleTeacherId} onValueChange={setScheduleTeacherId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin profesor por ahora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin profesor — asignar después</SelectItem>
                    {teachers
                      .filter((t) => t.isActive)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Si dejas sin profesor, filtra en Clases → &quot;Sin profesor&quot; para asignarlo
                  luego.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSchedulePayment(null)}>
              Después
            </Button>
            <Button onClick={handleGenerateClasses} disabled={scheduling}>
              {scheduling ? 'Agendando...' : 'Generar clases'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        <TabsContent value="teachers" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Total pagado a profesores</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalPaidToTeachers)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Registros</p>
              <p className="text-2xl font-bold">{teacherPayouts.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Profesor:</span>
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchPayouts()
                toast.success('Historial actualizado')
              }}
            >
              Actualizar
            </Button>
          </div>

          {filteredTeacherPayouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
              Aún no hay pagos a profesores. Abre una clase ejecutada y pulsa{' '}
              <strong>Pagado</strong>.
            </div>
          ) : (
            <DataTable columns={teacherPayoutColumns} data={filteredTeacherPayouts} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

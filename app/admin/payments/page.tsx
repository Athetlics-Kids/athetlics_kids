'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ColumnDef } from '@tanstack/react-table'
import {
  FileDown,
  Receipt,
  Filter,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Banknote,
  Eye,
} from 'lucide-react'
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
import { DataTable, PaymentStatusBadge, PlanTypeBadge, DashboardCard, NoPayments } from '@/components/dashboard'
import type { Payment } from '@/types'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchPayments } from '@/lib/supabase/data'
import { formatCurrency, formatDate } from '@/lib/locale'

const columns: ColumnDef<Payment>[] = [
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
            {row.original.studentName.split(' ').map((n) => n[0]).join('')}
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
      <span className="font-semibold">
        {formatCurrency(row.original.amount)}
      </span>
    ),
  },
  {
    accessorKey: 'method',
    header: 'Método',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.method === 'Tarjeta de Crédito' ||
        row.original.method === 'Tarjeta de Débito' ? (
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        ) : row.original.method === 'Efectivo' ? (
          <Banknote className="h-4 w-4 text-muted-foreground" />
        ) : row.original.method === 'PSE' || row.original.method === 'Nequi' ? (
          <Receipt className="h-4 w-4 text-muted-foreground" />
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
      <span className="text-sm">
        {formatDate(row.original.dueDate, 'PP')}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
  },
]

export default function PaymentsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const { data: payments = [], loading } = useSupabaseLoader((client) => fetchPayments(client))

  const filteredPayments =
    filterStatus === 'all'
      ? payments
      : payments.filter((p) => p.status === filterStatus)

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalOverdue = payments
    .filter((p) => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Pagos</h1>
          <p className="text-muted-foreground">
            Administra los pagos y facturas de tu academia
          </p>
        </div>
        <Button variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          Exportar Reporte
        </Button>
      </div>

      {/* Stats Cards */}
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
              <Receipt className="h-6 w-6 text-primary" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtrar por estado:</span>
        </div>
        {[
          { value: 'all', label: 'Todos', icon: null },
          { value: 'paid', label: 'Pagado', icon: CheckCircle },
          { value: 'pending', label: 'Pendiente', icon: Clock },
          { value: 'overdue', label: 'Vencido', icon: AlertCircle },
        ].map((filter) => (
          <Button
            key={filter.value}
            variant={filterStatus === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterStatus(filter.value)}
          >
            {filter.icon && <filter.icon className="mr-1 h-3 w-3" />}
            {filter.label}
          </Button>
        ))}
      </motion.div>

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl border border-border bg-card"
      >
        <DataTable
          columns={[
            ...columns,
            {
              id: 'actions',
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPayment(row.original)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver
                </Button>
              ),
            },
          ]}
          data={filteredPayments}
          searchKey="studentName"
          searchPlaceholder="Buscar por alumno..."
        />
      </motion.div>

      {/* Payment Detail Modal */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalle de Pago</DialogTitle>
            <DialogDescription>
              Información completa de la factura
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                <span className="text-sm text-muted-foreground">Factura</span>
                <span className="font-mono font-semibold">{selectedPayment.invoiceNumber}</span>
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
                  <span className="text-sm text-muted-foreground">Método de pago</span>
                  <span>{selectedPayment.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fecha de vencimiento</span>
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
              <Button className="w-full sm:w-auto">
                <CheckCircle className="mr-2 h-4 w-4" />
                Marcar como Pagado
              </Button>
            )}
            <Button variant="outline" className="w-full sm:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Descargar Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, CreditCard, CheckCircle, Clock, AlertCircle, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DashboardCard, PaymentStatusBadge, PlanTypeBadge, NoPayments } from '@/components/dashboard'
import { formatCurrency, formatDate } from '@/lib/locale'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchPayments } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'

export default function ParentPaymentsPage() {
  const user = useRequireRole('parent')
  const { data: payments = [] } = useSupabaseLoader((client) => fetchPayments(client))
  const myPayments = user.parentId
    ? payments.filter((p) => p.parentId === user.parentId)
    : []

  const totalPaid = myPayments.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0)
  const totalPending = myPayments.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0)

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
          <h1 className="text-2xl font-bold tracking-tight">Mis Pagos</h1>
          <p className="text-muted-foreground">
            Historial de pagos y facturas
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Pagado</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
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
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Payments List */}
      <DashboardCard
        title="Historial de Pagos"
        description="Todos tus pagos y facturas"
      >
        <div className="space-y-4">
          {myPayments.map((payment, i) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  payment.status === 'paid'
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : payment.status === 'pending'
                    ? 'bg-yellow-100 dark:bg-yellow-900/30'
                    : 'bg-red-100 dark:bg-red-900/30'
                }`}>
                  {payment.status === 'paid' ? (
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  ) : payment.status === 'pending' ? (
                    <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{payment.studentName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {payment.invoiceNumber} • {payment.method}
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <PlanTypeBadge plan={payment.planType} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xl font-bold">{formatCurrency(payment.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    Vence: {formatDate(payment.dueDate, 'PP')}
                  </p>
                  <PaymentStatusBadge status={payment.status} />
                </div>
                <div className="flex flex-col gap-2">
                  {payment.status !== 'paid' && (
                    <Button size="sm">Pagar Ahora</Button>
                  )}
                  <Button variant="outline" size="sm">
                    <FileDown className="mr-1 h-3 w-3" />
                    Factura
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </DashboardCard>
    </div>
  )
}

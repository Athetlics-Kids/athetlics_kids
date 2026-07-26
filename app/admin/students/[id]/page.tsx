'use client'

import { motion } from 'framer-motion'
import { use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  CalendarX,
  CreditCard,
  Mail,
  Phone,
  User,
  Award,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardCard, PaymentStatusBadge, PlanTypeBadge } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import {
  fetchAttendanceRecords,
  fetchClassSessions,
  fetchParents,
  fetchPayments,
  fetchStudentById,
} from '@/lib/supabase/data'
import { deleteAllStudentClasses } from '@/lib/supabase/mutations'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/locale'

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: student, loading } = useSupabaseLoader(() =>
    fetchStudentById(createClient(), id)
  )
  const { data: parents = [] } = useSupabaseLoader((client) => fetchParents(client))
  const { data: payments = [] } = useSupabaseLoader((client) => fetchPayments(client))
  const { data: attendanceRecords = [] } = useSupabaseLoader((client) =>
    fetchAttendanceRecords(client)
  )
  const { data: classSessions = [], refetch: refetchClasses } = useSupabaseLoader((client) =>
    fetchClassSessions(client)
  )

  const parent = parents.find((p) => p.id === student?.parentId)
  const studentPayments = payments.filter((p) => p.studentId === id)
  const studentAttendance = attendanceRecords.filter((a) => a.studentId === id)

  const handleDeleteAllClasses = async () => {
    if (!student) return
    if (
      !confirm(
        `¿Eliminar las clases de ${student.name} que aún no están pagadas al profesor?\nLas ya pagadas se conservan.`
      )
    ) {
      return
    }
    const result = await deleteAllStudentClasses(createClient(), student.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    const kept = result.data.keptPaid
    if (result.data.count === 0 && kept === 0) {
      toast.success('No había clases para eliminar')
    } else if (result.data.count === 0 && kept > 0) {
      toast.success(
        `No se eliminó ninguna: ${kept} clase(s) ya pagada(s) al profesor se conservaron`
      )
    } else {
      toast.success(
        kept > 0
          ? `Se eliminaron ${result.data.count} clase(s). Se conservaron ${kept} pagada(s) al profesor.`
          : `Se eliminaron ${result.data.count} clase(s)`
      )
    }
    refetchClasses()
  }

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Cargando alumno...</div>
  }

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-xl font-semibold mb-2">Alumno no encontrado</h2>
        <p className="text-muted-foreground mb-4">El alumno que buscas no existe.</p>
        <Button asChild>
          <Link href="/admin/students">Volver a alumnos</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/students">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
            <p className="text-muted-foreground">Detalle del alumno</p>
          </div>
        </div>
        <Button variant="outline" className="text-destructive" onClick={handleDeleteAllClasses}>
          <CalendarX className="mr-2 h-4 w-4" />
          Eliminar todas las clases
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-6 lg:col-span-1"
        >
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={student.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {student.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-muted-foreground">{student.age} años</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <Badge variant="secondary">{student.level}</Badge>
              <PlanTypeBadge plan={student.planType} />
              <PaymentStatusBadge status={student.paymentStatus} />
            </div>
            <div className="mt-6 w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{student.teacherName}</span>
              </div>
              {student.address && (
                <div className="flex items-start gap-3 text-sm">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{student.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Award className="h-4 w-4 text-muted-foreground" />
                <span>Progreso: {student.progress}%</span>
              </div>
              <Progress value={student.progress} className="h-2" />
            </div>
          </div>
        </motion.div>

        <div className="space-y-6 lg:col-span-2">
          <DashboardCard title="Información del Padre/Tutor">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nombre</p>
                  <p className="font-medium">{parent?.name ?? student.parentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{parent?.email ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                  <p className="font-medium">{parent?.phone ?? '—'}</p>
                </div>
              </div>
            </div>
          </DashboardCard>

          <Tabs defaultValue="payments">
            <TabsList>
              <TabsTrigger value="payments">Pagos</TabsTrigger>
              <TabsTrigger value="attendance">Asistencia</TabsTrigger>
              <TabsTrigger value="classes">Clases</TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="mt-4">
              <DashboardCard title="Historial de Pagos">
                {studentPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay pagos registrados.</p>
                ) : (
                  <div className="space-y-3">
                    {studentPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-medium">{payment.invoiceNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Vence: {formatDate(payment.dueDate, 'PPP')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(payment.amount)}</p>
                          <PaymentStatusBadge status={payment.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </TabsContent>
            <TabsContent value="attendance" className="mt-4">
              <DashboardCard title="Registro de Asistencia">
                {studentAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay registros de asistencia.</p>
                ) : (
                  <div className="space-y-3">
                    {studentAttendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-3">
                          {record.present ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium">
                              {formatDate(record.date, 'PPP')}
                            </p>
                            {record.notes && (
                              <p className="text-sm text-muted-foreground">{record.notes}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={record.present ? 'default' : 'destructive'}>
                          {record.present ? 'Presente' : 'Ausente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </DashboardCard>
            </TabsContent>
            <TabsContent value="classes" className="mt-4">
              <DashboardCard title="Clases Inscritas">
                {classSessions.filter((c) => c.students.includes(id)).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay clases inscritas.</p>
                ) : (
                  <div className="space-y-3">
                    {classSessions
                      .filter((c) => c.students.includes(id))
                      .map((session) => (
                        <div key={session.id} className="flex items-center justify-between rounded-lg border p-4">
                          <div>
                            <p className="font-medium">{session.title}</p>
                            <p className="text-sm text-muted-foreground">{session.teacherName}</p>
                          </div>
                          <div className="text-right text-sm">
                            <p>{formatDate(session.date, 'PPP')}</p>
                            <p className="text-muted-foreground">
                              {session.startTime} - {session.endTime}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </DashboardCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AttendanceRecord,
  ClassSession,
  DashboardStats,
  Notification,
  Parent,
  Payment,
  PlanConfig,
  AcademySettings,
  Student,
  StudentLevel,
  Teacher,
} from '@/types'
import {
  mapAttendance,
  mapClassSession,
  mapDashboardStats,
  mapNotification,
  mapParent,
  mapPayment,
  mapProfile,
  mapStudent,
  mapTeacher,
  mapTeacherPayout,
  parseDateOnly,
  type AppUser,
} from './mappers'

const emptyStats: DashboardStats = {
  totalStudents: 0,
  activeClasses: 0,
  activeTeachers: 0,
  monthlyRevenue: 0,
  pendingPayments: 0,
  attendanceRate: 0,
}

export async function fetchStudents(supabase: SupabaseClient): Promise<Student[]> {
  const [{ data, error }, { data: payments }] = await Promise.all([
    supabase.from('student_details').select('*').order('name'),
    supabase.from('payments').select('student_id, status, due_date, created_at'),
  ])
  if (error || !data) return []

  const statusByStudent = derivePaymentStatusByStudent(payments ?? [])
  const studentsWithPayments = new Set(
    (payments ?? []).map((p) => p.student_id as string)
  )

  return data.map((row) => {
    const student = mapStudent(row)
    student.paymentStatus = statusByStudent.get(student.id) ?? 'pending'
    student.hasPayments = studentsWithPayments.has(student.id)
    return student
  })
}

/** Estado de pago del alumno = el de la pestaña Pagos (no el campo suelto en students). */
function derivePaymentStatusByStudent(
  payments: Array<{
    student_id: string
    status: string
    due_date?: string
    created_at?: string
  }>
): Map<string, import('@/types').PaymentStatus> {
  type Pay = {
    status: import('@/types').PaymentStatus
    due: string
    created: string
  }
  const byStudent = new Map<string, Pay[]>()

  for (const p of payments) {
    const list = byStudent.get(p.student_id) ?? []
    list.push({
      status: p.status as import('@/types').PaymentStatus,
      due: String(p.due_date ?? ''),
      created: String(p.created_at ?? ''),
    })
    byStudent.set(p.student_id, list)
  }

  const result = new Map<string, import('@/types').PaymentStatus>()

  for (const [studentId, list] of byStudent) {
    // Prioridad operativa: vencido > pendiente > el más reciente pagado
    if (list.some((p) => p.status === 'overdue')) {
      result.set(studentId, 'overdue')
      continue
    }
    if (list.some((p) => p.status === 'pending')) {
      result.set(studentId, 'pending')
      continue
    }
    list.sort((a, b) => {
      const dueCmp = b.due.localeCompare(a.due)
      if (dueCmp !== 0) return dueCmp
      return b.created.localeCompare(a.created)
    })
    result.set(studentId, list[0]?.status ?? 'pending')
  }

  return result
}

export async function fetchTeachers(supabase: SupabaseClient): Promise<Teacher[]> {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthEndExclusive = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: summaries },
    { data: schedules },
    { data: monthFees },
    { data: classTeachers },
    { data: studentTeachers },
    { data: payoutTeachers },
  ] = await Promise.all([
    supabase.from('teacher_summaries').select('*').order('name'),
    supabase.from('teacher_schedules').select('*'),
    supabase
      .from('class_sessions')
      .select('teacher_id, teacher_fee, class_date, teacher_paid_at')
      .neq('status', 'cancelled')
      .not('teacher_id', 'is', null)
      .gte('class_date', monthStart)
      .lt('class_date', monthEndExclusive),
    supabase.from('class_sessions').select('teacher_id').not('teacher_id', 'is', null),
    supabase.from('students').select('teacher_id'),
    supabase.from('teacher_payouts').select('teacher_id'),
  ])

  if (!summaries) return []

  const blocked = new Set<string>()
  for (const row of classTeachers ?? []) {
    if (row.teacher_id) blocked.add(row.teacher_id as string)
  }
  for (const row of studentTeachers ?? []) {
    if (row.teacher_id) blocked.add(row.teacher_id as string)
  }
  for (const row of payoutTeachers ?? []) {
    if (row.teacher_id) blocked.add(row.teacher_id as string)
  }

  const projectedByTeacher = new Map<string, number>()
  const pendingByTeacher = new Map<string, number>()

  for (const row of monthFees ?? []) {
    if (!row.teacher_id) continue
    const fee = Number(row.teacher_fee ?? 0)
    const dateOnly = String(row.class_date).slice(0, 10)
    projectedByTeacher.set(
      row.teacher_id,
      (projectedByTeacher.get(row.teacher_id) ?? 0) + fee
    )
    // Saldo pendiente = del día de la clase en adelante (hoy o pasado) y aún no pagada
    if (dateOnly <= today && !row.teacher_paid_at) {
      pendingByTeacher.set(
        row.teacher_id,
        (pendingByTeacher.get(row.teacher_id) ?? 0) + fee
      )
    }
  }

  return summaries.map((row) => {
    const teacher = mapTeacher(row, schedules ?? [])
    const projected = projectedByTeacher.get(teacher.id) ?? 0
    const pending = pendingByTeacher.get(teacher.id) ?? 0
    teacher.earningsProjected = projected
    teacher.earningsActual = pending
    teacher.pendingBalance = pending
    teacher.earnings = projected
    teacher.canHardDelete = !blocked.has(teacher.id)
    return teacher
  })
}

/** Ganancias mensuales: proyección vs saldo pendiente (ejecutadas no pagadas). */
export async function fetchTeacherMonthlyEarnings(
  supabase: SupabaseClient,
  teacherId: string,
  year = new Date().getFullYear()
): Promise<
  {
    month: string
    projected: number
    actual: number
    pending: number
    classes: number
    classesDone: number
    classesPaid: number
  }[]
> {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const totals = months.map((month) => ({
    month,
    projected: 0,
    actual: 0,
    pending: 0,
    classes: 0,
    classesDone: 0,
    classesPaid: 0,
  }))

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data } = await supabase
    .from('class_sessions')
    .select('class_date, teacher_fee, status, teacher_paid_at')
    .eq('teacher_id', teacherId)
    .neq('status', 'cancelled')
    .gte('class_date', `${year}-01-01`)
    .lte('class_date', `${year}-12-31`)

  for (const row of data ?? []) {
    const dateOnly = String(row.class_date).slice(0, 10)
    const d = parseDateOnly(dateOnly)
    if (d.getFullYear() !== year) continue
    const i = d.getMonth()
    const fee = Number(row.teacher_fee ?? 0)
    totals[i].projected += fee
    totals[i].classes += 1
    if (dateOnly <= today) {
      totals[i].classesDone += 1
      if (row.teacher_paid_at) {
        totals[i].classesPaid += 1
      } else {
        totals[i].actual += fee
        totals[i].pending += fee
      }
    }
  }

  return totals
}

export async function fetchTeacherPayouts(
  supabase: SupabaseClient
): Promise<import('@/types').TeacherPayout[]> {
  const { data, error } = await supabase
    .from('teacher_payout_details')
    .select('*')
    .order('paid_at', { ascending: false })

  if (error || !data) {
    // Fallback si aún no corrieron la migración de la vista
    const { data: rows } = await supabase
      .from('teacher_payouts')
      .select('*, teachers(name)')
      .order('paid_at', { ascending: false })
    if (!rows) return []
    return rows.map((row) =>
      mapTeacherPayout({
        ...row,
        teacher_name: (row.teachers as { name?: string } | null)?.name ?? 'Profesor',
      })
    )
  }

  return data.map(mapTeacherPayout)
}

export async function fetchParents(supabase: SupabaseClient): Promise<Parent[]> {
  const [{ data: parents }, { data: students }] = await Promise.all([
    supabase.from('parents').select('*').order('name'),
    supabase.from('students').select('id, parent_id'),
  ])

  if (!parents) return []

  return parents.map((parent) => {
    const children =
      students?.filter((student) => student.parent_id === parent.id).map((student) => student.id) ?? []
    return mapParent(parent, children)
  })
}

export async function fetchClassSessions(supabase: SupabaseClient): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from('class_session_details')
    .select('*')
    .order('class_date', { ascending: true })

  if (error || !data) return []
  return data.map(mapClassSession)
}

export async function fetchPayments(supabase: SupabaseClient): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payment_details')
    .select('*')
    .order('due_date', { ascending: false })

  if (error || !data) return []
  return data.map(mapPayment)
}

export async function fetchAttendanceRecords(
  supabase: SupabaseClient
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .order('attendance_date', { ascending: false })

  if (error || !data) return []

  const students = await fetchStudents(supabase)
  const studentMap = new Map(students.map((student) => [student.id, student.name]))

  return data.map((row) => mapAttendance(row, studentMap.get(row.student_id)))
}

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId?: string
): Promise<Notification[]> {
  let query = supabase.from('notifications').select('*').order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query
  if (error || !data) return []
  return data.map(mapNotification)
}

export async function fetchDashboardStats(supabase: SupabaseClient): Promise<DashboardStats> {
  const { data, error } = await supabase.from('dashboard_stats').select('*').maybeSingle()
  if (error || !data) return emptyStats
  return mapDashboardStats(data)
}

export async function fetchMonthlyRevenue(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('payments')
    .select('amount, paid_date, status')
    .eq('status', 'paid')

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const totals = new Array(12).fill(0).map((_, index) => ({
    month: months[index],
    revenue: 0,
    students: 0,
  }))

  for (const payment of data ?? []) {
    if (!payment.paid_date) continue
    const monthIndex = parseDateOnly(payment.paid_date as string).getMonth()
    totals[monthIndex].revenue += Number(payment.amount)
  }

  return totals
}

export async function fetchWeeklySchedule(supabase: SupabaseClient) {
  const { data } = await supabase.from('class_sessions').select('class_date, status')

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const counts = days.slice(1).concat(days[0]).map((day) => ({ day, classes: 0 }))

  for (const session of data ?? []) {
    if (session.status !== 'scheduled') continue
    // parseDateOnly evita el desfase UTC (Lunes→Domingo, Jueves→Miércoles)
    const dayIndex = parseDateOnly(session.class_date as string).getDay()
    const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1
    counts[mappedIndex].classes += 1
  }

  return counts
}

export async function fetchCurrentUser(supabase: SupabaseClient): Promise<AppUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (!profile) {
    return null
  }

  const mapped = mapProfile(profile)

  if (mapped.role === 'teacher') {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    mapped.teacherId = teacher?.id
  }

  if (mapped.role === 'parent') {
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    mapped.parentId = parent?.id
  }

  return mapped
}

export async function fetchStudentById(
  supabase: SupabaseClient,
  id: string
): Promise<Student | null> {
  const [{ data, error }, { data: payments }] = await Promise.all([
    supabase.from('student_details').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('payments')
      .select('student_id, status, due_date, created_at')
      .eq('student_id', id),
  ])
  if (error || !data) return null
  const student = mapStudent(data)
  const statusByStudent = derivePaymentStatusByStudent(payments ?? [])
  student.paymentStatus = statusByStudent.get(id) ?? 'pending'
  student.hasPayments = (payments ?? []).length > 0
  return student
}

export async function fetchAdminDashboardData(supabase: SupabaseClient) {
  const [stats, revenueData, weeklySchedule, classSessions, students, payments] = await Promise.all([
    fetchDashboardStats(supabase),
    fetchMonthlyRevenue(supabase),
    fetchWeeklySchedule(supabase),
    fetchClassSessions(supabase),
    fetchStudents(supabase),
    fetchPayments(supabase),
  ])

  return { stats, revenueData, weeklySchedule, classSessions, students, payments }
}

export async function fetchStudentLevels(
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<StudentLevel[]> {
  let query = supabase.from('student_levels').select('*').order('sort_order')
  if (options?.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error) {
    console.error('fetchStudentLevels:', error.message)
    return []
  }
  if (!data) return []

  return data.map((row) => ({
    id: row.id as string,
    label: row.label as string,
    sortOrder: row.sort_order as number,
    isActive: row.is_active as boolean,
  }))
}

export async function fetchPlanConfigs(
  supabase: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<PlanConfig[]> {
  let query = supabase.from('plan_configs').select('*').order('sort_order')
  if (options?.activeOnly) query = query.eq('is_active', true)

  const { data, error } = await query
  if (error || !data) {
    // Fallback si la migración aún no se ejecutó
    return [
      { id: 'monthly-1', planType: 'monthly', label: 'Mensual · 1 clase/semana', price: 180_000, durationMonths: 1, classesPerWeek: 1, isActive: true, sortOrder: 1 },
      { id: 'monthly-2', planType: 'monthly', label: 'Mensual · 2 clases/semana', price: 250_000, durationMonths: 1, classesPerWeek: 2, isActive: true, sortOrder: 2 },
      { id: 'quarterly', planType: 'quarterly', label: 'Trimestral', price: 480_000, durationMonths: 3, classesPerWeek: 1, isActive: true, sortOrder: 3 },
      { id: 'annual', planType: 'annual', label: 'Anual', price: 1_680_000, durationMonths: 12, classesPerWeek: 1, isActive: true, sortOrder: 4 },
    ]
  }

  return data.map((row) => ({
    id: row.id as string,
    planType: row.plan_type as PlanConfig['planType'],
    label: row.label as string,
    price: Number(row.price),
    durationMonths: row.duration_months as number,
    classesPerWeek: Number(row.classes_per_week ?? 1),
    isActive: row.is_active as boolean,
    sortOrder: row.sort_order as number,
  }))
}

export async function fetchAcademySettings(
  supabase: SupabaseClient
): Promise<AcademySettings> {
  const { data, error } = await supabase
    .from('academy_settings')
    .select('rate_local, rate_domicilio')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data) {
    return { rateLocal: 30_000, rateDomicilio: 50_000 }
  }

  return {
    rateLocal: Number(data.rate_local),
    rateDomicilio: Number(data.rate_domicilio),
  }
}

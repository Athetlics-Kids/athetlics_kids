import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AttendanceRecord,
  ClassSession,
  DashboardStats,
  Notification,
  Parent,
  Payment,
  Student,
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
  const { data, error } = await supabase.from('student_details').select('*').order('name')
  if (error || !data) return []
  return data.map(mapStudent)
}

export async function fetchTeachers(supabase: SupabaseClient): Promise<Teacher[]> {
  const [{ data: summaries }, { data: schedules }] = await Promise.all([
    supabase.from('teacher_summaries').select('*').order('name'),
    supabase.from('teacher_schedules').select('*'),
  ])

  if (!summaries) return []
  return summaries.map((row) => mapTeacher(row, schedules ?? []))
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
    const monthIndex = new Date(payment.paid_date).getMonth()
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
    const dayIndex = new Date(session.class_date).getDay()
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
  const { data, error } = await supabase.from('student_details').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return mapStudent(data)
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

import type {
  AttendanceRecord,
  ClassSession,
  ClassStatus,
  DashboardStats,
  Notification,
  Parent,
  Payment,
  PaymentStatus,
  PlanType,
  Student,
  Teacher,
  UserRole,
} from '@/types'

function formatTime(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 5)
}

export function mapStudent(row: Record<string, unknown>): Student {
  return {
    id: row.id as string,
    name: row.name as string,
    age: row.age as number,
    avatar: (row.avatar_url as string) || undefined,
    parentId: row.parent_id as string,
    parentName: row.parent_name as string,
    teacherId: row.teacher_id as string,
    teacherName: row.teacher_name as string,
    planType: row.plan_type as PlanType,
    paymentStatus: row.payment_status as PaymentStatus,
    enrolledAt: new Date(row.enrolled_at as string),
    progress: row.progress as number,
    level: row.level as string,
  }
}

export function mapTeacher(
  row: Record<string, unknown>,
  schedules: Array<Record<string, unknown>> = []
): Teacher {
  const teacherSchedules = schedules
    .filter((s) => s.teacher_id === row.id)
    .map((s) => {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const day = days[s.day_of_week as number] ?? ''
      return `${day} ${formatTime(s.start_time as string)}-${formatTime(s.end_time as string)}`
    })

  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    avatar: (row.avatar_url as string) || undefined,
    specialty: row.specialty as string,
    phone: row.phone as string,
    schedule: teacherSchedules,
    studentsCount: Number(row.students_count ?? 0),
    earnings: Number(row.earnings ?? 0),
    isActive: row.is_active as boolean,
    createdAt: new Date(row.created_at as string),
  }
}

export function mapParent(row: Record<string, unknown>, children: string[] = []): Parent {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    avatar: (row.avatar_url as string) || undefined,
    phone: row.phone as string,
    children,
    createdAt: new Date(row.created_at as string),
  }
}

export function mapClassSession(row: Record<string, unknown>): ClassSession {
  return {
    id: row.id as string,
    title: row.title as string,
    teacherId: row.teacher_id as string,
    teacherName: row.teacher_name as string,
    date: new Date(row.class_date as string),
    startTime: formatTime(row.start_time as string),
    endTime: formatTime(row.end_time as string),
    capacity: row.capacity as number,
    enrolled: Number(row.enrolled ?? 0),
    status: row.status as ClassStatus,
    students: (row.students as string[]) ?? [],
    level: row.level as string,
  }
}

export function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    studentName: row.student_name as string,
    parentId: row.parent_id as string,
    parentName: row.parent_name as string,
    amount: Number(row.amount),
    status: row.status as PaymentStatus,
    method: row.method as string,
    planType: row.plan_type as PlanType,
    dueDate: new Date(row.due_date as string),
    paidDate: row.paid_date ? new Date(row.paid_date as string) : undefined,
    invoiceNumber: row.invoice_number as string,
  }
}

export function mapAttendance(row: Record<string, unknown>, studentName?: string): AttendanceRecord {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    studentName: studentName ?? (row.student_name as string) ?? '',
    classId: row.class_session_id as string,
    date: new Date(row.attendance_date as string),
    present: row.present as boolean,
    notes: (row.notes as string) || undefined,
  }
}

export function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    message: row.message as string,
    type: row.type as Notification['type'],
    read: row.read as boolean,
    createdAt: new Date(row.created_at as string),
  }
}

export function mapDashboardStats(row: Record<string, unknown>): DashboardStats {
  return {
    totalStudents: Number(row.total_students ?? 0),
    activeClasses: Number(row.active_classes ?? 0),
    activeTeachers: Number(row.active_teachers ?? 0),
    monthlyRevenue: Number(row.monthly_revenue ?? 0),
    pendingPayments: Number(row.pending_payments ?? 0),
    attendanceRate: Number(row.attendance_rate ?? 0),
  }
}

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  teacherId?: string
  parentId?: string
}

export function mapProfile(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    avatar: (row.avatar_url as string) || undefined,
    phone: (row.phone as string) || undefined,
    teacherId: (row.teacher_id as string) || undefined,
    parentId: (row.parent_id as string) || undefined,
  }
}

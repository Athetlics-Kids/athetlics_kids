export type UserRole = 'admin' | 'teacher' | 'parent'

export type PaymentStatus = 'paid' | 'pending' | 'overdue'

export type PlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'one_off'

export type ClassStatus = 'scheduled' | 'completed' | 'cancelled'

export type ClassLocation = 'local' | 'domicilio'

export type ClassKind = 'plan' | 'one_off'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  createdAt: Date
}

export interface Student {
  id: string
  name: string
  age: number
  avatar?: string
  parentId: string
  parentName: string
  teacherId: string
  teacherName: string
  planType: PlanType
  paymentStatus: PaymentStatus
  enrolledAt: Date
  progress: number
  level: string
  address?: string
}

export interface Teacher {
  id: string
  name: string
  email: string
  avatar?: string
  specialty: string
  phone: string
  schedule: string[]
  studentsCount: number
  /** Proyección del mes: todas las clases agendadas (no canceladas) */
  earnings: number
  earningsProjected: number
  /** Saldo pendiente: clases ejecutadas (fecha pasada) aún no pagadas al profesor */
  earningsActual: number
  pendingBalance: number
  isActive: boolean
  createdAt: Date
}

export interface Parent {
  id: string
  name: string
  email: string
  avatar?: string
  phone: string
  children: string[]
  createdAt: Date
}

export interface ClassSession {
  id: string
  title: string
  teacherId?: string
  teacherName: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  enrolled: number
  status: ClassStatus
  students: string[]
  level: string
  locationType: ClassLocation
  teacherFee: number
  classKind: ClassKind
  paymentId?: string
  studentId?: string
  /** Dirección cuando la clase es a domicilio */
  address?: string
  /** Si ya se le pagó al profesor por esta clase */
  teacherPaidAt?: Date
}

export interface TeacherPayout {
  id: string
  teacherId: string
  teacherName: string
  classSessionId?: string
  classTitle: string
  classDate: Date
  amount: number
  method: string
  paidAt: Date
}

export interface Payment {
  id: string
  studentId: string
  studentName: string
  parentId: string
  parentName: string
  amount: number
  status: PaymentStatus
  method: string
  planType: PlanType
  dueDate: Date
  paidDate?: Date
  invoiceNumber: string
  classesGenerated?: boolean
  planStartDate?: Date
  planEndDate?: Date
}

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  classId: string
  date: Date
  present: boolean
  notes?: string
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  createdAt: Date
}

export interface DashboardStats {
  totalStudents: number
  activeClasses: number
  activeTeachers: number
  monthlyRevenue: number
  pendingPayments: number
  attendanceRate: number
}

export interface StudentLevel {
  id: string
  label: string
  sortOrder: number
  isActive: boolean
}

export interface PlanConfig {
  id: string
  planType: PlanType
  label: string
  price: number
  durationMonths: number
  classesPerWeek: number
  isActive: boolean
  sortOrder: number
}

export interface AcademySettings {
  rateLocal: number
  rateDomicilio: number
}

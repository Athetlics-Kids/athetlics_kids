export type UserRole = 'admin' | 'teacher' | 'parent'

export type PaymentStatus = 'paid' | 'pending' | 'overdue'

export type PlanType = 'monthly' | 'quarterly' | 'semiannual' | 'annual'

export type ClassStatus = 'scheduled' | 'completed' | 'cancelled'

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
  earnings: number
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
  teacherId: string
  teacherName: string
  date: Date
  startTime: string
  endTime: string
  capacity: number
  enrolled: number
  status: ClassStatus
  students: string[]
  level: string
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

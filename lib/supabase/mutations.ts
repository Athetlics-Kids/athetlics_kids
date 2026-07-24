import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClassLocation, ClassStatus, PaymentStatus, PlanType } from '@/types'

export type MutationResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

function fail(error: unknown): MutationResult<never> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Error desconocido'
  return { ok: false, error: message }
}

function addHours(time: string, hours = 1): string {
  const [h, m] = time.split(':').map(Number)
  const next = (h + hours) % 24
  return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

export function generateInvoiceNumber() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yyyy = String(now.getFullYear())
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `FAC-${dd}${mm}${yyyy}-${hh}${min}`
}

// ─── Teachers ───────────────────────────────────────────────────────────────

export type TeacherInput = {
  name: string
  email: string
  phone: string
  specialty: string
  isActive?: boolean
}

export async function createTeacher(
  supabase: SupabaseClient,
  input: TeacherInput
): Promise<MutationResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('teachers')
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      specialty: input.specialty.trim(),
      is_active: input.isActive ?? true,
    })
    .select('id')
    .single()

  if (error) return fail(error)
  return { ok: true, data: { id: data.id } }
}

export async function updateTeacher(
  supabase: SupabaseClient,
  id: string,
  input: TeacherInput
): Promise<MutationResult> {
  const { error } = await supabase
    .from('teachers')
    .update({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      specialty: input.specialty.trim(),
      is_active: input.isActive ?? true,
    })
    .eq('id', id)

  if (error) return fail(error)
  return { ok: true, data: undefined }
}

export async function deleteTeacher(
  supabase: SupabaseClient,
  id: string
): Promise<MutationResult> {
  const { error } = await supabase.from('teachers').delete().eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

// ─── Parents ────────────────────────────────────────────────────────────────

export type ParentInput = {
  name: string
  email: string
  phone: string
}

export async function createParent(
  supabase: SupabaseClient,
  input: ParentInput
): Promise<MutationResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('parents')
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
    })
    .select('id')
    .single()

  if (error) return fail(error)
  return { ok: true, data: { id: data.id } }
}

export async function updateParent(
  supabase: SupabaseClient,
  id: string,
  input: ParentInput
): Promise<MutationResult> {
  const { error } = await supabase
    .from('parents')
    .update({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
    })
    .eq('id', id)

  if (error) return fail(error)
  return { ok: true, data: undefined }
}

// ─── Students ───────────────────────────────────────────────────────────────

export type StudentInput = {
  name: string
  age: number
  parentId: string
  teacherId: string
  planType: PlanType
  planConfigId?: string
  level: string
  address?: string
  paymentStatus?: PaymentStatus
  progress?: number
}

export async function createStudent(
  supabase: SupabaseClient,
  input: StudentInput
): Promise<MutationResult<{ id: string; paymentId?: string }>> {
  const { data, error } = await supabase
    .from('students')
    .insert({
      name: input.name.trim(),
      age: input.age,
      parent_id: input.parentId,
      teacher_id: input.teacherId,
      plan_type: input.planType,
      plan_config_id: input.planConfigId || null,
      level: input.level,
      address: input.address?.trim() || null,
      payment_status: input.paymentStatus ?? 'pending',
      progress: input.progress ?? 0,
    })
    .select('id')
    .single()

  if (error) return fail(error)

  const paymentResult = await createPendingPaymentForStudent(supabase, {
    studentId: data.id,
    parentId: input.parentId,
    planType: input.planType,
    planConfigId: input.planConfigId,
  })

  if (!paymentResult.ok) {
    return {
      ok: true,
      data: { id: data.id },
    }
  }

  return { ok: true, data: { id: data.id, paymentId: paymentResult.data.id } }
}

/** Crea factura pendiente según precio del plan (plan_configs o fallback). */
export async function createPendingPaymentForStudent(
  supabase: SupabaseClient,
  input: {
    studentId: string
    parentId: string
    planType: PlanType
    planConfigId?: string
  }
): Promise<MutationResult<{ id: string }>> {
  let plan: { price: number; duration_months: number } | null = null

  if (input.planConfigId) {
    const { data } = await supabase
      .from('plan_configs')
      .select('price, duration_months')
      .eq('id', input.planConfigId)
      .maybeSingle()
    if (data) plan = { price: Number(data.price), duration_months: Number(data.duration_months) }
  }

  if (!plan) {
    const { data } = await supabase
      .from('plan_configs')
      .select('price, duration_months')
      .eq('plan_type', input.planType)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    if (data) plan = { price: Number(data.price), duration_months: Number(data.duration_months) }
  }

  const fallbackPrices: Record<PlanType, number> = {
    monthly: 180_000,
    quarterly: 480_000,
    semiannual: 900_000,
    annual: 1_680_000,
    one_off: 50_000,
  }
  const fallbackMonths: Record<PlanType, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
    one_off: 1,
  }

  const amount = plan ? plan.price : fallbackPrices[input.planType]
  const months = plan ? plan.duration_months : fallbackMonths[input.planType]

  const due = new Date()
  due.setMonth(due.getMonth() + months)
  const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`

  return createPayment(supabase, {
    studentId: input.studentId,
    parentId: input.parentId,
    amount,
    planType: input.planType,
    dueDate,
    status: 'pending',
    method: 'Pendiente',
  })
}

/** Para alumnos sin ninguna factura: genera el pago pendiente del plan. */
export async function ensurePendingPaymentsForStudents(
  supabase: SupabaseClient
): Promise<{ created: number }> {
  const [{ data: students }, { data: payments }] = await Promise.all([
    supabase.from('students').select('id, parent_id, plan_type, plan_config_id'),
    supabase.from('payments').select('student_id'),
  ])

  if (!students?.length) return { created: 0 }

  const studentsWithPayment = new Set(
    (payments ?? []).map((p) => p.student_id as string)
  )

  let created = 0
  for (const student of students) {
    if (studentsWithPayment.has(student.id)) continue
    const result = await createPendingPaymentForStudent(supabase, {
      studentId: student.id,
      parentId: student.parent_id,
      planType: student.plan_type as PlanType,
      planConfigId: student.plan_config_id as string | undefined,
    })
    if (result.ok) {
      created += 1
      await supabase
        .from('students')
        .update({ payment_status: 'pending' })
        .eq('id', student.id)
    }
  }

  return { created }
}

/** Marca como vencidos los pendientes cuya fecha ya pasó. */
export async function syncOverduePayments(
  supabase: SupabaseClient
): Promise<{ updated: number }> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', today)
    .select('id, student_id')

  if (error) return { updated: 0 }

  const studentIds = [...new Set((data ?? []).map((p) => p.student_id).filter(Boolean))]
  for (const studentId of studentIds) {
    await syncStudentPaymentStatus(supabase, studentId)
  }

  return { updated: data?.length ?? 0 }
}

/** Alinea students.payment_status con el estado derivado de la tabla payments. */
export async function syncStudentPaymentStatus(
  supabase: SupabaseClient,
  studentId: string
): Promise<void> {
  const { data: payments } = await supabase
    .from('payments')
    .select('status, due_date, created_at')
    .eq('student_id', studentId)

  let status: PaymentStatus = 'pending'
  const list = payments ?? []
  if (list.some((p) => p.status === 'overdue')) status = 'overdue'
  else if (list.some((p) => p.status === 'pending')) status = 'pending'
  else if (list.some((p) => p.status === 'paid')) status = 'paid'

  await supabase.from('students').update({ payment_status: status }).eq('id', studentId)
}

export async function updateStudent(
  supabase: SupabaseClient,
  id: string,
  input: StudentInput
): Promise<MutationResult> {
  const { error } = await supabase
    .from('students')
    .update({
      name: input.name.trim(),
      age: input.age,
      parent_id: input.parentId,
      teacher_id: input.teacherId,
      plan_type: input.planType,
      plan_config_id: input.planConfigId || null,
      level: input.level,
      address: input.address?.trim() || null,
      payment_status: input.paymentStatus,
      progress: input.progress,
    })
    .eq('id', id)

  if (error) return fail(error)
  return { ok: true, data: undefined }
}

export async function deleteStudent(
  supabase: SupabaseClient,
  id: string
): Promise<MutationResult> {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

// ─── Classes ────────────────────────────────────────────────────────────────

export type ClassInput = {
  title: string
  teacherId?: string | null
  classDate: string
  startTime: string
  endTime?: string
  capacity: number
  level: string
  status?: ClassStatus
  locationType?: ClassLocation
  address?: string | null
  teacherFee?: number
  classKind?: 'plan' | 'one_off'
  paymentId?: string
  studentId?: string
}

export async function createClassSession(
  supabase: SupabaseClient,
  input: ClassInput
): Promise<MutationResult<{ id: string }>> {
  let teacherFee = input.teacherFee
  const locationType = input.locationType ?? 'local'

  if (teacherFee === undefined) {
    if (!input.teacherId) {
      teacherFee = 0
    } else {
      const { data: settings } = await supabase
        .from('academy_settings')
        .select('rate_local, rate_domicilio')
        .eq('id', 1)
        .maybeSingle()

      teacherFee =
        locationType === 'domicilio'
          ? Number(settings?.rate_domicilio ?? 50_000)
          : Number(settings?.rate_local ?? 30_000)
    }
  }

  const { data, error } = await supabase
    .from('class_sessions')
    .insert({
      title: input.title.trim(),
      teacher_id: input.teacherId || null,
      class_date: input.classDate,
      start_time: input.startTime,
      end_time: input.endTime || addHours(input.startTime),
      capacity: input.capacity,
      level: input.level,
      status: input.status ?? 'scheduled',
      location_type: locationType,
      address:
        locationType === 'domicilio' ? input.address?.trim() || null : null,
      teacher_fee: teacherFee,
      class_kind: input.classKind ?? 'plan',
      payment_id: input.paymentId || null,
      student_id: input.studentId || null,
    })
    .select('id')
    .single()

  if (error) return fail(error)
  return { ok: true, data: { id: data.id } }
}

export async function updateClassSession(
  supabase: SupabaseClient,
  id: string,
  input: Partial<ClassInput>
): Promise<MutationResult> {
  const payload: Record<string, unknown> = {}
  if (input.title !== undefined) payload.title = input.title.trim()
  if (input.teacherId !== undefined) {
    payload.teacher_id = input.teacherId || null
  }
  if (input.classDate !== undefined) payload.class_date = input.classDate
  if (input.startTime !== undefined) {
    payload.start_time = input.startTime
    payload.end_time = input.endTime || addHours(input.startTime)
  } else if (input.endTime !== undefined) {
    payload.end_time = input.endTime
  }
  if (input.capacity !== undefined) payload.capacity = input.capacity
  if (input.level !== undefined) payload.level = input.level
  if (input.status !== undefined) payload.status = input.status
  if (input.locationType !== undefined) payload.location_type = input.locationType
  if (input.studentId !== undefined) payload.student_id = input.studentId || null
  if (input.address !== undefined) {
    payload.address =
      (input.locationType ?? undefined) === 'local'
        ? null
        : input.address?.trim() || null
  }
  if (input.teacherFee !== undefined) payload.teacher_fee = input.teacherFee

  // Si cambia ubicación y no mandan fee, recalcular desde tarifas
  if (input.locationType !== undefined && input.teacherFee === undefined) {
    const { data: settings } = await supabase
      .from('academy_settings')
      .select('rate_local, rate_domicilio')
      .eq('id', 1)
      .maybeSingle()
    payload.teacher_fee =
      input.locationType === 'domicilio'
        ? Number(settings?.rate_domicilio ?? 50_000)
        : Number(settings?.rate_local ?? 30_000)
    if (input.locationType === 'local') {
      payload.address = null
    } else if (input.address !== undefined) {
      payload.address = input.address?.trim() || null
    }
  }

  const { error } = await supabase.from('class_sessions').update(payload).eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

export async function deleteClassSession(
  supabase: SupabaseClient,
  id: string
): Promise<MutationResult> {
  const { error } = await supabase.from('class_sessions').delete().eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

/** Marca la clase como pagada al profesor: registra historial y baja el saldo pendiente. */
export async function markTeacherClassPaid(
  supabase: SupabaseClient,
  classSessionId: string,
  method = 'Efectivo'
): Promise<MutationResult<{ amount: number }>> {
  const { data: session, error: sessErr } = await supabase
    .from('class_sessions')
    .select('id, title, class_date, teacher_id, teacher_fee, status, teacher_paid_at')
    .eq('id', classSessionId)
    .maybeSingle()

  if (sessErr || !session) return fail(sessErr || new Error('Clase no encontrada'))
  if (session.status === 'cancelled') {
    return fail(new Error('No se puede pagar una clase cancelada'))
  }
  if (!session.teacher_id) {
    return fail(new Error('La clase no tiene profesor asignado'))
  }
  if (session.teacher_paid_at) {
    return fail(new Error('Esta clase ya fue marcada como pagada al profesor'))
  }

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const classDate = String(session.class_date).slice(0, 10)
  if (classDate >= todayStr) {
    return fail(new Error('Solo se puede pagar cuando la fecha de la clase ya pasó'))
  }

  const amount = Number(session.teacher_fee ?? 0)
  if (amount <= 0) {
    return fail(new Error('Esta clase no tiene tarifa de profesor'))
  }

  const paidAt = new Date().toISOString()

  const { error: payErr } = await supabase.from('teacher_payouts').insert({
    teacher_id: session.teacher_id,
    class_session_id: session.id,
    class_title: session.title,
    class_date: classDate,
    amount,
    method,
    paid_at: paidAt,
  })

  if (payErr) return fail(payErr)

  const { error: updErr } = await supabase
    .from('class_sessions')
    .update({ teacher_paid_at: paidAt })
    .eq('id', session.id)

  if (updErr) return fail(updErr)

  return { ok: true, data: { amount } }
}

/** Elimina todas las clases de un alumno (sesiones individuales) y sus cupos.
 * En clases grupales solo quita la inscripción del alumno.
 * También desmarca classes_generated en pagos para poder re-agendar.
 */
export async function deleteAllStudentClasses(
  supabase: SupabaseClient,
  studentId: string
): Promise<MutationResult<{ count: number }>> {
  const toDelete = new Set<string>()

  const { data: owned, error: ownedErr } = await supabase
    .from('class_sessions')
    .select('id')
    .eq('student_id', studentId)

  if (ownedErr) return fail(ownedErr)
  for (const row of owned ?? []) toDelete.add(row.id)

  const { data: enrollments, error: enrErr } = await supabase
    .from('class_enrollments')
    .select('class_session_id')
    .eq('student_id', studentId)

  if (enrErr) return fail(enrErr)

  const enrolledIds = [...new Set((enrollments ?? []).map((e) => e.class_session_id))]
  const remaining = enrolledIds.filter((id) => !toDelete.has(id))

  if (remaining.length) {
    const { data: sessions, error: sessErr } = await supabase
      .from('class_sessions')
      .select('id, capacity')
      .in('id', remaining)

    if (sessErr) return fail(sessErr)

    for (const session of sessions ?? []) {
      if (Number(session.capacity) <= 1) {
        toDelete.add(session.id)
      } else {
        const { error: unenrollErr } = await supabase
          .from('class_enrollments')
          .delete()
          .eq('class_session_id', session.id)
          .eq('student_id', studentId)
        if (unenrollErr) return fail(unenrollErr)
      }
    }
  }

  const sessionIds = [...toDelete]
  if (sessionIds.length) {
    const { error: delErr } = await supabase
      .from('class_sessions')
      .delete()
      .in('id', sessionIds)
    if (delErr) return fail(delErr)
  }

  await supabase
    .from('payments')
    .update({
      classes_generated: false,
      plan_start_date: null,
      plan_end_date: null,
    })
    .eq('student_id', studentId)
    .eq('classes_generated', true)

  return { ok: true, data: { count: sessionIds.length } }
}

// ─── Payments ───────────────────────────────────────────────────────────────

export type PaymentInput = {
  studentId: string
  parentId: string
  amount: number
  planType: PlanType
  dueDate: string
  status?: PaymentStatus
  method?: string
  paidDate?: string | null
  invoiceNumber?: string
}

export async function createPayment(
  supabase: SupabaseClient,
  input: PaymentInput
): Promise<MutationResult<{ id: string }>> {
  const status = input.status ?? 'pending'
  const { data, error } = await supabase
    .from('payments')
    .insert({
      student_id: input.studentId,
      parent_id: input.parentId,
      amount: input.amount,
      plan_type: input.planType,
      due_date: input.dueDate,
      status,
      method: input.method ?? 'Pendiente',
      paid_date: status === 'paid' ? input.paidDate || new Date().toISOString().slice(0, 10) : null,
      invoice_number: input.invoiceNumber || generateInvoiceNumber(),
    })
    .select('id')
    .single()

  if (error) return fail(error)
  await syncStudentPaymentStatus(supabase, input.studentId)
  return { ok: true, data: { id: data.id } }
}

export async function updatePayment(
  supabase: SupabaseClient,
  id: string,
  input: Partial<PaymentInput>
): Promise<MutationResult> {
  const payload: Record<string, unknown> = {}
  if (input.studentId !== undefined) payload.student_id = input.studentId
  if (input.parentId !== undefined) payload.parent_id = input.parentId
  if (input.amount !== undefined) payload.amount = input.amount
  if (input.planType !== undefined) payload.plan_type = input.planType
  if (input.dueDate !== undefined) payload.due_date = input.dueDate
  if (input.method !== undefined) payload.method = input.method
  if (input.status !== undefined) {
    payload.status = input.status
    if (input.status === 'paid') {
      payload.paid_date = input.paidDate || new Date().toISOString().slice(0, 10)
    } else {
      payload.paid_date = null
    }
  } else if (input.paidDate !== undefined) {
    payload.paid_date = input.paidDate
  }

  const { error } = await supabase.from('payments').update(payload).eq('id', id)
  if (error) return fail(error)

  const studentId =
    input.studentId ??
    (
      await supabase.from('payments').select('student_id').eq('id', id).maybeSingle()
    ).data?.student_id

  if (studentId) {
    await syncStudentPaymentStatus(supabase, studentId)
  }

  return { ok: true, data: undefined }
}

export async function markPaymentPaid(
  supabase: SupabaseClient,
  id: string,
  method = 'Efectivo'
): Promise<MutationResult> {
  const result = await updatePayment(supabase, id, {
    status: 'paid',
    method,
    paidDate: new Date().toISOString().slice(0, 10),
  })

  return result
}

export async function assignTeacherToClass(
  supabase: SupabaseClient,
  classId: string,
  teacherId: string,
  locationType?: ClassLocation
): Promise<MutationResult> {
  const { data: settings } = await supabase
    .from('academy_settings')
    .select('rate_local, rate_domicilio')
    .eq('id', 1)
    .maybeSingle()

  let fee = Number(settings?.rate_local ?? 30_000)
  if (locationType === 'domicilio') {
    fee = Number(settings?.rate_domicilio ?? 50_000)
  } else if (!locationType) {
    const { data: session } = await supabase
      .from('class_sessions')
      .select('location_type')
      .eq('id', classId)
      .maybeSingle()
    if (session?.location_type === 'domicilio') {
      fee = Number(settings?.rate_domicilio ?? 50_000)
    }
  }

  return updateClassSession(supabase, classId, {
    teacherId,
    teacherFee: fee,
    locationType,
  })
}

export type GeneratePlanClassesInput = {
  paymentId: string
  weekdays: number[]
  startTime: string
  teacherId?: string | null
  locationType?: ClassLocation
  address?: string
  startDate?: string
}

/** Tras pagar un plan: genera todas las clases del periodo e inscribe al alumno. */
export async function generateClassesFromPayment(
  supabase: SupabaseClient,
  input: GeneratePlanClassesInput
): Promise<MutationResult<{ count: number; planEndDate: string }>> {
  const { generateClassDates, toISODateLocal, addHoursToTime } = await import(
    '@/lib/schedule'
  )

  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('id', input.paymentId)
    .maybeSingle()

  if (payErr || !payment) return fail(payErr || new Error('Pago no encontrado'))
  if (payment.classes_generated) {
    return fail(new Error('Este pago ya tiene clases generadas'))
  }

  const { data: student, error: stuErr } = await supabase
    .from('students')
    .select('id, name, level, teacher_id, plan_config_id, plan_type, address')
    .eq('id', payment.student_id)
    .maybeSingle()

  if (stuErr || !student) return fail(stuErr || new Error('Alumno no encontrado'))

  let classesPerWeek = 1
  let durationMonths = 1
  let planType = payment.plan_type as string
  const planId = student.plan_config_id as string | null
  if (planId) {
    const { data: plan } = await supabase
      .from('plan_configs')
      .select('classes_per_week, duration_months, label, plan_type')
      .eq('id', planId)
      .maybeSingle()
    if (plan) {
      classesPerWeek = Number(plan.classes_per_week ?? 1)
      durationMonths = Number(plan.duration_months ?? 1)
      planType = (plan.plan_type as string) || planType
    }
  } else {
    const { data: plan } = await supabase
      .from('plan_configs')
      .select('classes_per_week, duration_months, plan_type')
      .eq('plan_type', payment.plan_type)
      .order('sort_order')
      .limit(1)
      .maybeSingle()
    if (plan) {
      classesPerWeek = Number(plan.classes_per_week ?? 1)
      durationMonths = Number(plan.duration_months ?? 1)
      planType = (plan.plan_type as string) || planType
    }
  }

  const isOneOff = planType === 'one_off'

  if (isOneOff) {
    classesPerWeek = 1
  }

  if (input.weekdays.length !== classesPerWeek) {
    return fail(
      new Error(
        isOneOff
          ? 'La clase única solo permite 1 día'
          : `Este plan requiere ${classesPerWeek} día(s) de la semana (elegiste ${input.weekdays.length})`
      )
    )
  }

  const start = input.startDate
    ? new Date(input.startDate + 'T12:00:00')
    : new Date()
  // Mensual = 4 por día; clase única = exactamente 1 clase
  const countPerWeekday = isOneOff ? 1 : 4 * durationMonths

  const dates = generateClassDates({
    startDate: start,
    weekdays: input.weekdays as import('@/lib/schedule').Weekday[],
    countPerWeekday,
  })

  if (!dates.length) {
    return fail(new Error('No se generaron fechas. Revisa los días elegidos.'))
  }

  if (isOneOff && dates.length > 1) {
    dates.length = 1
  }

  const teacherId = input.teacherId !== undefined ? input.teacherId : student.teacher_id
  const locationType = input.locationType ?? 'local'
  const address =
    locationType === 'domicilio'
      ? (input.address?.trim() || (student.address as string) || null)
      : null

  let teacherFee = 0
  if (teacherId) {
    const { data: settings } = await supabase
      .from('academy_settings')
      .select('rate_local, rate_domicilio')
      .eq('id', 1)
      .maybeSingle()
    teacherFee =
      locationType === 'domicilio'
        ? Number(settings?.rate_domicilio ?? 50_000)
        : Number(settings?.rate_local ?? 30_000)
  }

  const startTime = input.startTime || '09:00'
  const endTime = addHoursToTime(startTime)
  const planStart = toISODateLocal(start)
  const planEnd = dates[dates.length - 1]

  const rows = dates.map((classDate) => ({
    title: isOneOff ? `${student.name} · clase única` : `${student.name} · plan`,
    teacher_id: teacherId || null,
    class_date: classDate,
    start_time: startTime,
    end_time: endTime,
    capacity: 1,
    level: student.level || 'Principiante',
    status: 'scheduled' as const,
    location_type: locationType,
    address,
    teacher_fee: teacherFee,
    class_kind: (isOneOff ? 'one_off' : 'plan') as 'one_off' | 'plan',
    payment_id: input.paymentId,
    student_id: student.id,
  }))

  const { data: created, error: insertErr } = await supabase
    .from('class_sessions')
    .insert(rows)
    .select('id')

  if (insertErr) return fail(insertErr)

  const enrollments = (created ?? []).map((c) => ({
    class_session_id: c.id,
    student_id: student.id,
    status: 'reserved' as const,
  }))

  if (enrollments.length) {
    const { error: enrErr } = await supabase.from('class_enrollments').insert(enrollments)
    if (enrErr) return fail(enrErr)
  }

  await supabase
    .from('payments')
    .update({
      classes_generated: true,
      plan_start_date: planStart,
      plan_end_date: planEnd,
    })
    .eq('id', input.paymentId)

  await supabase
    .from('students')
    .update({
      preferred_weekdays: input.weekdays,
      preferred_start_time: startTime,
      ...(teacherId ? { teacher_id: teacherId } : {}),
    })
    .eq('id', student.id)

  return { ok: true, data: { count: dates.length, planEndDate: planEnd } }
}

/** Clase única (sin plan): un día concreto. */
export async function createOneOffClass(
  supabase: SupabaseClient,
  input: {
    studentId: string
    classDate: string
    startTime: string
    teacherId?: string | null
    locationType?: ClassLocation
    address?: string
    title?: string
    level?: string
  }
): Promise<MutationResult<{ id: string }>> {
  const { data: student } = await supabase
    .from('students')
    .select('id, name, level, teacher_id, address')
    .eq('id', input.studentId)
    .maybeSingle()

  if (!student) return fail(new Error('Alumno no encontrado'))

  const teacherId = input.teacherId !== undefined ? input.teacherId : student.teacher_id
  const locationType = input.locationType ?? 'local'
  const address =
    locationType === 'domicilio'
      ? (input.address?.trim() || (student.address as string) || null)
      : null

  const result = await createClassSession(supabase, {
    title: input.title?.trim() || `${student.name} · clase única`,
    teacherId: teacherId || null,
    classDate: input.classDate,
    startTime: input.startTime,
    capacity: 1,
    level: input.level || student.level || 'Principiante',
    locationType,
    address,
    classKind: 'one_off',
    studentId: student.id,
  })

  if (!result.ok) return result

  await supabase.from('class_enrollments').insert({
    class_session_id: result.data.id,
    student_id: student.id,
    status: 'reserved',
  })

  return result
}

/** Renueva el plan: crea pago pendiente y opcionalmente agenda clases. */
export async function renewStudentPlan(
  supabase: SupabaseClient,
  input: {
    studentId: string
    planConfigId?: string
    generateClasses?: boolean
    weekdays?: number[]
    startTime?: string
    teacherId?: string | null
    locationType?: ClassLocation
  }
): Promise<MutationResult<{ paymentId: string; classesCreated?: number }>> {
  const { data: student } = await supabase
    .from('students')
    .select('id, parent_id, plan_type, plan_config_id, teacher_id, preferred_weekdays, preferred_start_time')
    .eq('id', input.studentId)
    .maybeSingle()

  if (!student) return fail(new Error('Alumno no encontrado'))

  const planConfigId = input.planConfigId || student.plan_config_id
  let planType = student.plan_type as PlanType

  if (planConfigId) {
    const { data: plan } = await supabase
      .from('plan_configs')
      .select('plan_type')
      .eq('id', planConfigId)
      .maybeSingle()
    if (plan) planType = plan.plan_type as PlanType
  }

  const paymentResult = await createPendingPaymentForStudent(supabase, {
    studentId: student.id,
    parentId: student.parent_id,
    planType,
    planConfigId: planConfigId || undefined,
  })

  if (!paymentResult.ok) return paymentResult

  await supabase
    .from('students')
    .update({ payment_status: 'pending', plan_config_id: planConfigId })
    .eq('id', student.id)

  if (!input.generateClasses) {
    return { ok: true, data: { paymentId: paymentResult.data.id } }
  }

  // Marcar como pagado implícitamente solo si quieren generar ya (admin confirma cobro)
  await markPaymentPaid(supabase, paymentResult.data.id)

  const weekdays =
    input.weekdays?.length
      ? input.weekdays
      : ((student.preferred_weekdays as number[]) || [])

  const gen = await generateClassesFromPayment(supabase, {
    paymentId: paymentResult.data.id,
    weekdays,
    startTime: input.startTime || student.preferred_start_time || '09:00',
    teacherId: input.teacherId ?? student.teacher_id,
    locationType: input.locationType,
  })

  if (!gen.ok) {
    return { ok: true, data: { paymentId: paymentResult.data.id } }
  }

  return {
    ok: true,
    data: { paymentId: paymentResult.data.id, classesCreated: gen.data.count },
  }
}

export async function deletePayment(
  supabase: SupabaseClient,
  id: string
): Promise<MutationResult> {
  const { data: payment } = await supabase
    .from('payments')
    .select('student_id')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) return fail(error)

  if (payment?.student_id) {
    await syncStudentPaymentStatus(supabase, payment.student_id)
  }

  return { ok: true, data: undefined }
}

// ─── Settings: levels ───────────────────────────────────────────────────────

export type LevelInput = {
  label: string
  sortOrder?: number
  isActive?: boolean
}

export async function createLevel(
  supabase: SupabaseClient,
  input: LevelInput
): Promise<MutationResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('student_levels')
    .insert({
      label: input.label.trim(),
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select('id')
    .single()

  if (error) return fail(error)
  return { ok: true, data: { id: data.id } }
}

export async function updateLevel(
  supabase: SupabaseClient,
  id: string,
  input: LevelInput
): Promise<MutationResult> {
  const { error } = await supabase
    .from('student_levels')
    .update({
      label: input.label.trim(),
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .eq('id', id)

  if (error) return fail(error)
  return { ok: true, data: undefined }
}

export async function deleteLevel(
  supabase: SupabaseClient,
  id: string
): Promise<MutationResult> {
  const { error } = await supabase.from('student_levels').delete().eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

// ─── Settings: plans ────────────────────────────────────────────────────────

export type PlanConfigInput = {
  planType: PlanType
  label: string
  price: number
  durationMonths: number
  classesPerWeek?: number
  sortOrder?: number
  isActive?: boolean
}

export async function createPlanConfig(
  supabase: SupabaseClient,
  input: PlanConfigInput
): Promise<MutationResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('plan_configs')
    .insert({
      plan_type: input.planType,
      label: input.label.trim(),
      price: input.price,
      duration_months: input.durationMonths,
      classes_per_week: input.classesPerWeek ?? 1,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
    })
    .select('id')
    .single()

  if (error) return fail(error)
  return { ok: true, data: { id: data.id } }
}

export async function updatePlanConfig(
  supabase: SupabaseClient,
  id: string,
  input: Partial<PlanConfigInput>
): Promise<MutationResult> {
  const payload: Record<string, unknown> = {}
  if (input.planType !== undefined) payload.plan_type = input.planType
  if (input.label !== undefined) payload.label = input.label.trim()
  if (input.price !== undefined) payload.price = input.price
  if (input.durationMonths !== undefined) payload.duration_months = input.durationMonths
  if (input.classesPerWeek !== undefined) payload.classes_per_week = input.classesPerWeek
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder
  if (input.isActive !== undefined) payload.is_active = input.isActive

  const { error } = await supabase.from('plan_configs').update(payload).eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

export async function deletePlanConfig(
  supabase: SupabaseClient,
  id: string
): Promise<MutationResult> {
  const { error } = await supabase.from('plan_configs').delete().eq('id', id)
  if (error) return fail(error)
  return { ok: true, data: undefined }
}

export async function updateAcademySettings(
  supabase: SupabaseClient,
  input: { rateLocal: number; rateDomicilio: number }
): Promise<MutationResult> {
  const { error } = await supabase.from('academy_settings').upsert({
    id: 1,
    rate_local: input.rateLocal,
    rate_domicilio: input.rateDomicilio,
  })

  if (error) return fail(error)
  return { ok: true, data: undefined }
}

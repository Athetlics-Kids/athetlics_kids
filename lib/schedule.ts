/** Utilidades de agenda: generar fechas de clases a partir de un plan. */

export const WEEKDAY_LABELS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

/** 0 = domingo … 6 = sábado (igual que Date.getDay()) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setMonth(d.getMonth() + months)
  return d
}

export function toISODateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Genera exactamente `countPerWeekday` fechas por cada día elegido,
 * a partir de startDate (inclusive si coincide).
 * Plan mensual = 4 clases por día de la semana (ej. 4 jueves).
 */
export function generateClassDates(options: {
  startDate: Date
  weekdays: Weekday[]
  /** Cuántas ocurrencias por cada weekday (default 4 = 1 mes) */
  countPerWeekday?: number
}): string[] {
  const { startDate, weekdays, countPerWeekday = 4 } = options
  if (!weekdays.length || countPerWeekday < 1) return []

  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate()
  )

  const dates: string[] = []

  for (const weekday of weekdays) {
    const cursor = new Date(start)
    // Primer día >= start que cae en ese weekday
    const delta = (weekday - cursor.getDay() + 7) % 7
    cursor.setDate(cursor.getDate() + delta)

    for (let i = 0; i < countPerWeekday; i++) {
      dates.push(toISODateLocal(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }
  }

  dates.sort()
  return dates
}

export function addHoursToTime(time: string, hours = 1): string {
  const [h, m] = time.split(':').map(Number)
  const next = (h + hours) % 24
  return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

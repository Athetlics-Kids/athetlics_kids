import { format as dateFnsFormat } from 'date-fns'
import { es } from 'date-fns/locale'

export const APP_LOCALE = 'es-CO'
export const APP_CURRENCY = 'COP'
export const dateLocale = es

export const PHONE_PLACEHOLDER = '+57 300 216 0196'

export const PLAN_PRICES = {
  monthly: 180_000,
  quarterly: 480_000,
  semiannual: 900_000,
  annual: 1_680_000,
  one_off: 50_000,
} as const

export function formatCurrency(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) {
  return new Intl.NumberFormat(APP_LOCALE, {
    style: 'currency',
    currency: APP_CURRENCY,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0,
  }).format(value)
}

export function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toLocaleString(APP_LOCALE, { maximumFractionDigits: 1 })} M`
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000).toLocaleString(APP_LOCALE)} mil`
  }
  return formatCurrency(value)
}

export function formatDate(
  date: Date | string | number,
  pattern: string
) {
  return dateFnsFormat(new Date(date), pattern, { locale: dateLocale })
}

/** Format a Date for <input type="date"> without UTC shift. */
export function toInputDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatPlanLabel(plan: keyof typeof PLAN_PRICES) {
  const labels = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
    one_off: 'Clase única',
  }

  return `${labels[plan]} - ${formatCurrency(PLAN_PRICES[plan])}`
}

export function formatPlanConfigLabel(
  label: string,
  price: number,
  classesPerWeek?: number
) {
  const freq =
    classesPerWeek && classesPerWeek > 0
      ? ` · ${classesPerWeek} clase${classesPerWeek === 1 ? '' : 's'}/sem`
      : ''
  // Si el label ya incluye la frecuencia, no duplicar
  const hasFreq = /clase/i.test(label)
  return `${label}${hasFreq ? '' : freq} - ${formatCurrency(price)}`
}

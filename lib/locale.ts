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

export function formatPlanLabel(plan: keyof typeof PLAN_PRICES) {
  const labels = {
    monthly: 'Mensual',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
  }

  return `${labels[plan]} - ${formatCurrency(PLAN_PRICES[plan])}`
}

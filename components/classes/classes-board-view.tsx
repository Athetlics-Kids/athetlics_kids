'use client'

import { isSameDay } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/locale'
import { cn } from '@/lib/utils'
import type { ClassSession } from '@/types'

type BoardColumnId =
  | 'pending'
  | 'confirmed'
  | 'today'
  | 'paid'
  | 'cancelled'

type BoardColumn = {
  id: BoardColumnId
  label: string
  badgeClass: string
  emptyLabel: string
}

const COLUMNS: BoardColumn[] = [
  {
    id: 'pending',
    label: 'Sin profesor',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    emptyLabel: 'Sin clases',
  },
  {
    id: 'confirmed',
    label: 'Agendadas',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    emptyLabel: 'Sin clases',
  },
  {
    id: 'today',
    label: 'Hoy',
    badgeClass: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
    emptyLabel: 'Sin clases hoy',
  },
  {
    id: 'paid',
    label: 'Pagadas',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    emptyLabel: 'Sin pagos',
  },
  {
    id: 'cancelled',
    label: 'Canceladas',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    emptyLabel: 'Sin canceladas',
  },
]

function columnForSession(session: ClassSession, today: Date): BoardColumnId {
  if (session.status === 'cancelled') return 'cancelled'
  if (session.teacherPaidAt) return 'paid'
  if (isSameDay(session.date, today)) return 'today'
  if (!session.teacherId || session.teacherName === 'Sin profesor') return 'pending'
  return 'confirmed'
}

type ClassesBoardViewProps = {
  sessions: ClassSession[]
  onSelect: (session: ClassSession) => void
}

export function ClassesBoardView({ sessions, onSelect }: ClassesBoardViewProps) {
  const today = new Date()

  const grouped = COLUMNS.map((col) => {
    const items = sessions
      .filter((s) => columnForSession(s, today) === col.id)
      .sort((a, b) => {
        const byDate = a.date.getTime() - b.date.getTime()
        if (byDate !== 0) return byDate
        return a.startTime.localeCompare(b.startTime)
      })
    const totalFee = items.reduce((sum, s) => sum + (s.teacherFee || 0), 0)
    return { ...col, items, totalFee }
  })

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {grouped.map((col) => (
          <div
            key={col.id}
            className="flex w-[280px] shrink-0 flex-col rounded-xl border border-border bg-card"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <div className="flex items-center gap-2">
                <Badge className={cn('font-medium hover:opacity-100', col.badgeClass)}>
                  {col.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{col.items.length}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {formatCurrency(col.totalFee)}
              </span>
            </div>

            <div className="flex max-h-[620px] flex-col gap-2 overflow-y-auto p-3">
              {col.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
                  {col.emptyLabel}
                </p>
              ) : (
                col.items.map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => onSelect(session)}
                    className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <p className="font-medium leading-snug">{session.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.teacherName}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatDate(session.date, 'd MMM')} · {session.startTime}
                      </span>
                      {session.locationType === 'domicilio' && (
                        <span className="text-amber-700 dark:text-amber-400">Domicilio</span>
                      )}
                    </div>
                    {session.teacherFee > 0 && (
                      <p className="mt-2 text-sm font-semibold">
                        {formatCurrency(session.teacherFee)}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

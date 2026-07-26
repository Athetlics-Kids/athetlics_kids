'use client'

import { useMemo, useState } from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency, formatDate } from '@/lib/locale'
import { cn } from '@/lib/utils'
import type { ClassSession, Student } from '@/types'

type ClassesListViewProps = {
  sessions: ClassSession[]
  students: Student[]
  onSelect: (session: ClassSession) => void
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function estadoBadge(session: ClassSession) {
  if (session.status === 'cancelled') {
    return {
      label: 'Cancelada',
      className: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    }
  }
  if (session.teacherPaidAt) {
    return {
      label: 'Pagada',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    }
  }
  if (!session.teacherId || session.teacherName === 'Sin profesor') {
    return {
      label: 'Pendiente',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    }
  }
  return {
    label: 'Confirmada',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  }
}

function pagoBadge(session: ClassSession) {
  if (session.status === 'cancelled') {
    return {
      label: '—',
      className: 'bg-muted text-muted-foreground',
    }
  }
  if (session.teacherPaidAt) {
    return {
      label: 'Pagado',
      className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    }
  }
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const dateKey = `${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(session.date.getDate()).padStart(2, '0')}`
  if (session.teacherId && dateKey <= todayKey) {
    return {
      label: 'Pendiente',
      className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    }
  }
  return {
    label: 'Por cobrar',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  }
}

export function ClassesListView({
  sessions,
  students,
  onSelect,
}: ClassesListViewProps) {
  const [search, setSearch] = useState('')

  const studentById = useMemo(() => {
    const map = new Map(students.map((s) => [s.id, s]))
    return map
  }, [students])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const sorted = [...sessions].sort((a, b) => {
      const byDate = b.date.getTime() - a.date.getTime()
      if (byDate !== 0) return byDate
      return a.startTime.localeCompare(b.startTime)
    })
    if (!q) return sorted
    return sorted.filter((session) => {
      const student =
        (session.studentId && studentById.get(session.studentId)) ||
        students.find((s) => session.students.includes(s.id))
      const haystack = [
        session.title,
        session.teacherName,
        student?.name,
        session.level,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [sessions, search, studentById, students])

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Clases</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} clase{rows.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por alumno, clase..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Clase</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium">Tarifa</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No hay clases para mostrar
                </td>
              </tr>
            ) : (
              rows.map((session) => {
                const student =
                  (session.studentId && studentById.get(session.studentId)) ||
                  students.find((s) => session.students.includes(s.id))
                const displayName = student?.name ?? session.teacherName
                const secondary = student
                  ? session.teacherName
                  : `${session.enrolled} inscrito(s)`
                const estado = estadoBadge(session)
                const pago = pagoBadge(session)

                return (
                  <tr
                    key={session.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(displayName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{displayName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {secondary}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{session.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.startTime} - {session.endTime}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {formatDate(session.date, 'd MMM yyyy')}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {formatDate(session.date, 'EEEE')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          'font-medium hover:opacity-100',
                          estado.className
                        )}
                      >
                        {estado.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          'font-medium hover:opacity-100',
                          pago.className
                        )}
                      >
                        {pago.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {formatCurrency(session.teacherFee || 0)}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onSelect(session)}>
                            Ver detalle
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

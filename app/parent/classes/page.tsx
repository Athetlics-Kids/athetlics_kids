'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Calendar, ChevronLeft, ChevronRight, Clock, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardCard, LevelBadge } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchClassSessions } from '@/lib/supabase/data'
import { formatDate } from '@/lib/locale'
import { addDays, startOfWeek, isSameDay } from 'date-fns'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function ParentClassesPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const { data: classSessions = [] } = useSupabaseLoader((client) => fetchClassSessions(client))
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/parent">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clases de mis Hijos</h1>
          <p className="text-muted-foreground">
            Consulta y reserva clases para tus hijos
          </p>
        </div>
      </div>

      {/* Week Navigation */}
      <DashboardCard title="Calendario Semanal" description="Selecciona un día para ver las clases disponibles">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {formatDate(weekStart, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {weekDays.map((day) => (
              <button
                key={day.toISOString()}
                onClick={() => setCurrentDate(day)}
                className={cn(
                  'rounded-lg p-1.5 text-center transition-colors sm:p-3',
                  isSameDay(day, currentDate)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                  isSameDay(day, new Date()) && !isSameDay(day, currentDate) && 'ring-2 ring-primary'
                )}
              >
                <p className="text-[10px] uppercase sm:text-xs">{formatDate(day, 'EEE')}</p>
                <p className="text-base font-bold sm:text-lg">{formatDate(day, 'd')}</p>
              </button>
            ))}
          </div>
        </div>
      </DashboardCard>

      {/* Classes List */}
      <DashboardCard
        title={`Clases del ${formatDate(currentDate, 'EEEE d MMMM')}`}
        description="Clases disponibles para reservar"
      >
        <div className="space-y-4">
          {classSessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{session.title}</h3>
                  <p className="text-sm text-muted-foreground">{session.teacherName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <LevelBadge level={session.level} />
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {session.startTime} - {session.endTime}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                  <div className="flex items-center gap-1 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{session.enrolled}/{session.capacity}</span>
                  </div>
                  <div className="mt-1 h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full transition-all',
                        session.enrolled / session.capacity > 0.9
                          ? 'bg-red-500'
                          : session.enrolled / session.capacity > 0.7
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      )}
                      style={{ width: `${(session.enrolled / session.capacity) * 100}%` }}
                    />
                  </div>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  disabled={session.enrolled >= session.capacity}
                  variant={session.enrolled >= session.capacity ? 'outline' : 'default'}
                >
                  {session.enrolled >= session.capacity ? 'Lleno' : 'Reservar'}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </DashboardCard>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronLeft, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { DashboardCard, LevelBadge, PaymentStatusBadge, NoStudents } from '@/components/dashboard'
import { useSupabaseLoader } from '@/hooks/use-async-data'
import { fetchParents, fetchStudents } from '@/lib/supabase/data'
import { useRequireRole } from '@/contexts/auth-context'

export default function TeacherStudentsPage() {
  const user = useRequireRole('teacher')
  const { data: students = [] } = useSupabaseLoader((client) => fetchStudents(client))
  const { data: parents = [] } = useSupabaseLoader((client) => fetchParents(client))
  const myStudents = user.teacherId
    ? students.filter((s) => s.teacherId === user.teacherId)
    : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Alumnos</h1>
          <p className="text-muted-foreground">
            {myStudents.length} alumnos asignados
          </p>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {myStudents.length === 0 ? (
          <div className="col-span-full">
            <NoStudents />
          </div>
        ) : (
        myStudents.map((student, i) => {
          const parent = parents.find((p) => p.id === student.parentId)

          return (
            <motion.div
              key={student.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <DashboardCard
                title={student.name}
                description={`${student.age} años`}
              >
                <div className="space-y-4">
                  {/* Student Info */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={student.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {student.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <LevelBadge level={student.level} />
                        <PaymentStatusBadge status={student.paymentStatus} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>Progreso</span>
                          <span className="font-medium">{student.progress}%</span>
                        </div>
                        <Progress value={student.progress} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Parent Contact */}
                  {parent && (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                      <p className="text-sm font-medium">Contacto del padre/tutor</p>
                      <p className="text-sm">{parent.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {parent.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {parent.phone}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </DashboardCard>
            </motion.div>
          )
        })
        )}
      </div>
    </div>
  )
}

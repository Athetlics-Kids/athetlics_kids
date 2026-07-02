-- Athletic Kids - Vaciar datos (mantiene tablas, vistas, RLS y funciones)
-- Ejecutar en Supabase SQL Editor cuando quieras dejar la BD sin registros.

begin;

truncate table
  public.notifications,
  public.attendance_records,
  public.class_enrollments,
  public.payments,
  public.class_sessions,
  public.students,
  public.teacher_schedules,
  public.teachers,
  public.parents,
  public.profiles
restart identity cascade;

commit;

-- Nota: esto NO borra usuarios de auth.users.
-- Si también quieres limpiar cuentas de login, hazlo desde:
-- Authentication > Users en el dashboard de Supabase.

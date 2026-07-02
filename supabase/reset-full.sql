-- Athletic Kids - Reset completo del esquema public
-- Borra tablas, vistas, funciones y enums. Luego ejecuta schema.sql de nuevo.

begin;

drop view if exists public.dashboard_stats cascade;
drop view if exists public.teacher_summaries cascade;
drop view if exists public.payment_details cascade;
drop view if exists public.class_session_details cascade;
drop view if exists public.student_details cascade;

drop table if exists public.notifications cascade;
drop table if exists public.attendance_records cascade;
drop table if exists public.class_enrollments cascade;
drop table if exists public.payments cascade;
drop table if exists public.class_sessions cascade;
drop table if exists public.students cascade;
drop table if exists public.teacher_schedules cascade;
drop table if exists public.teachers cascade;
drop table if exists public.parents cascade;
drop table if exists public.profiles cascade;

drop function if exists public.prevent_class_overbooking() cascade;
drop function if exists public.current_parent_id() cascade;
drop function if exists public.current_teacher_id() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.set_updated_at() cascade;

drop type if exists public.notification_type cascade;
drop type if exists public.enrollment_status cascade;
drop type if exists public.class_status cascade;
drop type if exists public.plan_type cascade;
drop type if exists public.payment_status cascade;
drop type if exists public.user_role cascade;

commit;

-- Después de esto, ejecuta supabase/schema.sql para recrear todo limpio.

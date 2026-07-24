-- Dirección del alumno y de la clase (para domicilio)

alter table public.students
  add column if not exists address text;

alter table public.class_sessions
  add column if not exists address text;

-- Vista alumnos
drop view if exists public.student_details;
create or replace view public.student_details
with (security_invoker = true) as
select
  s.id,
  s.name,
  s.age,
  s.avatar_url,
  s.parent_id,
  p.name as parent_name,
  s.teacher_id,
  t.name as teacher_name,
  s.plan_type,
  s.payment_status,
  s.enrolled_at,
  s.progress,
  s.level,
  s.address,
  s.created_at,
  s.updated_at
from public.students s
join public.parents p on p.id = s.parent_id
join public.teachers t on t.id = s.teacher_id;

-- Vista clases: incluir address
drop view if exists public.class_session_details;
create or replace view public.class_session_details
with (security_invoker = true) as
select
  c.id,
  c.title,
  c.teacher_id,
  coalesce(t.name, 'Sin profesor') as teacher_name,
  c.class_date,
  c.start_time,
  c.end_time,
  c.capacity,
  count(e.id) filter (where e.status in ('reserved', 'attended'))::integer as enrolled,
  c.status,
  coalesce(array_agg(e.student_id) filter (where e.student_id is not null), '{}') as students,
  c.level,
  c.location_type,
  c.teacher_fee,
  c.class_kind,
  c.payment_id,
  c.student_id,
  c.teacher_paid_at,
  c.address,
  c.created_at,
  c.updated_at
from public.class_sessions c
left join public.teachers t on t.id = c.teacher_id
left join public.class_enrollments e on e.class_session_id = c.id
group by c.id, t.name;

-- Soft-delete de alumnos: inactivar sin borrar pagos ni pagos

alter table public.students
  add column if not exists is_active boolean not null default true;

-- Si se aplicó el cascade anterior por error, volver a restrict
-- para no borrar pagos al eliminar un alumno en SQL.
do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'payments'
      and constraint_name = 'payments_student_id_fkey'
  ) then
    alter table public.payments drop constraint payments_student_id_fkey;
  end if;
end $$;

alter table public.payments
  add constraint payments_student_id_fkey
  foreign key (student_id)
  references public.students(id)
  on delete restrict;

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
  s.is_active,
  s.created_at,
  s.updated_at
from public.students s
join public.parents p on p.id = s.parent_id
join public.teachers t on t.id = s.teacher_id;

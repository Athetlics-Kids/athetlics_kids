-- Athletic Kids - Agenda automática por plan + clase única + sin profesor
-- Seguro si aún no corriste accounting: crea location_type / teacher_fee si faltan.

-- ---------------------------------------------------------------------------
-- Dependencias de accounting (idempotente)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.class_location as enum ('local', 'domicilio');
exception
  when duplicate_object then null;
end $$;

alter table public.class_sessions
  add column if not exists location_type public.class_location not null default 'local';

alter table public.class_sessions
  add column if not exists teacher_fee numeric(12, 2) not null default 0 check (teacher_fee >= 0);

-- Profesor opcional (clases "sin profesor" hasta asignar)
alter table public.class_sessions
  alter column teacher_id drop not null;

-- Tipo de clase y vínculo al pago del plan
do $$ begin
  create type public.class_kind as enum ('plan', 'one_off');
exception
  when duplicate_object then null;
end $$;

alter table public.class_sessions
  add column if not exists class_kind public.class_kind not null default 'plan';

alter table public.class_sessions
  add column if not exists payment_id uuid references public.payments(id) on delete set null;

alter table public.class_sessions
  add column if not exists student_id uuid references public.students(id) on delete set null;

-- Día(s) preferidos del alumno para el plan (0=dom … 6=sáb) como array
alter table public.students
  add column if not exists preferred_weekdays integer[] default '{}';

alter table public.students
  add column if not exists preferred_start_time time default '09:00';

-- Marca si ya se generaron las clases de un pago
alter table public.payments
  add column if not exists classes_generated boolean not null default false;

alter table public.payments
  add column if not exists plan_start_date date;

alter table public.payments
  add column if not exists plan_end_date date;

create index if not exists class_sessions_teacher_id_null_idx
  on public.class_sessions (class_date)
  where teacher_id is null;

create index if not exists class_sessions_payment_id_idx
  on public.class_sessions (payment_id);

-- Vista: permitir teacher null
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
  c.created_at,
  c.updated_at
from public.class_sessions c
left join public.teachers t on t.id = c.teacher_id
left join public.class_enrollments e on e.class_session_id = c.id
group by c.id, t.name;

-- Incluir flags de agenda en pagos
drop view if exists public.payment_details;
create or replace view public.payment_details
with (security_invoker = true) as
select
  pay.id,
  pay.student_id,
  s.name as student_name,
  pay.parent_id,
  p.name as parent_name,
  pay.amount,
  pay.status,
  pay.method,
  pay.plan_type,
  pay.due_date,
  pay.paid_date,
  pay.invoice_number,
  pay.classes_generated,
  pay.plan_start_date,
  pay.plan_end_date,
  pay.created_at,
  pay.updated_at
from public.payments pay
join public.students s on s.id = pay.student_id
join public.parents p on p.id = pay.parent_id;

-- Ganancias: solo clases con profesor y no canceladas
create or replace view public.teacher_summaries
with (security_invoker = true) as
select
  t.id,
  t.user_id,
  t.name,
  t.email,
  t.avatar_url,
  t.specialty,
  t.phone,
  t.is_active,
  count(distinct s.id)::integer as students_count,
  coalesce(
    (
      select sum(c.teacher_fee)
      from public.class_sessions c
      where c.teacher_id = t.id
        and c.status <> 'cancelled'
        and c.class_date >= date_trunc('month', current_date)::date
        and c.class_date < (date_trunc('month', current_date) + interval '1 month')::date
    ),
    0
  )::numeric(10, 2) as earnings,
  t.created_at,
  t.updated_at
from public.teachers t
left join public.students s on s.teacher_id = t.id
group by t.id;

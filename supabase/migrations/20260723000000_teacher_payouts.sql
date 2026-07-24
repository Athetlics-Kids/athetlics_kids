-- Pago al profesor por clase ejecutada + historial

alter table public.class_sessions
  add column if not exists teacher_paid_at timestamptz;

create table if not exists public.teacher_payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_session_id uuid references public.class_sessions(id) on delete set null,
  class_title text not null,
  class_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  method text not null default 'Efectivo',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists teacher_payouts_teacher_id_idx
  on public.teacher_payouts (teacher_id);

create index if not exists teacher_payouts_paid_at_idx
  on public.teacher_payouts (paid_at desc);

create index if not exists class_sessions_teacher_paid_at_idx
  on public.class_sessions (teacher_id, teacher_paid_at)
  where teacher_paid_at is null;

alter table public.teacher_payouts enable row level security;

drop policy if exists "Anyone authenticated reads teacher payouts" on public.teacher_payouts;
create policy "Anyone authenticated reads teacher payouts"
on public.teacher_payouts for select
to authenticated
using (true);

drop policy if exists "Admins manage teacher payouts" on public.teacher_payouts;
create policy "Admins manage teacher payouts"
on public.teacher_payouts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.teacher_payouts to authenticated;

-- Vista de clases: incluir teacher_paid_at
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
  c.created_at,
  c.updated_at
from public.class_sessions c
left join public.teachers t on t.id = c.teacher_id
left join public.class_enrollments e on e.class_session_id = c.id
group by c.id, t.name;

-- Historial legible de pagos a profesores
create or replace view public.teacher_payout_details
with (security_invoker = true) as
select
  tp.id,
  tp.teacher_id,
  t.name as teacher_name,
  tp.class_session_id,
  tp.class_title,
  tp.class_date,
  tp.amount,
  tp.method,
  tp.paid_at,
  tp.created_at
from public.teacher_payouts tp
join public.teachers t on t.id = tp.teacher_id;

grant select on public.teacher_payout_details to authenticated;

-- Athletic Kids - Contabilidad: tarifas profesor + planes por clases/semana + fee por clase

-- ---------------------------------------------------------------------------
-- Tarifas academia (local vs domicilio)
-- ---------------------------------------------------------------------------
create table if not exists public.academy_settings (
  id integer primary key default 1 check (id = 1),
  rate_local numeric(12, 2) not null default 30000 check (rate_local >= 0),
  rate_domicilio numeric(12, 2) not null default 50000 check (rate_domicilio >= 0),
  updated_at timestamptz not null default now()
);

insert into public.academy_settings (id, rate_local, rate_domicilio)
values (1, 30000, 50000)
on conflict (id) do nothing;

drop trigger if exists set_academy_settings_updated_at on public.academy_settings;
create trigger set_academy_settings_updated_at
before update on public.academy_settings
for each row execute function public.set_updated_at();

alter table public.academy_settings enable row level security;

drop policy if exists "Anyone authenticated reads academy settings" on public.academy_settings;
create policy "Anyone authenticated reads academy settings"
on public.academy_settings for select
to authenticated
using (true);

drop policy if exists "Admins manage academy settings" on public.academy_settings;
create policy "Admins manage academy settings"
on public.academy_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.academy_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Planes: permitir varios planes mensuales (1 clase/sem vs 2 clases/sem)
-- ---------------------------------------------------------------------------
alter table public.plan_configs drop constraint if exists plan_configs_plan_type_key;

alter table public.plan_configs
  add column if not exists classes_per_week integer not null default 1
    check (classes_per_week between 1 and 14);

-- Semilla: planes mensuales por frecuencia (si no existen por label)
insert into public.plan_configs (plan_type, label, price, duration_months, classes_per_week, sort_order, is_active)
select 'monthly', 'Mensual · 1 clase/semana', 180000, 1, 1, 1, true
where not exists (
  select 1 from public.plan_configs where label = 'Mensual · 1 clase/semana'
);

insert into public.plan_configs (plan_type, label, price, duration_months, classes_per_week, sort_order, is_active)
select 'monthly', 'Mensual · 2 clases/semana', 250000, 1, 2, 2, true
where not exists (
  select 1 from public.plan_configs where label = 'Mensual · 2 clases/semana'
);

-- Vincular alumno al plan concreto (precio + frecuencia)
alter table public.students
  add column if not exists plan_config_id uuid references public.plan_configs(id) on delete set null;

create index if not exists students_plan_config_id_idx on public.students(plan_config_id);

-- ---------------------------------------------------------------------------
-- Clases: local / domicilio + ganancia del profesor (snapshot al crear)
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

-- ---------------------------------------------------------------------------
-- Ganancias del profesor = suma de fees de clases no canceladas
-- (ya no = pagos de alumnos)
-- ---------------------------------------------------------------------------
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

-- Vista de clases: incluir location y fee
drop view if exists public.class_session_details;
create or replace view public.class_session_details
with (security_invoker = true) as
select
  c.id,
  c.title,
  c.teacher_id,
  t.name as teacher_name,
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
  c.created_at,
  c.updated_at
from public.class_sessions c
join public.teachers t on t.id = c.teacher_id
left join public.class_enrollments e on e.class_session_id = c.id
group by c.id, t.name;

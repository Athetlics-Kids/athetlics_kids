-- Athletic Kids - Plan configs + student levels (Settings)

create table if not exists public.student_levels (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_configs (
  id uuid primary key default gen_random_uuid(),
  plan_type public.plan_type not null unique,
  label text not null,
  price numeric(12, 2) not null check (price >= 0),
  duration_months integer not null check (duration_months > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_student_levels_updated_at on public.student_levels;
create trigger set_student_levels_updated_at
before update on public.student_levels
for each row execute function public.set_updated_at();

drop trigger if exists set_plan_configs_updated_at on public.plan_configs;
create trigger set_plan_configs_updated_at
before update on public.plan_configs
for each row execute function public.set_updated_at();

insert into public.student_levels (label, sort_order, is_active)
values
  ('Bebés', 1, true),
  ('Principiante', 2, true),
  ('Intermedio', 3, true),
  ('Avanzado', 4, true)
on conflict (label) do nothing;

insert into public.plan_configs (plan_type, label, price, duration_months, sort_order, is_active)
values
  ('monthly', 'Mensual', 180000, 1, 1, true),
  ('quarterly', 'Trimestral', 480000, 3, 2, true),
  ('semiannual', 'Semestral', 900000, 6, 3, true),
  ('annual', 'Anual', 1680000, 12, 4, true)
on conflict (plan_type) do nothing;

alter table public.student_levels enable row level security;
alter table public.plan_configs enable row level security;

drop policy if exists "Anyone authenticated reads levels" on public.student_levels;
create policy "Anyone authenticated reads levels"
on public.student_levels for select
to authenticated
using (true);

drop policy if exists "Admins manage levels" on public.student_levels;
create policy "Admins manage levels"
on public.student_levels for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Anyone authenticated reads plans" on public.plan_configs;
create policy "Anyone authenticated reads plans"
on public.plan_configs for select
to authenticated
using (true);

drop policy if exists "Admins manage plans" on public.plan_configs;
create policy "Admins manage plans"
on public.plan_configs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update, delete on public.student_levels to authenticated;
grant select, insert, update, delete on public.plan_configs to authenticated;

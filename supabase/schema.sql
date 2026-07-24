  -- Athletic Kids - Supabase schema
  -- Run this file in the Supabase SQL editor or with `supabase db push`.

  create extension if not exists "pgcrypto";

  -- ---------------------------------------------------------------------------
  -- Enums
  -- ---------------------------------------------------------------------------
  do $$ begin
    create type public.user_role as enum ('admin', 'teacher', 'parent');
  exception
    when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.payment_status as enum ('paid', 'pending', 'overdue');
  exception
    when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.plan_type as enum ('monthly', 'quarterly', 'semiannual', 'annual');
  exception
    when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.class_status as enum ('scheduled', 'completed', 'cancelled');
  exception
    when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.enrollment_status as enum ('reserved', 'attended', 'cancelled');
  exception
    when duplicate_object then null;
  end $$;

  do $$ begin
    create type public.notification_type as enum ('info', 'success', 'warning', 'error');
  exception
    when duplicate_object then null;
  end $$;

  -- ---------------------------------------------------------------------------
  -- Shared trigger helpers
  -- ---------------------------------------------------------------------------
  create or replace function public.set_updated_at()
  returns trigger
  language plpgsql
  as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

  -- ---------------------------------------------------------------------------
  -- Core tables
  -- ---------------------------------------------------------------------------
  create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    email text not null unique,
    role public.user_role not null,
    avatar_url text,
    phone text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists public.teachers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references public.profiles(id) on delete set null,
    name text not null,
    email text not null unique,
    avatar_url text,
    specialty text not null,
    phone text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint teachers_email_format check (position('@' in email) > 1)
  );

  create table if not exists public.teacher_schedules (
    id uuid primary key default gen_random_uuid(),
    teacher_id uuid not null references public.teachers(id) on delete cascade,
    day_of_week smallint not null check (day_of_week between 0 and 6),
    start_time time not null,
    end_time time not null,
    label text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint teacher_schedules_time_order check (end_time > start_time)
  );

  create table if not exists public.parents (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique references public.profiles(id) on delete set null,
    name text not null,
    email text not null unique,
    avatar_url text,
    phone text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint parents_email_format check (position('@' in email) > 1)
  );

  create table if not exists public.students (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    age integer not null check (age between 3 and 18),
    avatar_url text,
    parent_id uuid not null references public.parents(id) on delete restrict,
    teacher_id uuid not null references public.teachers(id) on delete restrict,
    plan_type public.plan_type not null default 'monthly',
    payment_status public.payment_status not null default 'pending',
    enrolled_at date not null default current_date,
    progress integer not null default 0 check (progress between 0 and 100),
    level text not null default 'Principiante',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint students_id_parent_id_unique unique (id, parent_id)
  );

  create table if not exists public.class_sessions (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    teacher_id uuid not null references public.teachers(id) on delete restrict,
    class_date date not null,
    start_time time not null,
    end_time time not null,
    capacity integer not null check (capacity between 1 and 30),
    status public.class_status not null default 'scheduled',
    level text not null default 'Principiante',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint class_sessions_time_order check (end_time > start_time)
  );

  create table if not exists public.class_enrollments (
    id uuid primary key default gen_random_uuid(),
    class_session_id uuid not null references public.class_sessions(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    status public.enrollment_status not null default 'reserved',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint class_enrollments_unique_student unique (class_session_id, student_id)
  );

  create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete restrict,
    parent_id uuid not null references public.parents(id) on delete restrict,
    amount numeric(10,2) not null check (amount >= 0),
    status public.payment_status not null default 'pending',
    method text not null default 'Pendiente',
    plan_type public.plan_type not null,
    due_date date not null,
    paid_date date,
    invoice_number text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint payments_paid_date_matches_status check (
      (status = 'paid' and paid_date is not null)
      or
      (status <> 'paid' and paid_date is null)
    ),
    constraint payments_parent_matches_student foreign key (student_id, parent_id)
      references public.students(id, parent_id)
  );

  create table if not exists public.attendance_records (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade,
    class_session_id uuid not null references public.class_sessions(id) on delete cascade,
    attendance_date date not null default current_date,
    present boolean not null,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint attendance_unique_student_class unique (student_id, class_session_id, attendance_date)
  );

  create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    title text not null,
    message text not null,
    type public.notification_type not null default 'info',
    read boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  -- ---------------------------------------------------------------------------
  -- Indexes
  -- ---------------------------------------------------------------------------
  create index if not exists profiles_role_idx on public.profiles(role);
  create index if not exists teachers_user_id_idx on public.teachers(user_id);
  create index if not exists teachers_is_active_idx on public.teachers(is_active);
  create index if not exists parents_user_id_idx on public.parents(user_id);
  create index if not exists students_parent_id_idx on public.students(parent_id);
  create index if not exists students_teacher_id_idx on public.students(teacher_id);
  create index if not exists students_payment_status_idx on public.students(payment_status);
  create index if not exists class_sessions_teacher_id_idx on public.class_sessions(teacher_id);
  create index if not exists class_sessions_date_idx on public.class_sessions(class_date);
  create index if not exists class_enrollments_class_session_id_idx on public.class_enrollments(class_session_id);
  create index if not exists class_enrollments_student_id_idx on public.class_enrollments(student_id);
  create index if not exists payments_student_id_idx on public.payments(student_id);
  create index if not exists payments_parent_id_idx on public.payments(parent_id);
  create index if not exists payments_status_idx on public.payments(status);
  create index if not exists payments_due_date_idx on public.payments(due_date);
  create index if not exists attendance_records_student_id_idx on public.attendance_records(student_id);
  create index if not exists attendance_records_class_session_id_idx on public.attendance_records(class_session_id);
  create index if not exists notifications_user_id_idx on public.notifications(user_id);
  create index if not exists notifications_unread_idx on public.notifications(user_id, read);

  -- ---------------------------------------------------------------------------
  -- Triggers
  -- ---------------------------------------------------------------------------
  drop trigger if exists set_profiles_updated_at on public.profiles;
  create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

  drop trigger if exists set_teachers_updated_at on public.teachers;
  create trigger set_teachers_updated_at
  before update on public.teachers
  for each row execute function public.set_updated_at();

  drop trigger if exists set_teacher_schedules_updated_at on public.teacher_schedules;
  create trigger set_teacher_schedules_updated_at
  before update on public.teacher_schedules
  for each row execute function public.set_updated_at();

  drop trigger if exists set_parents_updated_at on public.parents;
  create trigger set_parents_updated_at
  before update on public.parents
  for each row execute function public.set_updated_at();

  drop trigger if exists set_students_updated_at on public.students;
  create trigger set_students_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

  drop trigger if exists set_class_sessions_updated_at on public.class_sessions;
  create trigger set_class_sessions_updated_at
  before update on public.class_sessions
  for each row execute function public.set_updated_at();

  drop trigger if exists set_class_enrollments_updated_at on public.class_enrollments;
  create trigger set_class_enrollments_updated_at
  before update on public.class_enrollments
  for each row execute function public.set_updated_at();

  drop trigger if exists set_payments_updated_at on public.payments;
  create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

  drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
  create trigger set_attendance_records_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

  drop trigger if exists set_notifications_updated_at on public.notifications;
  create trigger set_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

  create or replace function public.prevent_class_overbooking()
  returns trigger
  language plpgsql
  as $$
  declare
    max_capacity integer;
    enrolled_count integer;
  begin
    if new.status not in ('reserved', 'attended') then
      return new;
    end if;

    select capacity
      into max_capacity
    from public.class_sessions
    where id = new.class_session_id;

    select count(*)
      into enrolled_count
    from public.class_enrollments
    where class_session_id = new.class_session_id
      and status in ('reserved', 'attended')
      and id <> new.id;

    if enrolled_count >= max_capacity then
      raise exception 'Class session % is already full', new.class_session_id;
    end if;

    return new;
  end;
  $$;

  drop trigger if exists prevent_class_overbooking on public.class_enrollments;
  create trigger prevent_class_overbooking
  before insert or update on public.class_enrollments
  for each row execute function public.prevent_class_overbooking();

  -- ---------------------------------------------------------------------------
  -- Views for the frontend shape used today
  -- ---------------------------------------------------------------------------
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
    s.created_at,
    s.updated_at
  from public.students s
  join public.parents p on p.id = s.parent_id
  join public.teachers t on t.id = s.teacher_id;

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
    c.created_at,
    c.updated_at
  from public.class_sessions c
  join public.teachers t on t.id = c.teacher_id
  left join public.class_enrollments e on e.class_session_id = c.id
  group by c.id, t.name;

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
    pay.created_at,
    pay.updated_at
  from public.payments pay
  join public.students s on s.id = pay.student_id
  join public.parents p on p.id = pay.parent_id;

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
    coalesce(sum(pay.amount) filter (where pay.status = 'paid'), 0)::numeric(10,2) as earnings,
    t.created_at,
    t.updated_at
  from public.teachers t
  left join public.students s on s.teacher_id = t.id
  left join public.payments pay on pay.student_id = s.id
  group by t.id;

  create or replace view public.dashboard_stats
  with (security_invoker = true) as
  select
    (select count(*)::integer from public.students) as total_students,
    (select count(*)::integer from public.class_sessions where status = 'scheduled') as active_classes,
    (select count(*)::integer from public.teachers where is_active) as active_teachers,
    (select coalesce(sum(amount), 0)::numeric(10,2)
      from public.payments
      where status = 'paid'
        and paid_date >= date_trunc('month', current_date)::date) as monthly_revenue,
    (select count(*)::integer from public.payments where status in ('pending', 'overdue')) as pending_payments,
    (select coalesce(round(100.0 * count(*) filter (where present) / nullif(count(*), 0), 2), 0)
      from public.attendance_records) as attendance_rate;

  -- ---------------------------------------------------------------------------
  -- RLS helpers
  -- ---------------------------------------------------------------------------
  create or replace function public.current_user_role()
  returns public.user_role
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select role from public.profiles where id = auth.uid()
  $$;

  create or replace function public.is_admin()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select coalesce(public.current_user_role() = 'admin', false)
  $$;

  create or replace function public.current_teacher_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select id from public.teachers where user_id = auth.uid()
  $$;

  create or replace function public.current_parent_id()
  returns uuid
  language sql
  stable
  security definer
  set search_path = public
  as $$
    select id from public.parents where user_id = auth.uid()
  $$;

  -- ---------------------------------------------------------------------------
  -- Row Level Security
  -- ---------------------------------------------------------------------------
  alter table public.profiles enable row level security;
  alter table public.teachers enable row level security;
  alter table public.teacher_schedules enable row level security;
  alter table public.parents enable row level security;
  alter table public.students enable row level security;
  alter table public.class_sessions enable row level security;
  alter table public.class_enrollments enable row level security;
  alter table public.payments enable row level security;
  alter table public.attendance_records enable row level security;
  alter table public.notifications enable row level security;

  drop policy if exists "Profiles are visible to owner and admins" on public.profiles;
  create policy "Profiles are visible to owner and admins"
  on public.profiles for select
  to authenticated
  using (public.is_admin() or id = auth.uid());

  drop policy if exists "Profiles can be inserted by owner or admin" on public.profiles;
  create policy "Profiles can be inserted by owner or admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin() or id = auth.uid());

  drop policy if exists "Profiles can be updated by owner or admin" on public.profiles;
  create policy "Profiles can be updated by owner or admin"
  on public.profiles for update
  to authenticated
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());

  drop policy if exists "Admins manage teachers" on public.teachers;
  create policy "Admins manage teachers"
  on public.teachers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Authenticated users can read active teachers" on public.teachers;
  create policy "Authenticated users can read active teachers"
  on public.teachers for select
  to authenticated
  using (is_active or public.is_admin() or user_id = auth.uid());

  drop policy if exists "Teachers update themselves" on public.teachers;
  create policy "Teachers update themselves"
  on public.teachers for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

  drop policy if exists "Admins manage teacher schedules" on public.teacher_schedules;
  create policy "Admins manage teacher schedules"
  on public.teacher_schedules for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Teachers read own schedules" on public.teacher_schedules;
  create policy "Teachers read own schedules"
  on public.teacher_schedules for select
  to authenticated
  using (
    public.is_admin()
    or teacher_id = public.current_teacher_id()
  );

  drop policy if exists "Admins manage parents" on public.parents;
  create policy "Admins manage parents"
  on public.parents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Parents and assigned teachers read parents" on public.parents;
  create policy "Parents and assigned teachers read parents"
  on public.parents for select
  to authenticated
  using (
    public.is_admin()
    or user_id = auth.uid()
    or exists (
      select 1
      from public.students s
      where s.parent_id = parents.id
        and s.teacher_id = public.current_teacher_id()
    )
  );

  drop policy if exists "Parents update themselves" on public.parents;
  create policy "Parents update themselves"
  on public.parents for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

  drop policy if exists "Admins manage students" on public.students;
  create policy "Admins manage students"
  on public.students for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Teachers and parents read their students" on public.students;
  create policy "Teachers and parents read their students"
  on public.students for select
  to authenticated
  using (
    public.is_admin()
    or teacher_id = public.current_teacher_id()
    or parent_id = public.current_parent_id()
  );

  drop policy if exists "Teachers update assigned students" on public.students;
  create policy "Teachers update assigned students"
  on public.students for update
  to authenticated
  using (teacher_id = public.current_teacher_id())
  with check (teacher_id = public.current_teacher_id());

  drop policy if exists "Admins manage classes" on public.class_sessions;
  create policy "Admins manage classes"
  on public.class_sessions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Authenticated users read scheduled classes" on public.class_sessions;
  create policy "Authenticated users read scheduled classes"
  on public.class_sessions for select
  to authenticated
  using (
    public.is_admin()
    or status = 'scheduled'
    or teacher_id = public.current_teacher_id()
  );

  drop policy if exists "Teachers manage own classes" on public.class_sessions;
  create policy "Teachers manage own classes"
  on public.class_sessions for all
  to authenticated
  using (teacher_id = public.current_teacher_id())
  with check (teacher_id = public.current_teacher_id());

  drop policy if exists "Admins manage enrollments" on public.class_enrollments;
  create policy "Admins manage enrollments"
  on public.class_enrollments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Users read related enrollments" on public.class_enrollments;
  create policy "Users read related enrollments"
  on public.class_enrollments for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.students s
      where s.id = class_enrollments.student_id
        and (s.parent_id = public.current_parent_id() or s.teacher_id = public.current_teacher_id())
    )
    or exists (
      select 1
      from public.class_sessions c
      where c.id = class_enrollments.class_session_id
        and c.teacher_id = public.current_teacher_id()
    )
  );

  drop policy if exists "Parents reserve classes for children" on public.class_enrollments;
  create policy "Parents reserve classes for children"
  on public.class_enrollments for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = class_enrollments.student_id
        and s.parent_id = public.current_parent_id()
    )
  );

  drop policy if exists "Teachers update own class enrollments" on public.class_enrollments;
  create policy "Teachers update own class enrollments"
  on public.class_enrollments for update
  to authenticated
  using (
    exists (
      select 1
      from public.class_sessions c
      where c.id = class_enrollments.class_session_id
        and c.teacher_id = public.current_teacher_id()
    )
  )
  with check (
    exists (
      select 1
      from public.class_sessions c
      where c.id = class_enrollments.class_session_id
        and c.teacher_id = public.current_teacher_id()
    )
  );

  drop policy if exists "Admins manage payments" on public.payments;
  create policy "Admins manage payments"
  on public.payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Parents read own payments" on public.payments;
  create policy "Parents read own payments"
  on public.payments for select
  to authenticated
  using (public.is_admin() or parent_id = public.current_parent_id());

  drop policy if exists "Teachers read assigned student payments" on public.payments;
  create policy "Teachers read assigned student payments"
  on public.payments for select
  to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = payments.student_id
        and s.teacher_id = public.current_teacher_id()
    )
  );

  drop policy if exists "Admins manage attendance" on public.attendance_records;
  create policy "Admins manage attendance"
  on public.attendance_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Users read related attendance" on public.attendance_records;
  create policy "Users read related attendance"
  on public.attendance_records for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.students s
      where s.id = attendance_records.student_id
        and (s.parent_id = public.current_parent_id() or s.teacher_id = public.current_teacher_id())
    )
  );

  drop policy if exists "Teachers manage own class attendance" on public.attendance_records;
  create policy "Teachers manage own class attendance"
  on public.attendance_records for all
  to authenticated
  using (
    exists (
      select 1
      from public.class_sessions c
      where c.id = attendance_records.class_session_id
        and c.teacher_id = public.current_teacher_id()
    )
  )
  with check (
    exists (
      select 1
      from public.class_sessions c
      where c.id = attendance_records.class_session_id
        and c.teacher_id = public.current_teacher_id()
    )
  );

  drop policy if exists "Admins manage notifications" on public.notifications;
  create policy "Admins manage notifications"
  on public.notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

  drop policy if exists "Users read own notifications" on public.notifications;
  create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

  drop policy if exists "Users update own notifications" on public.notifications;
  create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

  -- ---------------------------------------------------------------------------
  -- Settings: levels & plan prices
  -- ---------------------------------------------------------------------------
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

  -- ---------------------------------------------------------------------------
  -- API grants
  -- RLS still decides which rows each authenticated user can access.
  -- ---------------------------------------------------------------------------
  grant usage on schema public to authenticated;

  grant select, insert, update, delete on
    public.profiles,
    public.teachers,
    public.teacher_schedules,
    public.parents,
    public.students,
    public.class_sessions,
    public.class_enrollments,
    public.payments,
    public.attendance_records,
    public.notifications,
    public.student_levels,
    public.plan_configs
  to authenticated;

  grant select on
    public.student_details,
    public.class_session_details,
    public.payment_details,
    public.teacher_summaries,
    public.dashboard_stats
  to authenticated;

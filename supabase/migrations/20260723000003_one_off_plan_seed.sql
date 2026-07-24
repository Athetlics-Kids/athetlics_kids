-- Paso 2/2: crear el plan Clase única (correr DESPUÉS del paso 1, en otra query)
insert into public.plan_configs (plan_type, label, price, duration_months, classes_per_week, sort_order, is_active)
select 'one_off'::public.plan_type, 'Clase única', 50000, 1, 1, 0, true
where not exists (
  select 1 from public.plan_configs where label = 'Clase única' or plan_type::text = 'one_off'
);

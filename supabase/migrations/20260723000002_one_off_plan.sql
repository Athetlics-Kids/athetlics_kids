-- Paso 1/2: agregar valor al enum (ejecutar solo este y luego el paso 2)
alter type public.plan_type add value if not exists 'one_off';

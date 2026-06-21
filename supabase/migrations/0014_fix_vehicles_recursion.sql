-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0014 · Fix: rekurencja polityk vehicles ↔ driver_assignments
--  vehicles_select odwoływał się do driver_assignments (które w swojej polityce
--  odwołują się do vehicles) → "infinite recursion detected in policy".
--  Rozwiązanie: sprawdzenie przypisania przez funkcję SECURITY DEFINER
--  (omija RLS, więc nie wywołuje polityki driver_assignments).
-- ════════════════════════════════════════════════════════════════════

create or replace function public.is_assigned_to_vehicle(p_vehicle uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from driver_assignments da
    where da.vehicle_id = p_vehicle and da.user_id = auth.uid() and da.active
  );
$$;

drop policy if exists vehicles_select on vehicles;
create policy vehicles_select on vehicles for select to authenticated
  using (
    has_role(company_id, array['owner','dispatcher']::role[])
    or public.is_assigned_to_vehicle(id)
  );

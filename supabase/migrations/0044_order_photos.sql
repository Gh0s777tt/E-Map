-- ════════════════════════════════════════════════════════════════════
--  E-LOGISTIC · 0044 · Zdjęcia towaru przy zleceniu (dowód zabezpieczenia)
--  Dobrowolne zdjęcia ładunku robione przy załadunku — dowód, że towar był
--  prawidłowo zabezpieczony. Prywatny bucket `cargo-photos`; ścieżka
--  `{company_id}/{order_id}/{uuid}-nazwa`. Tabela `order_photos` = metadane.
--  Upload: KAŻDY aktywny członek (kierowca robi zdjęcie). Kasowanie:
--  owner/dispatcher (integralność dowodu). Odczyt: aktywny członek firmy.
-- ════════════════════════════════════════════════════════════════════

create table if not exists order_photos (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  order_id     uuid not null references orders(id) on delete cascade,
  path         text not null unique,
  mime         text,
  size_bytes   bigint,
  caption      text,
  uploaded_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists order_photos_order_idx on order_photos(order_id);
create index if not exists order_photos_company_idx on order_photos(company_id);

alter table order_photos enable row level security;

drop policy if exists order_photos_select on order_photos;
create policy order_photos_select on order_photos for select to authenticated
  using (public.is_member_of(company_id));

-- Upload: każdy aktywny członek firmy (kierowca dokumentuje swój ładunek).
drop policy if exists order_photos_insert on order_photos;
create policy order_photos_insert on order_photos for insert to authenticated
  with check (public.is_member_of(company_id));

-- Kasowanie: owner/dispatcher (kierowca nie usuwa dowodu).
drop policy if exists order_photos_delete on order_photos;
create policy order_photos_delete on order_photos for delete to authenticated
  using (public.has_role(company_id, array['owner','dispatcher']::role[]));

-- ── Bucket Storage (prywatny) ───────────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('cargo-photos', 'cargo-photos', false)
  on conflict (id) do nothing;

-- ── RLS na storage.objects dla bucketu `cargo-photos` ───────────────
-- Pierwszy folder w ścieżce = company_id (porównanie tekstowe).
drop policy if exists cargo_photos_obj_select on storage.objects;
create policy cargo_photos_obj_select on storage.objects for select to authenticated
  using (
    bucket_id = 'cargo-photos'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.company_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists cargo_photos_obj_insert on storage.objects;
create policy cargo_photos_obj_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'cargo-photos'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.company_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists cargo_photos_obj_delete on storage.objects;
create policy cargo_photos_obj_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'cargo-photos'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid() and m.status = 'active'
        and m.role in ('owner','dispatcher')
        and m.company_id::text = (storage.foldername(name))[1]
    )
  );

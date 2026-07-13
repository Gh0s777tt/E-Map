-- ════════════════════════════════════════════════════════════════════
--  0073 · #318 Avatary użytkowników — publiczny bucket `avatars`.
--  Ścieżka: {user_id}/avatar-<rand>.<ext>. Zapis/nadpisanie/kasowanie
--  wyłącznie we własnym folderze; odczyt publiczny (URL w user_metadata).
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

drop policy if exists avatars_obj_select on storage.objects;
create policy avatars_obj_select on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_obj_insert on storage.objects;
create policy avatars_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists avatars_obj_update on storage.objects;
create policy avatars_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists avatars_obj_delete on storage.objects;
create policy avatars_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

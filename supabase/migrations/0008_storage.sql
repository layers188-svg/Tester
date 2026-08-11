-- House Dark — 0008_storage
-- The "no-trailer" bucket holds only the original No Trailer files
-- (brief §12 media checks). It is public for read (the player fetches
-- it by URL, and the URL itself carries no title — see
-- src/components/tonight/NoTrailerPlayer.tsx) but writes are owner
-- only. Avatars get their own bucket, also owner-managed on write for
-- the beta (members upload via a signed owner-approved flow later).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('no-trailer', 'no-trailer', true, 26214400, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy no_trailer_public_read on storage.objects
  for select using (bucket_id = 'no-trailer');

create policy no_trailer_owner_write on storage.objects
  for insert with check (bucket_id = 'no-trailer' and is_owner());

create policy no_trailer_owner_update on storage.objects
  for update using (bucket_id = 'no-trailer' and is_owner());

create policy no_trailer_owner_delete on storage.objects
  for delete using (bucket_id = 'no-trailer' and is_owner());

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_own_write on storage.objects
  for insert with check (bucket_id = 'avatars' and owner = auth.uid());

create policy avatars_own_update on storage.objects
  for update using (bucket_id = 'avatars' and owner = auth.uid());

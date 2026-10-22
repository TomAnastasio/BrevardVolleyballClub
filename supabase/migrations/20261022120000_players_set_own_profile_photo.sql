-- Lets a signed-in player change their own profile photo from their
-- profile page (PlayerProfileView / ProfilePhotoEditor). Purely additive:
-- one new storage policy and one new function, nothing existing changed.
--
-- 1. Storage: players may upload into their own folder of the existing
--    'profile-photos' bucket (migration 20261002171849), i.e. object names
--    starting with "<their user id>/". The existing admin upload policy
--    (manual profiles, under "manual/") is untouched. No update/delete
--    policy: each upload is a new uniquely-named file, so a player can never
--    overwrite or remove anyone's photo, their own old ones included.
--
-- 2. profiles.avatar_url is changed only through set_my_avatar_url() rather
--    than a profiles UPDATE policy, because RLS policies are per-row, not
--    per-column — an update policy on their own row would also let a player
--    rewrite their own elo_rating, is_admin, display_name, etc. The function
--    only accepts a URL pointing at a photo that actually exists in the
--    caller's own folder of that bucket, so avatar_url can't be pointed at
--    an arbitrary outside image.

create policy "Players can upload their own profile photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.set_my_avatar_url(p_url text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  object_path text;
begin
  if caller is null then
    raise exception 'Not signed in';
  end if;

  object_path := substring(
    p_url from '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/profile-photos/([A-Za-z0-9/._-]+)$'
  );

  if object_path is null
    or split_part(object_path, '/', 1) <> caller::text
    or not exists (
      select 1 from storage.objects
      where bucket_id = 'profile-photos' and name = object_path
    )
  then
    raise exception 'Invalid profile photo';
  end if;

  update public.profiles set avatar_url = p_url where id = caller;
end;
$$;

revoke execute on function public.set_my_avatar_url(text) from public, anon;
grant execute on function public.set_my_avatar_url(text) to authenticated;

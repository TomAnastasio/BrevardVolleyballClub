-- Profiles always have a name, and profile photos have upload limits.
-- Additive: nothing is dropped and no existing name, photo or rating is
-- changed (the backfill below only fills names that are missing).
--
-- 1. A player whose Google account had no name got a profile with a blank
--    display_name. Every list in the app skips nameless profiles, so that
--    player couldn't even open their own profile, Locker or Cauldron.
--    Owner's call (2026-10-25): a profile can't be created or saved
--    without a name.
--    a. handle_new_user() (20261001163456) now falls back from Google's
--       full_name to its name, then to "New player". Never the email
--       address: profiles are public.
--    b. Existing profiles with a missing or blank name get "New player".
--       An admin can rename them from their profile page.
--    c. A check constraint stops a blank name being stored again. Every
--       writer already sends a name: the sign-up trigger (a), Add Manual
--       Profile / Merge Profiles' "Add" / roster import (the app requires a
--       name), admin_set_display_name() (rejects blank names itself).
--       merge_profiles() and the Elo functions never write display_name,
--       and after (b) every existing row passes, so their whole-table
--       updates keep working.
--
-- 2. The 'profile-photos' bucket (20261002171849) accepted any file of any
--    size. The app now always uploads a 512x512 JPEG of a few hundred KB at
--    most (src/lib/profilePhoto.js, for players and admins alike), so the
--    bucket takes images only, up to 2 MB: plenty of headroom, but no
--    multi-megabyte originals with their GPS data. Supabase Storage enforces
--    these on upload; photos already in the bucket are untouched.
--
-- 3. set_my_avatar_url() (20261022120000) accepted a link on any
--    *.supabase.co project, as long as our bucket had an object at the same
--    path, so someone could point their photo at an image hosted on another
--    project. It now also requires the link to be on the project that signed
--    the player's login (the "iss" of their sign-in token), which is this
--    project for production and staging alike, with nothing hard-coded. A
--    token without a recognisable issuer keeps the old check, so photo
--    saving can't break if that ever changes.

-- 1a ----------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(btrim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'full_name', ''), '\s+', ' ', 'g')), ''),
      nullif(btrim(regexp_replace(coalesce(new.raw_user_meta_data ->> 'name', ''), '\s+', ' ', 'g')), ''),
      'New player'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 1b ----------------------------------------------------------------------
update public.profiles
  set display_name = 'New player'
  where display_name is null or display_name !~ '[^[:space:]]';

-- 1c ----------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_display_name_not_blank
  check (display_name is not null and display_name ~ '[^[:space:]]');

-- 2 -----------------------------------------------------------------------
update storage.buckets
  set file_size_limit = 2097152, -- 2 MB
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
  where id = 'profile-photos';

-- 3 -----------------------------------------------------------------------
create or replace function public.set_my_avatar_url(p_url text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  caller uuid := auth.uid();
  object_path text;
  url_project text;
  login_project text;
begin
  if caller is null then
    raise exception 'Not signed in';
  end if;

  object_path := substring(
    p_url from '^https://[a-z0-9]+\.supabase\.co/storage/v1/object/public/profile-photos/([A-Za-z0-9/._-]+)$'
  );
  url_project := substring(p_url from '^https://([a-z0-9]+)\.supabase\.co/');
  login_project := substring(
    coalesce(auth.jwt() ->> 'iss', '') from '^https://([a-z0-9]+)\.supabase\.co/auth/v1$'
  );

  if object_path is null
    or (login_project is not null and url_project is distinct from login_project)
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

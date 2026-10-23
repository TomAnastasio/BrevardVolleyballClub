-- Admin-only: rename any player's profile (owner's request, 2026-10-23),
-- from the "Admin only" box on their profile page. Purely additive: one new
-- function, nothing existing changed.
--
-- A function rather than a profiles UPDATE policy for the same reason as
-- set_my_avatar_url() (20261022120000): RLS policies are per-row, not
-- per-column, so a policy would let an admin's client rewrite elo_rating,
-- is_admin, etc. too. This only ever touches display_name.
--
-- The name is cleaned the same way the app's sanitizeName() cleans a new
-- manual profile's name (whitespace collapsed, trimmed, 1-24 characters),
-- but rejected rather than silently cut if too long.
--
-- Old games keep the name they were saved with in games.name_a / name_b /
-- submitted_by_name (snapshots, "immune to later profile renames" since
-- 20261001191519); everything that reads profiles.display_name (rankings,
-- profiles, game-detail rosters, player search, tournaments) shows the new
-- name straight away.

create or replace function public.admin_set_display_name(
  p_profile_id uuid,
  p_display_name text
)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  cleaned text := btrim(regexp_replace(coalesce(p_display_name, ''), '\s+', ' ', 'g'));
begin
  perform public.require_admin();

  if cleaned = '' then
    raise exception 'Name can''t be empty';
  end if;
  if char_length(cleaned) > 24 then
    raise exception 'Name must be 24 characters or fewer';
  end if;

  update public.profiles set display_name = cleaned where id = p_profile_id;
  if not found then
    raise exception 'profile not found';
  end if;

  return cleaned;
end;
$$;

revoke execute on function public.admin_set_display_name(uuid, text) from public, anon;
grant execute on function public.admin_set_display_name(uuid, text) to authenticated;

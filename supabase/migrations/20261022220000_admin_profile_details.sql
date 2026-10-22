-- Admin-only "everything we know about this player", shown on a player's
-- profile page when an admin is signed in (owner's request, 2026-10-22).
-- Read-only and additive: one new function, nothing else changes.
--
-- The sign-in email lives in Supabase's auth.users, which the app can't
-- read directly (and shouldn't: profiles are public). This security definer
-- function returns it only to admins (require_admin() raises for everyone
-- else), along with the account's sign-up/last-sign-in times and any email/
-- phone collected by tournament registration forms (already admin-only, in
-- tournament_entrant_contacts). Manual profiles have no auth.users row, so
-- their account fields come back null.

create or replace function public.admin_profile_details(p_profile_id uuid)
returns table (
  email text,
  auth_phone text,
  sign_in_provider text,
  signed_up_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean,
  is_manual boolean,
  approved boolean,
  profile_created_at timestamptz,
  tournament_contacts jsonb
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  perform public.require_admin();

  return query
    select
      u.email::text,
      u.phone::text,
      (u.raw_app_meta_data ->> 'provider')::text,
      u.created_at,
      u.last_sign_in_at,
      p.is_admin,
      p.is_manual,
      p.approved,
      p.created_at,
      coalesce((
        select jsonb_agg(jsonb_build_object(
                 'tournament', t.name,
                 'event_date', t.event_date,
                 'email', c.email,
                 'phone', c.phone)
               order by t.event_date desc)
        from public.tournament_entrants e
        join public.tournament_entrant_contacts c on c.entrant_id = e.id
        join public.tournaments t on t.id = e.tournament_id
        where e.profile_id = p.id
      ), '[]'::jsonb)
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.id = p_profile_id;
end;
$$;

grant execute on function public.admin_profile_details(uuid) to authenticated;

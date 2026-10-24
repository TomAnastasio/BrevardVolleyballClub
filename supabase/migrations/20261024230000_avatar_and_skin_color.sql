-- The base look of a player's pixel avatar: Avatar 1 or Avatar 2 (the same
-- body and gear zones, different hair), and one of four skin colors. Free
-- from the start, chosen in the Locker. Additive only: two new columns with
-- defaults that match how everyone looks today (Avatar 1, skin color 2),
-- and one function to set them.

alter table public.player_outfits
  add column avatar smallint not null default 1 check (avatar in (1, 2)),
  add column skin smallint not null default 2 check (skin between 1 and 4);

-- Outfits are public to read (the rally and profiles show them) and only
-- change through functions, like equip_item.
create or replace function public.set_look(p_avatar integer, p_skin integer)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sign in to change your avatar.';
  end if;
  if p_avatar is null or p_avatar not in (1, 2) then
    raise exception 'Unknown avatar %', p_avatar;
  end if;
  if p_skin is null or p_skin not between 1 and 4 then
    raise exception 'Unknown skin color %', p_skin;
  end if;
  insert into public.player_outfits (player_id, avatar, skin) values (uid, p_avatar, p_skin)
  on conflict (player_id) do update set avatar = excluded.avatar, skin = excluded.skin, updated_at = now();
end;
$$;

revoke execute on function public.set_look(integer, integer) from public, anon;
grant execute on function public.set_look(integer, integer) to authenticated;

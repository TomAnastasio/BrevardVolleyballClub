-- Makes Julia Swalchick an admin, at the owner's request (2026-10-22). Same
-- kind of one-time grant as the owner's own in 20261001164613.
--
-- This repo is public, so the account is matched by an md5 of its lowercase
-- sign-in email instead of the email itself. Data-only and non-destructive:
-- it flips one flag on one existing profile. If that account hasn't signed
-- in yet, this matches nothing and changes nothing; it would then need a new
-- migration after she signs up (re-running this one isn't possible).
-- To remove admin later, add a new migration setting is_admin = false.

update public.profiles
set is_admin = true
where id = (
  select id from auth.users
  where md5(lower(email)) = '85c64992d3ab71bfb9b4ba93c816a5f6'
);

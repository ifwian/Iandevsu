begin;

-- Admin access for the chat inbox has two independent paths:
--   1. CHAT_ADMIN_TOKEN  -- a static bearer token compared in api/chat.ts
--   2. profiles.role     -- 'admin' on the signed-in Supabase user
--
-- Path 2 could never succeed before this migration: nothing ever created a
-- `profiles` row, so a signed-in user had no row to promote and the
-- `profiles?id=eq.<uid>&role=eq.admin` lookup in hasAdminAccess() always came
-- back empty. This adds the missing provisioning.

-- 1. Backfill a row for every auth user that predates the trigger.
insert into public.profiles (id, role)
select u.id, 'visitor'
from auth.users as u
on conflict (id) do nothing;

-- 2. Auto-create a row on signup so the role is always settable.
--    search_path is pinned because this runs as SECURITY DEFINER.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'visitor')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. Promote the site owner to admin. Idempotent, so re-running is safe.
--    Change the email if the owner account differs. To promote someone else,
--    add another statement -- do NOT make the trigger itself email-based, or
--    the admin grant would follow whoever controls the signup form.
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'iandevsu@gmail.com')
  and role is distinct from 'admin';

commit;

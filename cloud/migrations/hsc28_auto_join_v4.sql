-- Study Sentry Cloud Migration v4: Default "এইচএসসি 28" Public Group Auto-Join & Default Live Sharing
-- Idempotent migration matching the live `public` + `sentry_private` schema (see live_presence_v3.sql).
-- Ensures EVERY Google-logged-in user (desktop & mobile) automatically joins "এইচএসসি 28"
-- and appears live in the Study Room & Leaderboard without manual configuration.

-- 1. Enable live study room, subject, device & leaderboard visibility by default for new profiles
alter table public.sentry_profiles
  alter column show_live set default true,
  alter column show_subject set default true,
  alter column show_device set default true,
  alter column show_leaderboard set default true,
  alter column quest_tracking set default true;

-- 2. Enable live sharing for existing profiles that were stuck on legacy false defaults
update public.sentry_profiles
set
  show_live = true,
  show_subject = true,
  show_device = true,
  show_leaderboard = true,
  quest_tracking = true
where not show_live or not show_leaderboard;

-- 3. Trigger function: whenever any user profile is created, automatically add the student
--    to the canonical public group "এইচএসসি 28" (works for both desktop & mobile clients).
create or replace function public.sentry_auto_join_hsc28()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, sentry_private
as $$
declare
  v_circle_id uuid;
begin
  if to_regclass('sentry_private.circles') is not null then
    select c.id into v_circle_id
    from sentry_private.circles c
    where c.visibility = 'public'
      and lower(trim(c.name)) in ('এইচএসসি 28', 'এইচএসসি ২৮', 'hsc 28', 'hsc28', 'hsc 2028', 'এইচএসসি ২০২৮')
    order by c.created_at asc
    limit 1;

    if v_circle_id is null then
      insert into sentry_private.circles (owner_id, name, tagline, category, visibility)
      values (
        new.user_id,
        'এইচএসসি 28',
        'এইচএসসি ২০২৮ ব্যাচের ডিফল্ট কমন লাইভ স্টাডি রুম ও লিডারবোর্ড',
        'study',
        'public'
      )
      returning id into v_circle_id;

      insert into sentry_private.circle_members (circle_id, user_id, role)
      values (v_circle_id, new.user_id, 'owner')
      on conflict do nothing;
      return new;
    end if;

    insert into sentry_private.circle_members (circle_id, user_id, role)
    values (v_circle_id, new.user_id, 'member')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sentry_auto_join_hsc28 on public.sentry_profiles;
create trigger trg_sentry_auto_join_hsc28
after insert on public.sentry_profiles
for each row
execute function public.sentry_auto_join_hsc28();

-- 4. One-time backfill: ensure "এইচএসসি 28" exists right now and add ALL existing signed-in users
do $$
declare
  v_circle_id uuid;
  v_first_user uuid;
begin
  if to_regclass('sentry_private.circles') is not null then
    select c.id into v_circle_id
    from sentry_private.circles c
    where c.visibility = 'public'
      and lower(trim(c.name)) in ('এইচএসসি 28', 'এইচএসসি ২৮', 'hsc 28', 'hsc28', 'hsc 2028', 'এইচএসসি ২০২৮')
    order by c.created_at asc
    limit 1;

    if v_circle_id is null then
      select p.user_id into v_first_user
      from public.sentry_profiles p
      limit 1;

      if v_first_user is not null then
        insert into sentry_private.circles (owner_id, name, tagline, category, visibility)
        values (
          v_first_user,
          'এইচএসসি 28',
          'এইচএসসি ২০২৮ ব্যাচের ডিফল্ট কমন লাইভ স্টাডি রুম ও লিডারবোর্ড',
          'study',
          'public'
        )
        returning id into v_circle_id;

        insert into sentry_private.circle_members (circle_id, user_id, role)
        values (v_circle_id, v_first_user, 'owner')
        on conflict do nothing;
      end if;
    end if;

    if v_circle_id is not null then
      insert into sentry_private.circle_members (circle_id, user_id, role)
      select v_circle_id, p.user_id, 'member'
      from public.sentry_profiles p
      on conflict do nothing;
    end if;
  end if;
end;
$$;

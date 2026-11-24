-- Study Sentry Cloud Migration v5: 180-second live-presence grace window
-- Idempotent. Safe to run on databases that already have live_presence_v3.sql applied.
--
-- Why: mobile clients, background tabs, and brief network hiccups previously dropped a
-- student out of the Study Lounge after only 90 seconds without a heartbeat. A 180-second
-- grace window keeps a genuinely focused student visible to everyone (any Gmail account)
-- while stale/offline sessions still clear out promptly.
--
-- Security: the view function stays SECURITY DEFINER with a pinned search_path and still
-- enforces circle membership before returning any rows.

create or replace function public.sentry_circle_view_v2(cid uuid)
returns table(user_id uuid,display_name text,status text,subject text,elapsed_seconds integer,last_seen timestamptz,today_seconds bigint,week_seconds bigint,device_type text)
language plpgsql security definer set search_path=pg_catalog,public,sentry_private as $$
begin
 if auth.uid() is null or not exists(select 1 from sentry_private.circle_members m where m.circle_id=cid and m.user_id=auth.uid()) then raise exception 'Not a member'; end if;
 return query select m.user_id,coalesce(p.display_name,'শিক্ষার্থী'),
 case when p.show_live and pr.updated_at>now()-interval '180 seconds' then pr.status else 'offline' end,
 case when p.show_live and p.show_subject and pr.updated_at>now()-interval '180 seconds' then pr.subject else null end,
 case when p.show_live and pr.updated_at>now()-interval '180 seconds' then pr.elapsed_seconds else null end,
 case when p.show_live then pr.updated_at else null end,
 case when p.show_leaderboard then coalesce(sum(d.seconds) filter(where d.day=(now() at time zone 'Asia/Dhaka')::date),0) else null end,
 case when p.show_leaderboard then coalesce(sum(d.seconds) filter(where d.day>=date_trunc('week',now() at time zone 'Asia/Dhaka')::date and d.day<=(now() at time zone 'Asia/Dhaka')::date),0) else null end,
 case when p.show_live and p.show_device and pr.updated_at>now()-interval '180 seconds' and pr.status<>'offline' then pr.device_type else null end
 from sentry_private.circle_members m left join public.sentry_profiles p on p.user_id=m.user_id left join sentry_private.presence pr on pr.user_id=m.user_id left join sentry_private.daily_totals d on d.user_id=m.user_id and d.day>=date_trunc('week',now() at time zone 'Asia/Dhaka')::date and d.day<=(now() at time zone 'Asia/Dhaka')::date where m.circle_id=cid group by m.user_id,p.display_name,p.show_live,p.show_subject,p.show_device,p.show_leaderboard,pr.status,pr.subject,pr.elapsed_seconds,pr.updated_at,pr.device_type;
end $$;

revoke all on function public.sentry_circle_view_v2(uuid) from public,anon;
grant execute on function public.sentry_circle_view_v2(uuid) to authenticated;

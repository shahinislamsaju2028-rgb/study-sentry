-- Additive opt-in device sharing and idle status; legacy RPCs remain available.
alter table public.sentry_profiles add column if not exists show_device boolean not null default false;
alter table sentry_private.presence add column if not exists device_type text;
alter table sentry_private.presence drop constraint if exists presence_status_check;
alter table sentry_private.presence add constraint presence_status_check check(status in ('studying','break','paused','idle','offline'));
alter table sentry_private.presence drop constraint if exists presence_device_type_check;
alter table sentry_private.presence add constraint presence_device_type_check check(device_type is null or device_type in ('computer','mobile'));
create or replace function public.sentry_heartbeat_v2(p_status text,p_subject text,p_elapsed integer,p_device text)
returns void language plpgsql security definer set search_path=pg_catalog,public,sentry_private as $$
declare allow_live boolean; allow_subject boolean; allow_device boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_status is null or p_status not in ('studying','break','paused','idle','offline') or p_elapsed is null or p_elapsed not between 0 and 604800 or char_length(coalesce(p_subject,''))>100 or (p_device is not null and p_device not in ('computer','mobile')) then raise exception 'Invalid presence'; end if;
 select show_live,show_subject,show_device into allow_live,allow_subject,allow_device from public.sentry_profiles where user_id=auth.uid();
 if not coalesce(allow_live,false) then return; end if;
 insert into sentry_private.presence(user_id,status,subject,elapsed_seconds,device_type,updated_at)
 values(auth.uid(),p_status,case when allow_subject then p_subject else null end,p_elapsed,case when allow_device and p_status<>'offline' then p_device else null end,now())
 on conflict(user_id) do update set status=excluded.status,subject=excluded.subject,elapsed_seconds=excluded.elapsed_seconds,device_type=excluded.device_type,updated_at=now();
end $$;
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
revoke all on function public.sentry_heartbeat_v2(text,text,integer,text) from public,anon;
revoke all on function public.sentry_circle_view_v2(uuid) from public,anon;
grant execute on function public.sentry_heartbeat_v2(text,text,integer,text) to authenticated;
grant execute on function public.sentry_circle_view_v2(uuid) to authenticated;
-- Old clients do not identify a device; clear stale device on their next heartbeat.
create or replace function public.sentry_heartbeat(p_status text,p_subject text,p_elapsed integer) returns void language plpgsql security definer set search_path=pg_catalog,public,sentry_private as $$ begin perform public.sentry_heartbeat_v2(p_status,p_subject,p_elapsed,null); end $$;

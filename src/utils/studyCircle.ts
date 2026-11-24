import { createClient, type Session } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { isTauriRuntime } from '../bridge/desktopBridge';

export const LOUNGE_BRAND_NAME = 'Study Lounge';
export const DEFAULT_CIRCLE_NAME = 'এইচএসসি 28';
export const DEFAULT_CIRCLE_TAGLINE =
  'এইচএসসি ২০২৮ ব্যাচের লাইভ স্টাডি রুম ও ফোকাস লিডারবোর্ড';

const HSC28_ALIASES = new Set([
  'এইচএসসি 28',
  'এইচএসসি ২৮',
  'hsc 28',
  'hsc28',
  'hsc 2028',
  'এইচএসসি ২০২৮',
]);

export function isDefaultHsc28Group(name?: string | null): boolean {
  const norm = String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return HSC28_ALIASES.has(norm);
}

export function privacyManualOffKey(uid: string): string {
  return `sentry-privacy-manual-off-${uid}`;
}

const client = createClient(
  'https://qedvixhoigrdulougvtd.supabase.co',
  'sb_publishable_4u8Q4qtUpZRwThs35g1zpA_DeHlimu9',
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: typeof window !== 'undefined' && !isTauriRuntime(),
    },
    ...(typeof WebSocket !== 'undefined'
      ? { realtime: { params: { eventsPerSecond: 12 } } }
      : {}),
  }
);

export const circleClient = client;

let ensureInFlight: Promise<{ groups: any[]; defaultGroupId: string; profile: any | null }> | null =
  null;

/**
 * Guarantees every Google-authenticated user (any Gmail) has:
 *  1) A valid `sentry_profiles` row with `show_live`, `show_subject`, `show_device`,
 *     and `show_leaderboard` ENABLED (unless explicitly turned off by the user),
 *     so nobody focusing ever gets stuck showing "offline" to friends.
 *  2) Automatic membership in the common public group "এইচএসসি 28".
 */
export async function ensureUserCircleBootstrap(passedSession?: Session | null) {
  if (ensureInFlight) return ensureInFlight;

  ensureInFlight = (async () => {
    try {
      const session =
        passedSession ?? (await client.auth.getSession()).data?.session ?? null;
      if (!session?.user?.id) {
        return { groups: [], defaultGroupId: '', profile: null };
      }

      const uid = session.user.id;
      const defaultName = (
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        session.user.email?.split('@')[0] ||
        'শিক্ষার্থী'
      ).slice(0, 60);

      let manuallyHidden = false;
      try {
        manuallyHidden = localStorage.getItem(privacyManualOffKey(uid)) === '1';
      } catch (_) {}

      let { data: profile, error: profErr } = await client
        .from('sentry_profiles')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle();
      if (profErr) throw profErr;

      if (!profile) {
        const ins = await client
          .from('sentry_profiles')
          .insert({
            user_id: uid,
            display_name: defaultName,
            show_live: true,
            show_subject: true,
            show_device: true,
            show_leaderboard: true,
            global_opt_in: true,
            quest_tracking: true,
          })
          .select()
          .single();
        if (ins.error) {
          const fallback = await client
            .from('sentry_profiles')
            .insert({ user_id: uid, display_name: defaultName })
            .select()
            .single();
          if (fallback.error) throw fallback.error;
          const up = await client
            .from('sentry_profiles')
            .update({
              show_live: true,
              show_subject: true,
              show_device: true,
              show_leaderboard: true,
              quest_tracking: true,
            })
            .eq('user_id', uid)
            .select()
            .single();
          profile = up.data || fallback.data;
        } else {
          profile = ins.data;
        }
      } else if (
        !manuallyHidden &&
        (!profile.show_live ||
          !profile.show_subject ||
          !profile.show_device ||
          !profile.show_leaderboard)
      ) {
        // Auto-heal any account whose legacy DB defaults left show_live / show_leaderboard false
        const up = await client
          .from('sentry_profiles')
          .update({
            show_live: true,
            show_subject: true,
            show_device: true,
            show_leaderboard: true,
            quest_tracking: true,
          })
          .eq('user_id', uid)
          .select()
          .single();
        if (!up.error && up.data) profile = up.data;
      }

      // 2. Fetch joined circles and ensure automatic membership in "এইচএসসি 28"
      let { data: myGroups, error: listErr } = await client.rpc('sentry_list_circles');
      if (listErr) throw listErr;
      let groups: any[] = Array.isArray(myGroups) ? myGroups : [];

      let hsc28 = groups.find((g) => isDefaultHsc28Group(g.name));

      if (!hsc28) {
        const { data: pubGroups, error: expErr } = await client.rpc('sentry_explore_groups_v2');
        if (!expErr && Array.isArray(pubGroups)) {
          const candidates = pubGroups
            .filter((g) => isDefaultHsc28Group(g.name))
            .sort(
              (a, b) =>
                (Number(b.member_count) || 0) - (Number(a.member_count) || 0) ||
                String(a.id).localeCompare(String(b.id))
            );
          const target = candidates[0];
          if (target) {
            if (!target.joined) {
              await client.rpc('sentry_join_public_group', { cid: target.id });
            }
            const refreshed = await client.rpc('sentry_list_circles');
            if (!refreshed.error && Array.isArray(refreshed.data)) {
              groups = refreshed.data;
              hsc28 = groups.find((g) => g.id === target.id || isDefaultHsc28Group(g.name));
            }
          }
        }
      }

      if (!hsc28) {
        const created = await client.rpc('sentry_create_group', {
          p_name: DEFAULT_CIRCLE_NAME,
          p_tagline: DEFAULT_CIRCLE_TAGLINE,
          p_category: 'study',
          p_visibility: 'public',
        });
        if (!created.error && created.data) {
          const refreshed = await client.rpc('sentry_list_circles');
          if (!refreshed.error && Array.isArray(refreshed.data)) {
            groups = refreshed.data;
            hsc28 = groups.find((g) => g.id === created.data || isDefaultHsc28Group(g.name));
          }
        }
      }

      groups = [...groups].sort((a, b) => {
        const aDef = isDefaultHsc28Group(a.name) ? 0 : 1;
        const bDef = isDefaultHsc28Group(b.name) ? 0 : 1;
        if (aDef !== bDef) return aDef - bDef;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      const defaultGroupId = hsc28?.id || groups[0]?.id || '';
      if (defaultGroupId) {
        try {
          const prev = localStorage.getItem('sentry-selected-circle');
          if (!prev || !groups.some((g) => g.id === prev)) {
            localStorage.setItem('sentry-selected-circle', defaultGroupId);
          }
        } catch (_) {}
      }

      return { groups, defaultGroupId, profile };
    } finally {
      ensureInFlight = null;
    }
  })();

  return ensureInFlight;
}

export async function circleLogin() {
  if (!isTauriRuntime()) {
    throw new Error('Google লগইন ডেস্কটপ অ্যাপে সরাসরি চালু হবে।');
  }
  const callback = await invoke<string>('start_sentry_oauth_callback');
  let unlisten: (() => void) | undefined;
  unlisten = await listen<string>('sentry://oauth-callback', async ({ payload }) => {
    unlisten?.();
    const args = new URL(payload, callback).searchParams;
    const code = args.get('code');
    if (code) {
      const { data, error } = await client.auth.exchangeCodeForSession(code);
      if (error) {
        window.dispatchEvent(new CustomEvent('sentry-auth-error', { detail: error.message }));
      } else if (data?.session) {
        ensureUserCircleBootstrap(data.session)
          .then(() => window.dispatchEvent(new Event('sentry-circle-changed')))
          .catch(() => {});
      }
    } else {
      window.dispatchEvent(
        new CustomEvent('sentry-auth-error', {
          detail: args.get('error_description') || 'লগইন সম্পন্ন হয়নি।',
        })
      );
    }
  });
  setTimeout(() => unlisten?.(), 185000);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    unlisten();
    throw error || new Error('লগইন লিংক তৈরি হয়নি');
  }
  await openUrl(data.url);
}

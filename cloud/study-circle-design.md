# Study Sentry — Study Circle implementation notes (work in progress)

Supabase project: https://qedvixhoigrdulougvtd.supabase.co
Authentication: Google OAuth, browser-mediated PKCE; desktop requires a secure callback/loopback or deep-link integration (not yet implemented). No OAuth client secret, Supabase secret key, or service role key belongs in the application.

## Privacy / security model
- Users keep their existing local workspace usable without signing in; cloud backup is explicit opt-in and must not overwrite local data automatically.
- Only confirmed circle members may see another member's approved display name and disclosed current study status. Email, phone, notes and raw sessions never go to other members.
- Private status, hidden subject and hidden leaderboard preferences must be enforced by server RPC, not merely hidden in the UI. RLS must deny cross-user reads by default.
- Invite codes are secrets: store hashes, limit usage/expiry and support revocation. No broad anonymous circle enumeration.
- Realtime access is scoped to authorized group members, and clients must display stale/disconnected status after a heartbeat timeout.
- Daily and weekly leaderboard calculations need clear timezone and session attribution. Client-provided timing is not proof of attention; validate and rate-limit.
- Personal cloud backup must have user-specific authorization, explicit upload/download, versioning, conflict handling and user-visible failures. It is not a substitute for independent exports.
- Google OAuth Testing users must be explicitly added. Production OAuth requires further configuration and possible verification. Never embed service_role or Google client secret in client apps.

## Integration gates
1. Design and peer-review schema and access policies. Test with at least two real accounts including unauthorized user, hidden subject/status, expired invitation and deleted membership.
2. Implement external browser OAuth + safe desktop callback, verify account switching and offline behavior.
3. Implement circle membership and privacy settings; then live heartbeat and leaderboard aggregation.
4. Test interruptions, stale presence and concurrent writes. Add cloud backup only with explicit opt-in, conflict/recovery tests and migration plan.
5. Owner must apply reviewed migration and configure redirect allowlist in Supabase; no dashboard access exists in this environment.

No cloud schema or live app feature has been deployed by this file. Project URL and publishable key do not authorize admin operations. Existing v2.8.0 remains intact.

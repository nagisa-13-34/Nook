# Nook Community Platform

This document describes the Nook-specific Community layer built on top of existing Misskey Channels.

## Architecture

The existing Misskey Channel remains the Community root and keeps its original timeline and federation behavior.
Nook-specific member-space features are stored in companion tables and exposed through `nook/community/*` API endpoints.

The implementation is intentionally split into small backend helpers, endpoint files, migrations, and frontend components instead of growing one large Community file.

Public Community reads such as `nook/community/show` and `nook/community/rules/list` use SELECT-only Community lookup and do not initialize or update companion rows. Legacy Channel initialization is separated from normal reads and writes only when the `nook_community` companion row is actually absent. Existing owner membership rows are never rewritten merely because a Community was viewed. A legacy Channel owner without a companion member row is represented synthetically both in membership checks and member listings, without turning a read into a database write.

## Feature and global policy gates

Community is controlled by Nook's global feature and policy layer before Community-specific roles are evaluated.

- every `nook/community/*` API requires the `community` feature flag
- every `nook/community/voice/*` API additionally requires the `voice_call` feature flag and the current user's `voice_call` policy decision
- direct join and invite use require `join_community`
- approval of a pending join request rechecks the requested user's current `join_community` policy inside the locked approval flow before activating membership
- when the Community feature is enabled, creation of the underlying Misskey Channel requires `create_community` and immediately initializes the Nook companion record
- a Voice subchannel cannot be created while the `voice_call` feature is disabled

The frontend reads only public feature availability (`community` and `voiceCall`). It hides the Community tab when Community is disabled, and hides Voice channels and Voice creation controls when Voice is disabled. Policy details themselves are not exposed by that feature endpoint.

## Community features

The current Community platform includes:

- base roles: owner / admin / moderator / member
- additive custom roles and scoped permissions
- open, approval, invite-only, and private join modes
- join requests and revocable invite links
- Community rules
- member management and bans
- text, announcement, media, forum, and voice subchannels
- Community messages and channel-aware search
- announcements
- Community and channel pins
- events and RSVP
- scoped Community bots with dedicated secrets
- WebRTC voice rooms
- local TTS for configured Community message channels
- synchronized Community music state for explicitly selected HTTPS audio sources
- automatic translation for Notes and Community content

## Permission model

Base roles provide default permissions. Custom roles add permissions but cannot remove Nook-wide safety restrictions.

Important rules:

- owner is the only wildcard role
- administrators cannot create another peer administrator through member management
- moderators cannot manage administrators
- custom-role managers cannot grant permissions that they do not already hold
- full custom-role configuration and custom-role IDs are exposed only to `roles.manage` users
- a custom role referenced by a restricted channel cannot be deleted until that channel stops using it
- bots only access message channels explicitly listed in their allowlist
- full bot configuration, including channel allowlists, is exposed only to `bots.manage` users
- restricted Community subchannels are checked before reading messages or translations
- restricted channel IDs are redacted from Event links and inaccessible message pins
- active bans take precedence over join, invite, approval, and leave flows
- a banned membership row cannot be removed by the banned user through `leave`, so leave-then-rejoin cannot clear a ban
- the frontend treats only `membership.state === 'active'` as member access; banned memberships do not expose member/admin UI
- an already-active member cannot reuse an invite to change their base role or consume an invite use
- parent channels, custom roles, replies, pins, event channels, and bot channel allowlists are validated against their owning Community before being stored

The Nook policy layer remains above Community permissions. A Community permission must never be treated as a way to bypass global safety policy.

## Leaving and Channel follows

Joining a Community may follow the underlying Misskey Channel so the normal Channel timeline remains connected to the Community experience. Community leave does not automatically unfollow that Channel, because the backend does not have ownership metadata proving that the follow was created by the Community join rather than by the user beforehand. Users remain free to unfollow the Channel separately.

When an active member leaves, their Community event RSVPs are removed before their active membership row is deleted. A banned member cannot use leave at all, and banning a member also removes their Community event RSVPs.

Event counts and capacity checks independently count only currently active Community members, plus the underlying Channel owner when represented synthetically. This means stale RSVP rows cannot continue consuming attendance capacity even if cleanup was missed by an older deployment.

## Bot credentials

Community bots use dedicated random secrets. They do not reuse user access tokens.

Only a SHA-256 hash of a bot secret is stored in the database. The plaintext secret is returned only when the bot is created or its secret is rotated.

Current integration-bot scopes are intentionally small:

- `read:messages`
- `write:messages`

A bot must also have an explicit channel allowlist. An empty allowlist grants no message access. Full bot configuration, including channel IDs, is available only to members with `bots.manage`.

## Voice

The current Voice implementation is a small-room WebRTC mesh MVP. The Nook backend handles Community authorization, presence, and signaling; media travels between permitted peers.

The backend revalidates the `community` and `voice_call` feature flags, the user's Nook `voice_call` policy, active membership, channel access, and `voice.join` during Voice activity. Peer listing reauthorizes other current participants too, so a participant whose policy, membership, or channel access is revoked can be pruned even if that participant stops sending heartbeats themselves.

It also reports which peers currently hold `voice.speak`; the official frontend mutes incoming audio tracks from peers that do not hold that permission and updates this state on heartbeat. When a user's `voice.speak` is revoked, the local microphone tracks are stopped. If the permission is later restored, the official frontend reacquires microphone access and replaces or renegotiates the existing peer audio sender without requiring a full room rejoin.

Voice session endpoints that mutate presence or signaling state (`join`, `heartbeat`, `leave`, `signal`, and signal consumption) require the Misskey `write:channels` app/token scope rather than `read:channels`.

Voice rejoin creates a new session generation. Before replacing presence with the new session ID, the backend clears old queued signals involving that user in the room. A leave from an obsolete session uses `DELETE ... RETURNING` and clears signaling only when that exact session was actually removed, so an old tab cannot erase a newer tab's signaling queue.

Global stale-presence and stale-signal cleanup is throttled to at most once every 30 seconds per backend process rather than being executed by every participant heartbeat. The timestamp cleanup remains opportunistic; a dedicated scheduled cleanup job and timestamp-oriented indexes are still options for larger deployments.

Because media is peer-to-peer in the mesh MVP, `voice.speak` is not a cryptographic server-side media gate against mutually modified clients. A future SFU should enforce publish permission at the media server for stronger server-side moderation.

Malformed signaling messages are isolated to the sending peer by the official frontend; a malformed offer, answer, or ICE payload does not force the receiving user to leave the entire Voice room.

This separation is intentional so the media layer can later be replaced by an SFU without replacing Community roles, channel records, or frontend navigation.

### ICE servers

No public STUN/TURN server is hardcoded.

Operators can provide ICE servers with:

```text
NOOK_VOICE_ICE_SERVERS=[{"urls":"stun:stun.example.com:3478"},{"urls":"turn:turn.example.com:3478","username":"nook","credential":"..."}]
```

For deployments that do not want direct peer candidates, set:

```text
NOOK_VOICE_ICE_TRANSPORT_POLICY=relay
```

`relay` requires a working TURN service.

### TTS

TTS uses the browser Speech Synthesis API. The server stores only the selected source channel and language settings. A newly joined client does not read the existing backlog aloud; only later messages are spoken.

A Voice heartbeat exposes `ttsSourceChannelId` only when the requesting Voice participant can currently access that source channel. If the configured source is restricted from that participant, their heartbeat response returns TTS as disabled with a null source ID, so hidden-channel metadata is not leaked and the frontend does not poll an inaccessible channel.

### Music

Music state stores an HTTPS source URL, title, position, and play/pause state. The browser does not fetch an external audio URL until the user explicitly chooses to play Community music on that device.

Nook does not fetch or redistribute third-party music on behalf of a Community. Operators and users are responsible for using audio they are allowed to use.

## Translation

Nook translation reuses the instance's existing DeepL configuration and the existing HTTP request service.

Original content is never replaced. Translations are cached separately by:

- object kind
- object ID
- SHA-256 hash of the current source text
- target language

Changing the source text changes its hash, so stale translated text is not reused. Community-message, announcement, and event cache entries are removed when their source object is deleted, and edited announcement/event text purges its previous translations. Cache entries older than 30 days are eligible for cleanup; cleanup is throttled and runs opportunistically during translation use rather than being a hard wall-clock deletion guarantee.

Supported Nook translation objects currently include:

- Notes
- Community messages
- Community announcements
- Community events

The frontend auto-translation preference is local to the browser and is disabled by default.

## Database migrations

The Community platform is split across sequential migrations beginning at `1786722000000` and ending with Community security guards at `1786727100000`.

Do not squash these migrations after they have been deployed to a persistent instance.

## Current MVP limitations

- Community messages use polling rather than a dedicated streaming channel.
- Voice uses peer-to-peer mesh and is intended for small rooms; large rooms should move to an SFU.
- `voice.speak` is enforced by authorization metadata plus the official mesh client; strong server-side media publish enforcement requires an SFU.
- Voice stale-row cleanup is throttled but still opportunistic rather than a dedicated scheduled maintenance job.
- TTS is browser-local rather than a server-side audio bot.
- Music is synchronized playback state rather than a server-side music relay.
- Translation-cache expiry is opportunistic; operators that require strict deletion deadlines should add a scheduled database cleanup job.
- `misskey-js` generated endpoint types must be regenerated after the Nook endpoints are finalized.

Before merging or deploying, run the backend/frontend/misskey-js typechecks, relevant unit tests, lint, migrations on a disposable database, and the `misskey-js` autogenerator.

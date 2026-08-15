# Nook Community Platform

This document describes the Nook-specific Community layer built on top of existing Misskey Channels.

## Architecture

The existing Misskey Channel remains the Community root and keeps its original timeline and federation behavior.
Nook-specific member-space features are stored in companion tables and exposed through `nook/community/*` API endpoints.

The implementation is intentionally split into small backend helpers, endpoint files, migrations, and frontend components instead of growing one large Community file.

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
- bots only access message channels explicitly listed in their allowlist
- full bot configuration, including channel allowlists, is exposed only to `bots.manage` users
- restricted Community subchannels are checked before reading messages or translations
- restricted channel IDs are redacted from Event links and inaccessible message pins
- active bans take precedence over join and invite flows
- an already-active member cannot reuse an invite to change their base role or consume an invite use
- parent channels, custom roles, replies, pins, event channels, and bot channel allowlists are validated against their owning Community before being stored

The Nook policy layer remains above Community permissions. A Community permission must never be treated as a way to bypass global safety policy.

## Bot credentials

Community bots use dedicated random secrets. They do not reuse user access tokens.

Only a SHA-256 hash of a bot secret is stored in the database. The plaintext secret is returned only when the bot is created or its secret is rotated.

Current integration-bot scopes are intentionally small:

- `read:messages`
- `write:messages`

A bot must also have an explicit channel allowlist. An empty allowlist grants no message access. Full bot configuration, including channel IDs, is available only to members with `bots.manage`.

## Voice

The current Voice implementation is a small-room WebRTC mesh MVP. The Nook backend handles Community authorization, presence, and signaling; media travels between permitted peers.

The backend revalidates active membership, channel access, and `voice.join` during Voice activity. It also reports which peers currently hold `voice.speak`; the official frontend mutes incoming audio tracks from peers that do not hold that permission and updates this state on heartbeat.

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
- TTS is browser-local rather than a server-side audio bot.
- Music is synchronized playback state rather than a server-side music relay.
- Translation-cache expiry is opportunistic; operators that require strict deletion deadlines should add a scheduled database cleanup job.
- `misskey-js` generated endpoint types must be regenerated after the Nook endpoints are finalized.

Before merging or deploying, run the backend/frontend/misskey-js typechecks, relevant unit tests, lint, migrations on a disposable database, and the `misskey-js` autogenerator.

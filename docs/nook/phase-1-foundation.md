# Nook Phase 1 foundation

Nook is developed as a gradual fork of Misskey. The first foundation keeps age rules out of feature code and provides emergency feature shutdowns before higher-risk features are connected.

## Policy boundary

Feature code asks `NookPolicyEngine` for a named permission. It must not compare an age or birth date directly.

Policy selection uses normalized account attributes:

- country
- verified age group
- account state
- optional explicitly assigned policy ID

No matching policy means denied. Birth-date verification and conversion to an age group are intentionally outside the engine so a future verifier can store only a verified age group.

## Feature flags

Nook-specific high-impact features start disabled. `NookFeatureFlags` accepts a complete settings snapshot so an administrator setting can replace the in-memory source without changing feature callers.

## Persistence

Policies are stored in `nook_policy` and emergency feature switches are stored in `nook_feature_flag`. Both are registered with TypeORM and NestJS repository injection. Age groups remain varchar values rather than a PostgreSQL enum so policy categories can evolve without hard-coding legal thresholds into the database schema.

The user profile stores an optional ISO country code, verified age group, and explicitly assigned policy ID. A deployment can therefore use a verified age group without retaining a date of birth.

## Runtime enforcement

Note creation now asks `NookAccessService` for the `create_post` permission before any note is written. Attachments also require `create_image_post` and/or `create_video_post` according to their validated MIME types. One-to-one chat checks `send_chat` for the sender and `receive_chat` for a local recipient before writing the message. Non-mutual users additionally require `chat_with_stranger`; when a verified adult and a protected age group communicate, the protected side additionally requires `chat_with_adult`. This relationship logic is centralized in `NookAccessService`, and recipient-side denials are returned as a generic unavailable-user response so policy attributes cannot be inferred. Room chat checks `send_chat` for the sender. Runtime enforcement is protected by the `policy_enforcement` feature flag, which starts disabled so an upgrade cannot unexpectedly block every existing user. Administrators must configure policies that cover the intended country and verified-age combinations before enabling it. Once enabled, a user without a matching policy is denied by default. Profiles without verification data are evaluated as country `*` and age group `UNKNOWN`, so access for those users must be granted deliberately through an appropriate fallback policy.

## Nook interface

The smartphone layout uses a Nook header with menu and notifications, plus a five-item bottom navigation for Home, Explore, Create, Community, and Chat. Community currently opens the existing Misskey Channels experience so the navigation can remain stable while the dedicated Community model is implemented incrementally. Desktop navigation displays the Nook wordmark while preserving the existing Misskey components and instance menu.

The Timeline adds stable Nook views without duplicating the Misskey API. Following uses the existing home timeline, Discover uses the local timeline with a global fallback, and Media uses the home timeline with its attachment-only filter. Discover does not introduce a recommendation algorithm yet, so the future Recommendations feature flag can switch a dedicated module in without changing the tab contract.

Profiles expose Posts, Media, Videos, and Works as stable Nook tabs. Media and Videos use the existing user notes API with a MIME-family filter backed by the note's stored attachment types. Works reuses Misskey Gallery, which already represents content that the author deliberately publishes as a work, avoiding a duplicate content model during the gradual fork.

## Administration

Administrator-only APIs can list the current settings, upsert a complete policy, update one emergency feature flag, and assign a local user's country, verified age group, or explicit policy. Every write records its before/after state in the existing Misskey moderation audit log. The user safety settings are available from the existing administrator user detail page and do not require storing a date of birth.

## Next small changes

1. Add bookmark entry points and private-by-default Likes controls.
2. Replace the temporary Channels-backed Community destination with the dedicated Community model.
3. Apply relationship-aware rules to voice/video calls and Spaces token issuance.

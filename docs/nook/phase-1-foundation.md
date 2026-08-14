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

Note creation now asks `NookAccessService` for the `create_post` permission before any note is written. Runtime enforcement is protected by the `policy_enforcement` feature flag, which starts disabled so an upgrade cannot unexpectedly block every existing user. Administrators must configure policies that cover the intended country and verified-age combinations before enabling it. Once enabled, a user without a matching policy is denied by default. Profiles without verification data are evaluated as country `*` and age group `UNKNOWN`, so access for those users must be granted deliberately through an appropriate fallback policy.

## Administration

Administrator-only APIs can list the current settings, upsert a complete policy, and update one emergency feature flag. Every write records its before/after state in the existing Misskey moderation audit log.

## Next small changes

1. Add administrator controls for assigning a user's country, verified age group, and policy.
2. Reuse the shared policy access service at chat and media entry points.
3. Add the mobile-first Nook navigation and branding.

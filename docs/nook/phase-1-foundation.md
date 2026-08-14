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

## Next small changes

1. Add administrator APIs and audit logging.
2. Add a shared authorization guard used by posting and chat entry points.
3. Add the mobile-first Nook navigation and branding.

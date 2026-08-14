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

Nook-specific high-impact features start disabled. `NookFeatureFlags` accepts a complete settings snapshot so a database-backed administrator setting can replace the in-memory source later without changing feature callers.

## Next small changes

1. Add persistent policy and feature-flag entities with reversible migrations.
2. Add administrator APIs and audit logging.
3. Add a shared authorization guard used by posting and chat entry points.
4. Add the mobile-first Nook navigation and branding.

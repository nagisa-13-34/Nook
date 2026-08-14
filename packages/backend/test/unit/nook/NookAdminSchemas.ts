/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { nookFeatureFlagSchema, nookPermissionProperties, nookPermissionsSchema, nookUpdatedFeatureFlagSchema, nookUserPolicyContextSchema } from '@/nook/api/NookAdminSchemas.js';
import { nookPermissions } from '@/nook/policy/PolicyTypes.js';
import { meta as getSettingsMeta } from '@/server/api/endpoints/admin/nook/get-settings.js';
import { meta as getUserPolicyContextMeta } from '@/server/api/endpoints/admin/nook/get-user-policy-context.js';
import { meta as updateFeatureFlagMeta } from '@/server/api/endpoints/admin/nook/update-feature-flag.js';
import { meta as updateUserPolicyContextMeta } from '@/server/api/endpoints/admin/nook/update-user-policy-context.js';
import { meta as upsertPolicyMeta } from '@/server/api/endpoints/admin/nook/upsert-policy.js';

describe('Nook admin schemas', () => {
	test('requires every policy permission', () => {
		expect(Object.keys(nookPermissionProperties).sort()).toEqual([...nookPermissions].sort());
		expect([...nookPermissionsSchema.required].sort()).toEqual([...nookPermissions].sort());
	});

	test('rejects unknown permission keys', () => {
		expect(nookPermissionsSchema.additionalProperties).toBe(false);
	});

	test('requires an admin and the matching management permission', () => {
		expect(getSettingsMeta).toMatchObject({ requireCredential: true, requireAdmin: true, kind: 'read:admin:meta' });
		expect(upsertPolicyMeta).toMatchObject({ requireCredential: true, requireAdmin: true, kind: 'write:admin:roles' });
		expect(updateFeatureFlagMeta).toMatchObject({ requireCredential: true, requireAdmin: true, kind: 'write:admin:meta' });
		expect(getUserPolicyContextMeta).toMatchObject({ requireCredential: true, requireAdmin: true, kind: 'read:admin:roles' });
		expect(updateUserPolicyContextMeta).toMatchObject({ requireCredential: true, requireAdmin: true, kind: 'write:admin:roles' });
	});

	test('only allows a null update time for an unstored default flag', () => {
		expect(nookFeatureFlagSchema.properties.updatedAt.nullable).toBe(true);
		expect(nookUpdatedFeatureFlagSchema.properties.updatedAt.nullable).toBe(false);
	});

	test('does not expose a date of birth in the user policy context', () => {
		expect(Object.keys(nookUserPolicyContextSchema.properties).sort()).toEqual([
			'country',
			'policyId',
			'userId',
			'verifiedAgeGroup',
		]);
	});
});

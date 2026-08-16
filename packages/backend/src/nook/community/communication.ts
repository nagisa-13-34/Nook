/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { DataSource } from 'typeorm';
import { defaultNookFeatureFlags } from '@/nook/feature-flags/NookFeatureFlags.js';
import { NookPolicyEngine } from '@/nook/policy/NookPolicyEngine.js';
import { isNookAdultAgeGroup } from '@/nook/policy/PolicyTypes.js';
import type { NookAccountState, NookAgeGroup, NookPermission, NookPolicy, NookPolicySubject } from '@/nook/policy/PolicyTypes.js';
import { baseRolePermissions, isNookCommunityPermission } from './permissions.js';
import type { NookCommunityBaseRole } from './types.js';

export type NookCommunityAdultBoundaryPermission = Extract<NookPermission, 'chat_with_adult' | 'call_with_adult'>;
type NookCommunityQueryExecutor = Pick<DataSource, 'query'>;

export class NookCommunityCommunicationError extends Error {
	constructor(public readonly code: 'ADULT_BOUNDARY' | 'NO_SUCH_CHANNEL' | 'NO_LOCAL_ACTOR') { super(code); }
}

type CommunityUserRow = Readonly<{
	id: string;
	host: string | null;
	isDeleted: boolean;
	isSuspended: boolean;
	nookCountryCode: string | null;
	nookVerifiedAgeGroup: NookAgeGroup | null;
	nookPolicyId: string | null;
}>;

function getAccountState(user: Pick<CommunityUserRow, 'isDeleted' | 'isSuspended'>): NookAccountState {
	if (user.isDeleted) return 'banned';
	if (user.isSuspended) return 'suspended';
	return 'active';
}

function getSubject(user: CommunityUserRow): NookPolicySubject {
	return {
		country: user.nookCountryCode ?? '*',
		ageGroup: user.nookVerifiedAgeGroup ?? 'UNKNOWN',
		accountState: getAccountState(user),
		...(user.nookPolicyId == null ? {} : { assignedPolicyId: user.nookPolicyId }),
	};
}

function hasAgeBoundary(senderAgeGroup: NookAgeGroup, recipient: CommunityUserRow | null): { sender: boolean; recipient: boolean } {
	const recipientAgeGroup = recipient?.nookVerifiedAgeGroup ?? 'UNKNOWN';
	const senderNeedsPermission = !isNookAdultAgeGroup(senderAgeGroup) && (
		recipient == null || recipient.host != null || recipientAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(recipientAgeGroup)
	);
	const recipientNeedsPermission = recipient != null && recipient.host == null &&
		!isNookAdultAgeGroup(recipientAgeGroup) && (senderAgeGroup === 'UNKNOWN' || isNookAdultAgeGroup(senderAgeGroup));
	return { sender: senderNeedsPermission, recipient: recipientNeedsPermission };
}

async function isPolicyEnforcementEnabled(db: NookCommunityQueryExecutor): Promise<boolean> {
	const rows = await db.query<Array<{ enabled: boolean }>>(
		'SELECT "enabled" FROM "nook_feature_flag" WHERE "name" = $1 LIMIT 1', ['policy_enforcement']);
	return rows[0]?.enabled ?? defaultNookFeatureFlags.policy_enforcement;
}

export async function assertNookCommunityAdultBoundaryForUserIds(
	db: NookCommunityQueryExecutor,
	actorUserId: string,
	targetUserIds: readonly string[],
	permission: NookCommunityAdultBoundaryPermission,
): Promise<void>;
export async function assertNookCommunityAdultBoundaryForUserIds(
	db: NookCommunityQueryExecutor,
	legacyAccessService: unknown,
	actorUserId: string,
	targetUserIds: readonly string[],
	permission: NookCommunityAdultBoundaryPermission,
): Promise<void>;
export async function assertNookCommunityAdultBoundaryForUserIds(
	db: NookCommunityQueryExecutor,
	actorOrLegacyService: string | unknown,
	targetsOrActor: readonly string[] | string,
	permissionOrTargets: NookCommunityAdultBoundaryPermission | readonly string[],
	legacyPermission?: NookCommunityAdultBoundaryPermission,
): Promise<void> {
	const legacyCall = typeof actorOrLegacyService !== 'string';
	const actorUserId = legacyCall ? targetsOrActor as string : actorOrLegacyService;
	const targetUserIds = legacyCall ? permissionOrTargets as readonly string[] : targetsOrActor as readonly string[];
	const permission = legacyCall ? legacyPermission : permissionOrTargets as NookCommunityAdultBoundaryPermission;
	if (permission == null) throw new Error('Community adult-boundary permission is required.');

	const uniqueTargetIds = [...new Set(targetUserIds.filter(userId => userId !== actorUserId))];
	if (uniqueTargetIds.length === 0) return;
	if (!(await isPolicyEnforcementEnabled(db))) return;

	const requestedUserIds = [actorUserId, ...uniqueTargetIds];
	const [users, policies] = await Promise.all([
		db.query<CommunityUserRow[]>(
			`SELECT u."id", u."host", u."isDeleted", u."isSuspended",
			 up."nookCountryCode", up."nookVerifiedAgeGroup", up."nookPolicyId"
			 FROM "user" u
			 LEFT JOIN "user_profile" up ON up."userId" = u."id"
			 WHERE u."id" = ANY($1::varchar[])`, [requestedUserIds]),
		db.query<NookPolicy[]>(
			`SELECT "id", "country", "ageGroup", "accountStates", "permissions", "priority", "enabled"
			 FROM "nook_policy"`),
	]);
	const userById = new Map(users.map(user => [user.id, user]));
	const actor = userById.get(actorUserId);
	if (actor == null || actor.host != null) throw new NookCommunityCommunicationError('NO_LOCAL_ACTOR');
	const actorAgeGroup = actor.nookVerifiedAgeGroup ?? 'UNKNOWN';
	const engine = new NookPolicyEngine(policies);
	let actorDecisionChecked = false;
	for (const targetUserId of uniqueTargetIds) {
		const targetRow = userById.get(targetUserId) ?? null;
		const target = targetRow?.host == null ? targetRow : null;
		const boundary = hasAgeBoundary(actorAgeGroup, targetRow);
		if (boundary.sender && !actorDecisionChecked) {
			actorDecisionChecked = true;
			if (!engine.evaluate(getSubject(actor), permission).allowed) throw new NookCommunityCommunicationError('ADULT_BOUNDARY');
		}
		if (boundary.recipient && target != null && !engine.evaluate(getSubject(target), permission).allowed) {
			throw new NookCommunityCommunicationError('ADULT_BOUNDARY');
		}
	}
}

export async function listNookCommunityActiveMemberUserIds(db: NookCommunityQueryExecutor, communityId: string): Promise<string[]> {
	const rows = await db.query<Array<{ userId: string }>>(
		`SELECT "userId" FROM "nook_community_member" WHERE "communityId" = $1 AND "state" = 'active'
		 UNION
		 SELECT "userId" FROM "channel" WHERE "id" = $1 AND "userId" IS NOT NULL`, [communityId]);
	return rows.map(row => row.userId);
}

export async function assertNookCommunityMembershipAdultBoundary(db: NookCommunityQueryExecutor, communityId: string, userId: string): Promise<void> {
	const activeUserIds = await listNookCommunityActiveMemberUserIds(db, communityId);
	await assertNookCommunityAdultBoundaryForUserIds(db, userId, activeUserIds, 'chat_with_adult');
}

export async function listNookCommunityChannelAudienceUserIds(db: NookCommunityQueryExecutor, communityId: string, channelId: string): Promise<string[]> {
	const channelRows = await db.query<Array<{ ownerId: string | null; allowedRoleIds: unknown }>>(
		`SELECT c."userId" AS "ownerId", cc."allowedRoleIds"
		 FROM "nook_community_channel" cc
		 INNER JOIN "channel" c ON c."id" = cc."communityId"
		 WHERE cc."communityId" = $1 AND cc."id" = $2 LIMIT 1`, [communityId, channelId]);
	const channel = channelRows[0];
	if (channel == null) throw new NookCommunityCommunicationError('NO_SUCH_CHANNEL');
	const allowedRoleIds = Array.isArray(channel.allowedRoleIds) ? channel.allowedRoleIds.filter((roleId): roleId is string => typeof roleId === 'string') : [];
	const members = await db.query<Array<{ userId: string; baseRole: NookCommunityBaseRole }>>(
		`SELECT "userId", "baseRole" FROM "nook_community_member" WHERE "communityId" = $1 AND "state" = 'active'`, [communityId]);
	if (channel.ownerId != null && !members.some(member => member.userId === channel.ownerId)) members.push({ userId: channel.ownerId, baseRole: 'owner' });
	if (allowedRoleIds.length === 0) return members.map(member => member.userId);
	const roleRows = await db.query<Array<{ userId: string; roleId: string; permissions: unknown }>>(
		`SELECT mr."userId", mr."roleId", r."permissions"
		 FROM "nook_community_member_role" mr
		 INNER JOIN "nook_community_role" r ON r."communityId" = mr."communityId" AND r."id" = mr."roleId"
		 WHERE mr."communityId" = $1`, [communityId]);
	const roleRowsByUserId = new Map<string, typeof roleRows>();
	for (const role of roleRows) {
		const current = roleRowsByUserId.get(role.userId) ?? [];
		current.push(role);
		roleRowsByUserId.set(role.userId, current);
	}
	return members.filter(member => {
		const basePermissions = baseRolePermissions(member.baseRole);
		if (basePermissions.has('*') || basePermissions.has('channels.manage')) return true;
		return (roleRowsByUserId.get(member.userId) ?? []).some(role =>
			allowedRoleIds.includes(role.roleId) || (Array.isArray(role.permissions) && role.permissions.some(permission => isNookCommunityPermission(permission) && permission === 'channels.manage')));
	}).map(member => member.userId);
}

export async function assertNookCommunityChannelAdultBoundary(
	db: NookCommunityQueryExecutor,
	actorUserId: string,
	communityId: string,
	channelId: string,
	permission: NookCommunityAdultBoundaryPermission,
): Promise<void>;
export async function assertNookCommunityChannelAdultBoundary(
	db: NookCommunityQueryExecutor,
	legacyAccessService: unknown,
	actorUserId: string,
	communityId: string,
	channelId: string,
	permission: NookCommunityAdultBoundaryPermission,
): Promise<void>;
export async function assertNookCommunityChannelAdultBoundary(
	db: NookCommunityQueryExecutor,
	actorOrLegacyService: string | unknown,
	communityOrActor: string,
	channelOrCommunity: string,
	permissionOrChannel: NookCommunityAdultBoundaryPermission | string,
	legacyPermission?: NookCommunityAdultBoundaryPermission,
): Promise<void> {
	const legacyCall = typeof actorOrLegacyService !== 'string';
	const actorUserId = legacyCall ? communityOrActor : actorOrLegacyService;
	const communityId = legacyCall ? channelOrCommunity : communityOrActor;
	const channelId = legacyCall ? permissionOrChannel as string : channelOrCommunity;
	const permission = legacyCall ? legacyPermission : permissionOrChannel as NookCommunityAdultBoundaryPermission;
	if (permission == null) throw new Error('Community adult-boundary permission is required.');
	const audienceUserIds = await listNookCommunityChannelAudienceUserIds(db, communityId, channelId);
	await assertNookCommunityAdultBoundaryForUserIds(db, actorUserId, audienceUserIds, permission);
}

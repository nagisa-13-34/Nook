/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { ModuleRef } from '@nestjs/core';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import type { DataSource } from 'typeorm';
import type { Config } from '@/config.js';
import type { InstancesRepository, AccessTokensRepository } from '@/models/_.js';
import type { MiLocalUser } from '@/models/User.js';
import { DI } from '@/di-symbols.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { bindThis } from '@/decorators.js';
import { ensureNookCommunity } from '@/nook/community/access.js';
import { NookAccessService } from '@/nook/policy/NookAccessService.js';
import endpoints from './endpoints.js';
import { ApiCallService } from './ApiCallService.js';
import { ApiError } from './error.js';
import { SignupApiService } from './SignupApiService.js';
import { SigninApiService } from './SigninApiService.js';
import { SigninWithPasskeyApiService } from './SigninWithPasskeyApiService.js';
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';

const nookCommunityDisabled = {
	message: 'Community is currently disabled by the Nook feature flag.',
	code: 'NOOK_COMMUNITY_DISABLED',
	id: '5aa139c4-72cb-41c2-af40-37e1d37f9024',
	kind: 'permission',
	httpStatusCode: 403,
} as const;

const nookVoiceDisabled = {
	message: 'Voice calls are currently disabled by the Nook feature flag.',
	code: 'NOOK_VOICE_CALL_DISABLED',
	id: 'c71e6c24-7c60-45be-a609-45145d6dcd7a',
	kind: 'permission',
	httpStatusCode: 403,
} as const;

const nookCommunityPolicyDenied = {
	message: 'This Community action is restricted by the current Nook policy.',
	code: 'RESTRICTED_BY_NOOK_POLICY',
	id: '19f85dc5-bf12-4b1a-bd16-66fb2b49759f',
	kind: 'permission',
	httpStatusCode: 403,
} as const;

@Injectable()
export class ApiServerService {
	constructor(
		private moduleRef: ModuleRef,

		@Inject(DI.config)
		private config: Config,

		@Inject(DI.db)
		private db: DataSource,

		@Inject(DI.instancesRepository)
		private instancesRepository: InstancesRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		private userEntityService: UserEntityService,
		private apiCallService: ApiCallService,
		private nookAccessService: NookAccessService,
		private signupApiService: SignupApiService,
		private signinApiService: SigninApiService,
		private signinWithPasskeyApiService: SigninWithPasskeyApiService,
	) {
		//this.createServer = this.createServer.bind(this);
	}

	private async ensureLegacyCommunityWriteAllowed(endpointName: string, endpointKind: string | undefined, user: MiLocalUser | null | undefined, data: unknown): Promise<void> {
		if (endpointKind == null || !endpointKind.startsWith('write:')) return;
		if (typeof data !== 'object' || data == null) return;
		const communityId = (data as Record<string, unknown>).communityId;
		if (typeof communityId !== 'string') return;

		const rows = await this.db.query<Array<{
			ownerId: string | null;
			initialized: boolean;
			isDeleted: boolean | null;
			isSuspended: boolean | null;
		}>>(
			`SELECT c."userId" AS "ownerId",
			 (nc."channelId" IS NOT NULL) AS "initialized",
			 u."isDeleted", u."isSuspended"
			 FROM "channel" c
			 LEFT JOIN "nook_community" nc ON nc."channelId" = c."id"
			 LEFT JOIN "user" u ON u."id" = c."userId" AND u."host" IS NULL
			 WHERE c."id" = $1 LIMIT 1`,
			[communityId],
		);
		const row = rows[0];
		if (row == null || row.initialized) return;
		if (row.ownerId == null || row.isDeleted == null || row.isSuspended == null) throw new ApiError(nookCommunityPolicyDenied);

		// A failed management write from a non-owner must not materialize a legacy
		// Channel into a Community as a side effect. Public join is the one write
		// that may legitimately materialize a legacy Community for a non-owner.
		if (endpointName !== 'nook/community/join' && user?.id !== row.ownerId) return;

		const owner = {
			id: row.ownerId,
			isDeleted: row.isDeleted,
			isSuspended: row.isSuspended,
		} as MiLocalUser;
		const createDecision = await this.nookAccessService.evaluate(owner, 'create_community');
		const joinDecision = await this.nookAccessService.evaluate(owner, 'join_community');
		if (!createDecision.allowed || !joinDecision.allowed) throw new ApiError(nookCommunityPolicyDenied);
		await ensureNookCommunity(this.db, communityId);
	}

	private async assertNookEndpointAccess(endpointName: string, user: MiLocalUser | null | undefined, data?: unknown, endpointKind?: string): Promise<void> {
		if (!endpointName.startsWith('nook/community/')) return;
		if (!(await this.nookAccessService.isFeatureEnabled('community'))) throw new ApiError(nookCommunityDisabled);

		if (endpointName.startsWith('nook/community/voice/')) {
			if (!(await this.nookAccessService.isFeatureEnabled('voice_call'))) throw new ApiError(nookVoiceDisabled);
			if (user != null && !(await this.nookAccessService.evaluate(user, 'voice_call')).allowed) {
				throw new ApiError(nookCommunityPolicyDenied);
			}
		}

		if (user != null && (endpointName === 'nook/community/join' || endpointName === 'nook/community/invites/use')) {
			if (!(await this.nookAccessService.evaluate(user, 'join_community')).allowed) {
				throw new ApiError(nookCommunityPolicyDenied);
			}
		}

		await this.ensureLegacyCommunityWriteAllowed(endpointName, endpointKind, user, data);
	}

	@bindThis
	public createServer(fastify: FastifyInstance, options: FastifyPluginOptions, done: (err?: Error) => void) {
		fastify.register(cors, {
			origin: '*',
		});

		fastify.register(multipart, {
			limits: {
				fileSize: this.config.maxFileSize,
				files: 1,
			},
		});

		// Prevent cache
		fastify.addHook('onRequest', (request, reply, done) => {
			reply.header('Cache-Control', 'private, max-age=0, must-revalidate');
			done();
		});

		for (const endpoint of endpoints) {
			const endpointExec = this.moduleRef.get('ep:' + endpoint.name, { strict: false }).exec;
			const ep = {
				name: endpoint.name,
				meta: endpoint.meta,
				params: endpoint.params,
				exec: async (data: unknown, user: MiLocalUser | null | undefined, ...rest: unknown[]) => {
					await this.assertNookEndpointAccess(endpoint.name, user, data, endpoint.meta.kind);
					return await endpointExec(data, user, ...rest);
				},
			};

			if (endpoint.meta.requireFile) {
				fastify.all<{
					Params: { endpoint: string; },
					Body: Record<string, unknown>,
					Querystring: Record<string, unknown>,
				}>('/' + endpoint.name, async (request, reply) => {
					if (request.method === 'GET' && !endpoint.meta.allowGet) {
						reply.code(405);
						reply.send();
						return;
					}

					// Await so that any error can automatically be translated to HTTP 500
					await this.apiCallService.handleMultipartRequest(ep, request, reply);
					return reply;
				});
			} else {
				fastify.all<{
					Params: { endpoint: string; },
					Body: Record<string, unknown>,
					Querystring: Record<string, unknown>,
				}>('/' + endpoint.name, { bodyLimit: 1024 * 1024 }, async (request, reply) => {
					if (request.method === 'GET' && !endpoint.meta.allowGet) {
						reply.code(405);
						reply.send();
						return;
					}

					// Await so that any error can automatically be translated to HTTP 500
					await this.apiCallService.handleRequest(ep, request, reply);
					return reply;
				});
			}
		}

		fastify.post<{
			Body: {
				username: string;
				password: string;
				host?: string;
				invitationCode?: string;
				emailAddress?: string;
				'hcaptcha-response'?: string;
				'g-recaptcha-response'?: string;
				'turnstile-response'?: string;
				'm-captcha-response'?: string;
				'testcaptcha-response'?: string;
			}
		}>('/signup', (request, reply) => this.signupApiService.signup(request, reply));

		fastify.post<{
			Body: {
				username: string;
				password?: string;
				token?: string;
				credential?: AuthenticationResponseJSON;
				'hcaptcha-response'?: string;
				'g-recaptcha-response'?: string;
				'turnstile-response'?: string;
				'm-captcha-response'?: string;
				'testcaptcha-response'?: string;
			};
		}>('/signin-flow', (request, reply) => this.signinApiService.signin(request, reply));

		fastify.post<{
			Body: {
				credential?: AuthenticationResponseJSON;
				context?: string;
			};
		}>('/signin-with-passkey', (request, reply) => this.signinWithPasskeyApiService.signin(request, reply));

		fastify.post<{ Body: { code: string; } }>('/signup-pending', (request, reply) => this.signupApiService.signupPending(request, reply));

		fastify.get('/v1/instance/peers', async (request, reply) => {
			const instances = await this.instancesRepository.find({
				select: { host: true },
				where: {
					suspensionState: 'none',
				},
			});

			return instances.map(instance => instance.host);
		});

		fastify.post<{ Params: { session: string; } }>('/miauth/:session/check', async (request, reply) => {
			const token = await this.accessTokensRepository.findOneBy({
				session: request.params.session,
			});

			if (token && token.session != null && !token.fetched) {
				this.accessTokensRepository.update(token.id, {
					fetched: true,
				});

				return {
					ok: true,
					token: token.token,
					user: await this.userEntityService.pack(token.userId, null, { schema: 'UserDetailedNotMe' }),
				};
			} else {
				return {
					ok: false,
				};
			}
		});

		fastify.all('/clear-browser-cache', (request, reply) => {
			if (['GET', 'POST'].includes(request.method)) {
				reply.header('Clear-Site-Data', '"cache", "prefetchCache", "prerenderCache", "executionContexts"');
				reply.code(204);
				reply.send();
			} else {
				reply.code(405);
				reply.send();
			}
		});

		// Make sure any unknown path under /api returns HTTP 404 Not Found,
		// because otherwise ClientServerService will return the base client HTML
		// page with HTTP 200.
		fastify.get('/*', (request, reply) => {
			reply.code(404);
			// Mock ApiCallService.send's error handling
			reply.send({
				error: {
					message: 'Unknown API endpoint.',
					code: 'UNKNOWN_API_ENDPOINT',
					id: '2ca3b769-540a-4f08-9dd5-b5a825b6d0f1',
					kind: 'client',
				},
			});
		});

		done();
	}
}

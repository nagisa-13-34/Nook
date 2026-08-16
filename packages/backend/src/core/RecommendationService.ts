/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import type { Packed } from '@/misc/json-schema.js';
import { isChannelRelated } from '@/misc/is-channel-related.js';
import { isQuote, isRenote } from '@/misc/is-renote.js';
import type { MiNote } from '@/models/Note.js';
import type { MiLocalUser } from '@/models/User.js';
import type { NotesRepository } from '@/models/_.js';
import { bindThis } from '@/decorators.js';
import { ChannelFollowingService } from '@/core/ChannelFollowingService.js';
import { ChannelMutingService } from '@/core/ChannelMutingService.js';
import { FanoutTimelineService } from '@/core/FanoutTimelineService.js';
import { IdService } from '@/core/IdService.js';
import { QueryService } from '@/core/QueryService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import {
	rankRecommendationCandidates,
	selectDiverseRecommendations,
	type RecommendationRankCandidate,
	type RecommendationSource,
} from '@/core/recommendation/RecommendationRanking.js';

const HOME_CANDIDATE_LIMIT = 160;
const LOCAL_CANDIDATE_LIMIT = 240;
const LOCAL_FALLBACK_SCAN_PAGES = 10;
const MIN_CANDIDATE_MULTIPLIER = 3;
const RECOMMENDATION_SESSION_MAX_ITEMS = 400;
const RECOMMENDATION_SESSION_TTL_SECONDS = 60 * 60 * 2;
const RECOMMENDATION_SESSION_KEY_PREFIX = 'nook:recommendation-session:';

export type RecommendationPageOptions = {
	snapshotAt?: Date;
	excludeNoteIds?: readonly MiNote['id'][];
};

export type RecommendationSessionPage = {
	notes: Packed<'Note'>[];
	cursor: string | null;
};

type RecommendationSessionState = {
	userId: MiLocalUser['id'];
	snapshotAt: number;
	noteIds: MiNote['id'][];
};

type RecommendationCursorState = {
	sessionId: string;
	position: number;
};

@Injectable()
export class RecommendationService {
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		private fanoutTimelineService: FanoutTimelineService,
		private queryService: QueryService,
		private channelFollowingService: ChannelFollowingService,
		private channelMutingService: ChannelMutingService,
		private idService: IdService,
		private noteEntityService: NoteEntityService,

		@Optional()
		@Inject(DI.redis)
		private redisClient?: Redis.Redis,
	) {
	}

	@bindThis
	public async getRecommendations(me: MiLocalUser, limit: number, options: RecommendationPageOptions = {}): Promise<Packed<'Note'>[]> {
		const requestStartedAt = new Date();
		const requestedSnapshotTime = options.snapshotAt?.getTime();
		const snapshotAt = requestedSnapshotTime != null && Number.isFinite(requestedSnapshotTime)
			? new Date(Math.min(requestedSnapshotTime, requestStartedAt.getTime()))
			: requestStartedAt;
		const selected = await this.selectRecommendationNotes(me, limit, snapshotAt, new Set(options.excludeNoteIds ?? []));
		return await this.noteEntityService.packMany(selected, me);
	}

	@bindThis
	public async getRecommendationPage(me: MiLocalUser, limit: number, cursor?: string): Promise<RecommendationSessionPage | null> {
		const redisClient = this.redisClient;
		if (redisClient == null) throw new Error('Recommendation sessions require Redis.');

		if (cursor == null) {
			const snapshotAt = new Date();
			const selected = await this.selectRecommendationNotes(me, RECOMMENDATION_SESSION_MAX_ITEMS, snapshotAt, new Set());
			const pageNotes = selected.slice(0, limit);
			const packed = await this.noteEntityService.packMany(pageNotes, me);

			if (selected.length <= limit) {
				return { notes: packed, cursor: null };
			}

			const sessionId = randomUUID();
			await this.saveRecommendationSession(sessionId, {
				userId: me.id,
				snapshotAt: snapshotAt.getTime(),
				noteIds: selected.map(note => note.id),
			});

			return { notes: packed, cursor: this.createRecommendationCursor(sessionId, limit) };
		}

		const cursorState = this.parseRecommendationCursor(cursor);
		if (cursorState == null) return null;

		const rawSession = await redisClient.get(this.recommendationSessionKey(cursorState.sessionId));
		if (rawSession == null) return null;
		const session = this.parseRecommendationSession(rawSession, me);
		if (session == null || cursorState.position > session.noteIds.length) return null;

		const remainingIds = session.noteIds.slice(cursorState.position);
		const mutedChannels = await this.channelMutingService.mutingChannelsCache.fetch(me.id);
		const eligibleNotes = await this.loadEligibleNotes(remainingIds, me, mutedChannels);
		const eligibleById = new Map(eligibleNotes.map(note => [note.id, note]));
		const pageNotes: MiNote[] = [];
		let nextPosition = cursorState.position;

		while (nextPosition < session.noteIds.length && pageNotes.length < limit) {
			const note = eligibleById.get(session.noteIds[nextPosition]);
			nextPosition++;
			if (note != null) pageNotes.push(note);
		}

		const packed = await this.noteEntityService.packMany(pageNotes, me);
		if (nextPosition >= session.noteIds.length) {
			return { notes: packed, cursor: null };
		}

		return {
			notes: packed,
			cursor: this.createRecommendationCursor(cursorState.sessionId, nextPosition),
		};
	}

	private async selectRecommendationNotes(
		me: MiLocalUser,
		limit: number,
		snapshotAt: Date,
		excludedNoteIds: ReadonlySet<MiNote['id']>,
	): Promise<MiNote[]> {
		const isPageCandidate = (noteId: MiNote['id']): boolean => {
			if (excludedNoteIds.has(noteId)) return false;
			try {
				return this.idService.parse(noteId).date.getTime() <= snapshotAt.getTime();
			} catch {
				return false;
			}
		};

		const [homeIds, localIds, followedChannels, mutedChannels] = await Promise.all([
			this.fanoutTimelineService.get(`homeTimeline:${me.id}`),
			this.fanoutTimelineService.get('localTimeline'),
			this.channelFollowingService.userFollowingChannelsCache.fetch(me.id),
			this.channelMutingService.mutingChannelsCache.fetch(me.id),
		]);

		const sourcesByNoteId = new Map<MiNote['id'], Set<RecommendationSource>>();
		this.addSource(sourcesByNoteId, homeIds.filter(isPageCandidate).slice(0, HOME_CANDIDATE_LIMIT), 'home-network');
		this.addSource(sourcesByNoteId, localIds.filter(isPageCandidate).slice(0, LOCAL_CANDIDATE_LIMIT), 'local-discovery');

		let notes = await this.loadEligibleNotes([...sourcesByNoteId.keys()], me, mutedChannels);
		const desiredPoolSize = Math.min(LOCAL_CANDIDATE_LIMIT, limit * MIN_CANDIDATE_MULTIPLIER);

		if (notes.length < desiredPoolSize) {
			const fallbackNotes = await this.loadRecentEligibleLocalNotes(me, mutedChannels, LOCAL_CANDIDATE_LIMIT, snapshotAt, excludedNoteIds);
			for (const note of fallbackNotes) {
				if (!sourcesByNoteId.has(note.id)) {
					sourcesByNoteId.set(note.id, new Set(['local-discovery']));
				}
			}
			notes = this.mergeNotes(notes, fallbackNotes);
		}

		const rankCandidates: RecommendationRankCandidate[] = [];

		for (const note of notes) {
			const sources = sourcesByNoteId.get(note.id) ?? new Set<RecommendationSource>(['local-discovery']);
			if (isChannelRelated(note, followedChannels)) sources.add('followed-channel');

			rankCandidates.push({
				noteId: note.id,
				userId: note.userId,
				channelId: note.channelId,
				createdAt: this.idService.parse(note.id).date,
				reactionsCount: Object.values(note.reactions).reduce((sum, count) => sum + count, 0),
				repliesCount: note.repliesCount,
				renoteCount: note.renoteCount,
				sources,
			});
		}

		const ranked = rankRecommendationCandidates(rankCandidates, me.id, snapshotAt);

		// Visibility and mute state can change while ranking is in progress. Refresh mutable
		// channel state and revalidate the full ranked pool before diversity selection so
		// invalidated top candidates can be replaced by the next eligible candidates.
		const finalMutedChannels = await this.channelMutingService.mutingChannelsCache.fetch(me.id);
		const finalNotes = await this.loadEligibleNotes(ranked.map(candidate => candidate.noteId), me, finalMutedChannels);
		const finalNoteById = new Map(finalNotes.map(note => [note.id, note]));
		const finalRanked = ranked.filter(candidate => finalNoteById.has(candidate.noteId));
		const selected = selectDiverseRecommendations(finalRanked, limit);
		return selected
			.map(candidate => finalNoteById.get(candidate.noteId))
			.filter((note): note is MiNote => note != null);
	}

	private recommendationSessionKey(sessionId: string): string {
		return `${RECOMMENDATION_SESSION_KEY_PREFIX}${sessionId}`;
	}

	private createRecommendationCursor(sessionId: string, position: number): string {
		return `${sessionId}:${position}`;
	}

	private parseRecommendationCursor(cursor: string): RecommendationCursorState | null {
		const match = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):([0-9]{1,3})$/i.exec(cursor);
		if (match == null) return null;
		const position = Number(match[2]);
		if (!Number.isInteger(position) || position < 1 || position > RECOMMENDATION_SESSION_MAX_ITEMS) return null;
		return { sessionId: match[1], position };
	}

	private async saveRecommendationSession(sessionId: string, state: RecommendationSessionState): Promise<void> {
		const redisClient = this.redisClient;
		if (redisClient == null) throw new Error('Recommendation sessions require Redis.');
		await redisClient.set(
			this.recommendationSessionKey(sessionId),
			JSON.stringify(state),
			'EX',
			RECOMMENDATION_SESSION_TTL_SECONDS,
		);
	}

	private parseRecommendationSession(raw: string, me: MiLocalUser): RecommendationSessionState | null {
		try {
			const parsed = JSON.parse(raw) as Partial<RecommendationSessionState>;
			if (parsed.userId !== me.id) return null;
			if (!Number.isFinite(parsed.snapshotAt)) return null;
			if (!Array.isArray(parsed.noteIds) || parsed.noteIds.length > RECOMMENDATION_SESSION_MAX_ITEMS) return null;
			if (!parsed.noteIds.every(noteId => typeof noteId === 'string')) return null;
			return parsed as RecommendationSessionState;
		} catch {
			return null;
		}
	}

	private addSource(map: Map<MiNote['id'], Set<RecommendationSource>>, noteIds: readonly MiNote['id'][], source: RecommendationSource): void {
		for (const noteId of noteIds) {
			const sources = map.get(noteId) ?? new Set<RecommendationSource>();
			sources.add(source);
			map.set(noteId, sources);
		}
	}

	private mergeNotes(primary: readonly MiNote[], fallback: readonly MiNote[]): MiNote[] {
		const merged = new Map<MiNote['id'], MiNote>();
		for (const note of primary) merged.set(note.id, note);
		for (const note of fallback) merged.set(note.id, note);
		return [...merged.values()];
	}

	private async loadEligibleNotes(noteIds: readonly MiNote['id'][], me: MiLocalUser, mutedChannels: Set<string>): Promise<MiNote[]> {
		if (noteIds.length === 0) return [];

		const query = this.createEligibleQuery(me)
			.andWhere('note.id IN (:...recommendationNoteIds)', { recommendationNoteIds: noteIds });

		return this.filterEligibleNotes(await query.getMany(), mutedChannels);
	}

	private async loadRecentEligibleLocalNotes(
		me: MiLocalUser,
		mutedChannels: Set<string>,
		limit: number,
		snapshotAt: Date,
		excludedNoteIds: ReadonlySet<MiNote['id']>,
	): Promise<MiNote[]> {
		const result: MiNote[] = [];
		let beforeId: MiNote['id'] | null = null;
		const snapshotBoundaryId = this.idService.genTimeUpperBound(snapshotAt.getTime());

		for (let page = 0; page < LOCAL_FALLBACK_SCAN_PAGES && result.length < limit; page++) {
			const query = this.createEligibleQuery(me)
				.andWhere('note.userHost IS NULL')
				.andWhere('note.visibility = :recommendationPublicVisibility', { recommendationPublicVisibility: 'public' })
				.andWhere('note.channelId IS NULL')
				.andWhere('note.replyId IS NULL')
				.andWhere('note.id < :recommendationSnapshotBoundaryId', { recommendationSnapshotBoundaryId: snapshotBoundaryId });

			if (beforeId != null) {
				query.andWhere('note.id < :recommendationBeforeId', { recommendationBeforeId: beforeId });
			}

			const notes = await query
				.orderBy('note.id', 'DESC')
				.take(LOCAL_CANDIDATE_LIMIT)
				.getMany();

			if (notes.length === 0) break;

			for (const note of this.filterEligibleNotes(notes, mutedChannels)) {
				if (excludedNoteIds.has(note.id)) continue;
				try {
					if (this.idService.parse(note.id).date.getTime() > snapshotAt.getTime()) continue;
				} catch {
					continue;
				}
				result.push(note);
				if (result.length >= limit) break;
			}

			beforeId = notes.at(-1)?.id ?? null;
			if (notes.length < LOCAL_CANDIDATE_LIMIT || beforeId == null) break;
		}

		return result;
	}

	private createEligibleQuery(me: MiLocalUser) {
		const query = this.notesRepository.createQueryBuilder('note')
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser')
			.leftJoinAndSelect('note.channel', 'channel')
			.andWhere('note.userId != :recommendationMeId', { recommendationMeId: me.id })
			.andWhere('note.visibility != :recommendationDirectVisibility', { recommendationDirectVisibility: 'specified' });

		this.queryService.generateVisibilityQuery(query, me);
		this.queryService.generateBaseNoteFilteringQuery(query, me);
		this.queryService.generateMutedUserRenotesQueryForNotes(query, me);
		this.queryService.generateMutedNoteThreadQuery(query, me);

		return query;
	}

	private filterEligibleNotes(notes: readonly MiNote[], mutedChannels: Set<string>): MiNote[] {
		return notes.filter(note => {
			if (isChannelRelated(note, mutedChannels)) return false;
			if (isRenote(note) && !isQuote(note)) return false;
			return true;
		});
	}
}

/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
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
const MIN_CANDIDATE_MULTIPLIER = 3;

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
	) {
	}

	@bindThis
	public async getRecommendations(me: MiLocalUser, limit: number): Promise<Packed<'Note'>[]> {
		const snapshotAt = new Date();
		const [homeIds, localIds, followedChannels, mutedChannels] = await Promise.all([
			this.fanoutTimelineService.get(`homeTimeline:${me.id}`),
			this.fanoutTimelineService.get('localTimeline'),
			this.channelFollowingService.userFollowingChannelsCache.fetch(me.id),
			this.channelMutingService.mutingChannelsCache.fetch(me.id),
		]);

		const sourcesByNoteId = new Map<MiNote['id'], Set<RecommendationSource>>();
		this.addSource(sourcesByNoteId, homeIds.slice(0, HOME_CANDIDATE_LIMIT), 'home-network');
		this.addSource(sourcesByNoteId, localIds.slice(0, LOCAL_CANDIDATE_LIMIT), 'local-discovery');

		let notes = await this.loadEligibleNotes([...sourcesByNoteId.keys()], me, mutedChannels);
		const desiredPoolSize = Math.min(LOCAL_CANDIDATE_LIMIT, limit * MIN_CANDIDATE_MULTIPLIER);

		if (notes.length < desiredPoolSize) {
			const fallbackNotes = await this.loadRecentEligibleLocalNotes(me, mutedChannels, LOCAL_CANDIDATE_LIMIT);
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
		const selected = selectDiverseRecommendations(ranked, limit);
		const selectedIds = selected.map(candidate => candidate.noteId);

		// Visibility and mute state can change while ranking is in progress, so refresh mutable
		// channel state and validate the selected set once more immediately before packing.
		const finalMutedChannels = await this.channelMutingService.mutingChannelsCache.fetch(me.id);
		const finalNotes = await this.loadEligibleNotes(selectedIds, me, finalMutedChannels);
		const finalNoteById = new Map(finalNotes.map(note => [note.id, note]));
		const orderedNotes = selectedIds
			.map(id => finalNoteById.get(id))
			.filter((note): note is MiNote => note != null);

		return await this.noteEntityService.packMany(orderedNotes, me);
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

	private async loadRecentEligibleLocalNotes(me: MiLocalUser, mutedChannels: Set<string>, limit: number): Promise<MiNote[]> {
		const notes = await this.createEligibleQuery(me)
			.andWhere('note.userHost IS NULL')
			.andWhere('note.replyId IS NULL')
			.orderBy('note.id', 'DESC')
			.take(limit)
			.getMany();

		return this.filterEligibleNotes(notes, mutedChannels);
	}

	private createEligibleQuery(me: MiLocalUser) {
		const query = this.notesRepository.createQueryBuilder('note')
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser')
			.leftJoinAndSelect('note.channel', 'channel')
			.andWhere('note.userId != :recommendationMeId', { recommendationMeId: me.id });

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

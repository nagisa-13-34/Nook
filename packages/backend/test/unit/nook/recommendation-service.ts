/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test, vi } from 'vitest';
import { RecommendationService } from '@/core/RecommendationService.js';
import type { ChannelFollowingService } from '@/core/ChannelFollowingService.js';
import type { ChannelMutingService } from '@/core/ChannelMutingService.js';
import type { FanoutTimelineService } from '@/core/FanoutTimelineService.js';
import type { IdService } from '@/core/IdService.js';
import type { QueryService } from '@/core/QueryService.js';
import type { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import type { MiNote } from '@/models/Note.js';
import type { MiLocalUser } from '@/models/User.js';
import type { NotesRepository } from '@/models/_.js';

const me = { id: 'viewer' } as MiLocalUser;

function note(id: string, userId: string): MiNote {
	return {
		id,
		userId,
		channelId: null,
		reactions: {},
		repliesCount: 0,
		renoteCount: 0,
		renote: null,
	} as MiNote;
}

describe('RecommendationService', () => {
	test('local discovery fallback only considers public non-channel local notes', async () => {
		const query = {
			innerJoinAndSelect: vi.fn(),
			leftJoinAndSelect: vi.fn(),
			andWhere: vi.fn(),
			orderBy: vi.fn(),
			take: vi.fn(),
			getMany: vi.fn().mockResolvedValue([]),
		};
		query.innerJoinAndSelect.mockReturnValue(query);
		query.leftJoinAndSelect.mockReturnValue(query);
		query.andWhere.mockReturnValue(query);
		query.orderBy.mockReturnValue(query);
		query.take.mockReturnValue(query);

		const service = new RecommendationService(
			{ createQueryBuilder: vi.fn().mockReturnValue(query) } as unknown as NotesRepository,
			{} as FanoutTimelineService,
			{
				generateVisibilityQuery: vi.fn(),
				generateBaseNoteFilteringQuery: vi.fn(),
				generateMutedUserRenotesQueryForNotes: vi.fn(),
				generateMutedNoteThreadQuery: vi.fn(),
			} as unknown as QueryService,
			{} as ChannelFollowingService,
			{} as ChannelMutingService,
			{} as IdService,
			{} as NoteEntityService,
		);
		const internal = service as unknown as {
			loadRecentEligibleLocalNotes(
				user: MiLocalUser,
				mutedChannels: Set<string>,
				limit: number,
				snapshotAt: Date,
				excludedNoteIds: ReadonlySet<string>,
			): Promise<MiNote[]>;
		};

		await internal.loadRecentEligibleLocalNotes(me, new Set(), 40, new Date(), new Set());

		expect(query.andWhere).toHaveBeenCalledWith('note.userHost IS NULL');
		expect(query.andWhere).toHaveBeenCalledWith(
			'note.visibility = :recommendationPublicVisibility',
			{ recommendationPublicVisibility: 'public' },
		);
		expect(query.andWhere).toHaveBeenCalledWith('note.channelId IS NULL');
		expect(query.andWhere).toHaveBeenCalledWith('note.replyId IS NULL');
	});

	test('filters displayed and post-snapshot notes before loading recommendation candidates', async () => {
		const candidates = [
			note('seen', 'author-1'),
			note('future', 'author-2'),
			note('eligible', 'author-3'),
		];
		const parsedDates = new Map([
			['seen', new Date('2026-08-15T10:00:00.000Z')],
			['future', new Date('2026-08-15T13:00:00.000Z')],
			['eligible', new Date('2026-08-15T11:00:00.000Z')],
		]);
		const service = new RecommendationService(
			{} as NotesRepository,
			{
				get: vi.fn().mockImplementation(async (name: string) => name === `homeTimeline:${me.id}` ? candidates.map(candidate => candidate.id) : []),
			} as unknown as FanoutTimelineService,
			{} as QueryService,
			{
				userFollowingChannelsCache: { fetch: vi.fn().mockResolvedValue(new Set<string>()) },
			} as unknown as ChannelFollowingService,
			{
				mutingChannelsCache: { fetch: vi.fn().mockResolvedValue(new Set<string>()) },
			} as unknown as ChannelMutingService,
			{
				parse: vi.fn().mockImplementation((id: string) => ({ date: parsedDates.get(id) ?? new Date(0) })),
			} as unknown as IdService,
			{
				packMany: vi.fn().mockImplementation(async (notes: MiNote[]) => notes),
			} as unknown as NoteEntityService,
		);
		const internal = service as unknown as {
			loadEligibleNotes(noteIds: readonly string[], user: MiLocalUser, mutedChannels: Set<string>): Promise<MiNote[]>;
			loadRecentEligibleLocalNotes(
				user: MiLocalUser,
				mutedChannels: Set<string>,
				limit: number,
				snapshotAt: Date,
				excludedNoteIds: ReadonlySet<string>,
			): Promise<MiNote[]>;
		};
		const loadEligibleNotes = vi.spyOn(internal, 'loadEligibleNotes').mockImplementation(async (ids) => candidates.filter(candidate => ids.includes(candidate.id)));
		vi.spyOn(internal, 'loadRecentEligibleLocalNotes').mockResolvedValue([]);

		const result = await service.getRecommendations(me, 1, {
			snapshotAt: new Date('2026-08-15T12:00:00.000Z'),
			excludeNoteIds: ['seen'],
		});

		expect(loadEligibleNotes.mock.calls[0]?.[0]).toEqual(['eligible']);
		expect(result.map(resultNote => resultNote.id)).toEqual(['eligible']);
	});

	test('revalidates the full ranked pool so invalid top candidates are replaced', async () => {
		const candidates = [
			note('n1', 'author-1'),
			note('n2', 'author-2'),
			note('n3', 'author-3'),
			note('n4', 'author-4'),
			note('n5', 'author-5'),
			note('n6', 'author-6'),
		];
		const fanoutGet = vi.fn().mockImplementation(async (name: string) => {
			if (name === `homeTimeline:${me.id}`) return ['n1'];
			if (name === 'localTimeline') return ['n2', 'n3', 'n4', 'n5', 'n6'];
			return [];
		});
		const packMany = vi.fn().mockImplementation(async (notes: MiNote[]) => notes);
		const service = new RecommendationService(
			{} as NotesRepository,
			{ get: fanoutGet } as unknown as FanoutTimelineService,
			{} as QueryService,
			{
				userFollowingChannelsCache: { fetch: vi.fn().mockResolvedValue(new Set<string>()) },
			} as unknown as ChannelFollowingService,
			{
				mutingChannelsCache: { fetch: vi.fn().mockResolvedValue(new Set<string>()) },
			} as unknown as ChannelMutingService,
			{
				parse: vi.fn().mockReturnValue({ date: new Date('2026-08-15T12:00:00.000Z') }),
			} as unknown as IdService,
			{ packMany } as unknown as NoteEntityService,
		);
		const internal = service as unknown as {
			loadEligibleNotes(noteIds: readonly string[], user: MiLocalUser, mutedChannels: Set<string>): Promise<MiNote[]>;
		};
		const loadEligibleNotes = vi.spyOn(internal, 'loadEligibleNotes')
			.mockResolvedValueOnce(candidates)
			.mockResolvedValueOnce(candidates.slice(1));

		const result = await service.getRecommendations(me, 2);

		expect(loadEligibleNotes).toHaveBeenCalledTimes(2);
		expect(loadEligibleNotes.mock.calls[1]?.[0]).toHaveLength(6);
		expect(result).toHaveLength(2);
		expect(packMany).toHaveBeenCalledWith(expect.any(Array), me);
	});
});

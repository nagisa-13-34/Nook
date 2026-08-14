/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { NookAccountState, NookAgeGroup, NookPermissionSet } from '@/nook/policy/PolicyTypes.js';

@Entity('nook_policy')
@Index(['country', 'ageGroup', 'enabled'])
export class MiNookPolicy {
	@PrimaryColumn('varchar', {
		length: 64,
	})
	public id: string;

	@Column('timestamp with time zone')
	public createdAt: Date;

	@Column('timestamp with time zone')
	public updatedAt: Date;

	@Column('varchar', {
		length: 8,
		comment: 'ISO 3166-1 alpha-2 country code or * for a fallback policy.',
	})
	public country: string;

	@Column('varchar', {
		length: 32,
	})
	public ageGroup: NookAgeGroup;

	@Column('varchar', {
		length: 32,
		array: true,
		default: '{}',
	})
	public accountStates: NookAccountState[];

	@Column('jsonb')
	public permissions: NookPermissionSet;

	@Column('integer', {
		default: 0,
	})
	public priority: number;

	@Column('boolean', {
		default: true,
	})
	public enabled: boolean;
}

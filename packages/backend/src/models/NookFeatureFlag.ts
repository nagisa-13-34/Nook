/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { NookFeatureName } from '@/nook/feature-flags/NookFeatureFlags.js';

@Entity('nook_feature_flag')
export class MiNookFeatureFlag {
	@PrimaryColumn('varchar', {
		length: 64,
	})
	public name: NookFeatureName;

	@Column('boolean', {
		default: false,
	})
	public enabled: boolean;

	@Column('timestamp with time zone')
	public updatedAt: Date;
}

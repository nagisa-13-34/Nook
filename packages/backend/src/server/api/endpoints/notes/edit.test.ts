/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import { describe, expect, test } from 'vitest';
import { getValidator } from '../../../../../test/prelude/get-api-validator.js';
import { paramDef } from './edit.js';

describe('api:notes/edit', () => {
    const validate = getValidator(paramDef);

    test('requires noteId, text, and cw fields', () => {
        expect(validate({ noteId: '9abc', text: 'hello', cw: null })).toBe(true);
        expect(validate({ noteId: '9abc', text: 'hello' })).toBe(false);
        expect(validate({ text: 'hello', cw: null })).toBe(false);
    });

    test('allows removing text or CW explicitly', () => {
        expect(validate({ noteId: '9abc', text: null, cw: null })).toBe(true);
        expect(validate({ noteId: '9abc', text: 'body', cw: '' })).toBe(true);
    });

    test('rejects an overlong CW', () => {
        expect(validate({ noteId: '9abc', text: 'body', cw: 'x'.repeat(101) })).toBe(false);
    });
});

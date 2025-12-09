import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

vi.mock('chalk', () => ({
    default: {
        red: (s: string) => `red(${s})`,
        bold: (s: string) => `bold(${s})`,
    },
    red: (s: string) => `red(${s})`,
    bold: (s: string) => `bold(${s})`,
}));

import { validateData, validateDataSafe } from '../validation.js';

describe('validation helpers', () => {
    const schema = z.object({
        name: z.string(),
        age: z.number().int().positive(),
    });

    it('returns parsed data when valid', () => {
        const result = validateData(schema, { name: 'a', age: 1 });
        expect(result).toEqual({ name: 'a', age: 1 });
    });

    it('throws with formatted message when invalid', () => {
        expect(() => validateData(schema, { name: 1 }))
            .toThrow(/age: Required/);
    });

    it('returns errors array without throw (safe)', () => {
        const success = validateDataSafe(schema, { name: 'b', age: 3 });
        expect(success).toEqual({ success: true, data: { name: 'b', age: 3 } });

        const failure = validateDataSafe(schema, { name: 'b' });
        expect(failure.success).toBe(false);
        if (failure.success === false) {
            expect(failure.errors[0]).toContain('age');
        }
    });

    it('handles root-level errors', () => {
        const simple = z.string();
        expect(() => validateData(simple, 123)).toThrow(/root: Expected string/);
        const failure = validateDataSafe(simple, 123);
        expect(failure.success).toBe(false);
        if (failure.success === false) {
            expect(failure.errors[0]).toContain('root');
        }
    });
});

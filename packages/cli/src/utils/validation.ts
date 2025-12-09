import { z } from 'zod';
import chalk from 'chalk';

/**
 * 데이터 검증 헬퍼 함수
 */
export function validateData<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
    errorPrefix: string = 'Validation error'
): T {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errors = result.error.errors.map(e => {
            const path = e.path.length > 0 ? e.path.join('.') : 'root';
            return `  ${chalk.red('✖')} ${path}: ${e.message}`;
        }).join('\n');

        throw new Error(`${chalk.bold(errorPrefix)}:\n${errors}`);
    }

    return result.data;
}

/**
 * 데이터 검증 (오류 반환)
 */
export function validateDataSafe<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (!result.success) {
        const errors = result.error.errors.map(e => {
            const path = e.path.length > 0 ? e.path.join('.') : 'root';
            return `${path}: ${e.message}`;
        });

        return { success: false, errors };
    }

    return { success: true, data: result.data };
}

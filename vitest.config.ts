import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['packages/**/src/**/*.{test,spec}.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.turbo/**',
            'packages/web/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: [
                'packages/**/src/services/**/*.ts',
                'packages/**/src/use-cases/**/*.ts',
                'packages/**/src/utils/**/*.ts',
                'packages/**/src/constants/**/*.ts',
                'packages/**/src/schemas/**/*.ts',
            ],
            exclude: [
                '**/__tests__/**',
                '**/*.d.ts',
                '**/index.ts',
                '**/lib.ts',
                '**/use-cases/**/*DTOs.ts',
                '**/use-cases/IUseCase.ts',
                '**/templates/**',
                '**/dist/**',
            ],
        },
    },
});

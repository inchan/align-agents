import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: [
            'packages/**/src/**/*.{test,spec}.{ts,tsx}',
            'packages/**/src/__tests__/**/*.{test,spec}.{ts,tsx}',
        ],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/.turbo/**',
            'packages/web/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            reportsDirectory: './coverage',
            include: [
                'packages/errors/src/**/*.ts',
                'packages/**/src/services/**/*.ts',
                'packages/**/src/use-cases/**/*.ts',
                'packages/**/src/utils/**/*.ts',
                'packages/**/src/constants/**/*.ts',
                'packages/**/src/schemas/**/*.ts',
                'packages/**/src/controllers/**/*.ts',
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

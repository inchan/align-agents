import { z } from 'zod';

// Rules 동기화 설정 스키마
export const RulesConfigSchema = z.record(
    z.object({
        enabled: z.boolean(),
        targetPath: z.string(),
        global: z.boolean(),
        ruleId: z.string().optional(),
    })
);

// 전역 설정 스키마
export const GlobalConfigSchema = z.object({
    masterDir: z.string().min(1, 'Master directory is required'),
    autoBackup: z.boolean(),
});

// 타입 추출
export type RulesConfig = z.infer<typeof RulesConfigSchema>;
export type GlobalConfig = z.infer<typeof GlobalConfigSchema>;

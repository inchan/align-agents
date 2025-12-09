import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
    fetchRulesList,
    createRule,
    updateRule,
    deleteRule,
    setActiveRule,
    getActiveRule,
    type Rule
} from '../rules-multi.js'
import fs from 'fs'
import path from 'path'
import os from 'os'

const { TEST_RULES_DIR, TEST_INDEX_PATH, TEST_MASTER_RULES_PATH } = vi.hoisted(() => {
    const os = require('os')
    const path = require('path')
    const dir = path.join(os.tmpdir(), 'test-rules-' + Date.now())
    return {
        TEST_RULES_DIR: dir,
        TEST_INDEX_PATH: path.join(dir, '.ai-cli-syncer', 'rules', 'index.json'),
        TEST_MASTER_RULES_PATH: path.join(dir, '.ai-cli-syncer', 'master-rules.md')
    }
})

// Mock the paths
vi.mock('os', async (importOriginal) => {
    const actual = await importOriginal<typeof import('os')>()
    return {
        ...actual,
        default: {
            ...actual,
            homedir: () => TEST_RULES_DIR,
            tmpdir: () => actual.tmpdir()
        },
        homedir: () => TEST_RULES_DIR
    }
})

describe('Rules Multi Service', () => {
    beforeEach(async () => {
        vi.resetModules()
        // Create test directory
        if (!fs.existsSync(TEST_RULES_DIR)) {
            fs.mkdirSync(TEST_RULES_DIR, { recursive: true })
        }
        // Create .ai-cli-syncer directory
        const configDir = path.join(TEST_RULES_DIR, '.ai-cli-syncer')
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true })
        }
        // Create empty master-rules.md
        fs.writeFileSync(TEST_MASTER_RULES_PATH, '')
    })

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(TEST_RULES_DIR)) {
            fs.rmSync(TEST_RULES_DIR, { recursive: true, force: true })
        }
    })

    describe('fetchRulesList', () => {
        it('should return empty array when no rules exist', () => {
            const rules = fetchRulesList()
            expect(rules).toEqual([])
        })

        it('should return all rules', () => {
            createRule('Rule 1', '# Content 1')
            createRule('Rule 2', '# Content 2')

            const rules = fetchRulesList()
            expect(rules).toHaveLength(2)
            expect(rules[0].name).toBe('Rule 1')
            expect(rules[1].name).toBe('Rule 2')
        })
    })

    describe('createRule', () => {
        it('should create a new rule', () => {
            const rule = createRule('Test Rule', '# Test Content')

            expect(rule.id).toBeDefined()
            expect(rule.name).toBe('Test Rule')
            expect(rule.content).toBe('# Test Content')
            expect(rule.isActive).toBe(false)
            expect(rule.createdAt).toBeDefined()
            expect(rule.updatedAt).toBeDefined()
        })

        it('should add rule to the list', () => {
            createRule('Rule 1', '# Content 1')

            const rules = fetchRulesList()
            expect(rules).toHaveLength(1)
        })

        it('should handle empty content', () => {
            const rule = createRule('Empty Rule', '')
            expect(rule.content).toBe('')
        })
    })

    describe('updateRule', () => {
        it('should update rule content', async () => {
            const rule = createRule('Test', '# Old Content')
            await new Promise(resolve => setTimeout(resolve, 10))
            const updated = updateRule(rule.id, '# New Content')

            expect(updated.content).toBe('# New Content')
            expect(updated.updatedAt).not.toBe(rule.updatedAt)
        })

        it('should throw error for non-existent rule', () => {
            expect(() => {
                updateRule('non-existent-id', '# Content')
            }).toThrow('Rule not found')
        })

        it('should update master-rules.md if rule is active', () => {
            const rule = createRule('Active Rule', '# Original')
            setActiveRule(rule.id)

            updateRule(rule.id, '# Updated')

            const masterContent = fs.readFileSync(TEST_MASTER_RULES_PATH, 'utf-8')
            expect(masterContent).toBe('# Updated')
        })
    })

    describe('deleteRule', () => {
        it('should delete a rule', () => {
            const rule = createRule('To Delete', '# Delete Me')
            deleteRule(rule.id)

            const rules = fetchRulesList()
            expect(rules.find((r: Rule) => r.id === rule.id)).toBeUndefined()
        })

        it('should throw error for non-existent rule', () => {
            expect(() => {
                deleteRule('non-existent-id')
            }).toThrow('Rule not found')
        })

        it('should clear master-rules.md if active rule is deleted', () => {
            const rule = createRule('Active', '# Content')
            setActiveRule(rule.id)

            deleteRule(rule.id)

            const masterContent = fs.readFileSync(TEST_MASTER_RULES_PATH, 'utf-8')
            expect(masterContent).toBe('')
        })
    })

    describe('setActiveRule', () => {
        it('should activate a rule', () => {
            const rule = createRule('Test', '# Content')
            setActiveRule(rule.id)

            const rules = fetchRulesList()
            const activeRule = rules.find((r: Rule) => r.id === rule.id)
            expect(activeRule?.isActive).toBe(true)
        })

        it('should deactivate other rules', () => {
            const rule1 = createRule('Rule 1', '# Content 1')
            const rule2 = createRule('Rule 2', '# Content 2')

            setActiveRule(rule1.id)
            setActiveRule(rule2.id)

            const rules = fetchRulesList()
            expect(rules.find((r: Rule) => r.id === rule1.id)?.isActive).toBe(false)
            expect(rules.find((r: Rule) => r.id === rule2.id)?.isActive).toBe(true)
        })

        it('should update master-rules.md with active rule content', () => {
            const rule = createRule('Test', '# Test Content')
            setActiveRule(rule.id)

            const masterContent = fs.readFileSync(TEST_MASTER_RULES_PATH, 'utf-8')
            expect(masterContent).toBe('# Test Content')
        })

        it('should throw error for non-existent rule', () => {
            expect(() => {
                setActiveRule('non-existent-id')
            }).toThrow('Rule not found')
        })
    })

    describe('getActiveRule', () => {
        it('should return null when no active rule', () => {
            const activeRule = getActiveRule()
            expect(activeRule).toBeNull()
        })

        it('should return the active rule', () => {
            const rule1 = createRule('Rule 1', '# Content 1')
            const rule2 = createRule('Rule 2', '# Content 2')

            setActiveRule(rule2.id)

            const activeRule = getActiveRule()
            expect(activeRule?.id).toBe(rule2.id)
        })
    })
})

import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'
import { getRulesDir } from '../constants/paths.js';

export interface Rule {
    id: string
    name: string
    content: string
    isActive: boolean
    createdAt: string
    updatedAt: string
}

interface RulesIndex {
    rules: Rule[]
    activeRuleId: string | null
}

const RULES_DIR = getRulesDir()
const RULES_INDEX_PATH = path.join(RULES_DIR, 'index.json')


// Ensure rules directory exists
function ensureRulesDir() {
    if (!fs.existsSync(RULES_DIR)) {
        fs.mkdirSync(RULES_DIR, { recursive: true })
    }
}

// Load rules index
function loadIndex(): RulesIndex {
    ensureRulesDir()

    if (!fs.existsSync(RULES_INDEX_PATH)) {
        const defaultIndex: RulesIndex = { rules: [], activeRuleId: null }
        fs.writeFileSync(RULES_INDEX_PATH, JSON.stringify(defaultIndex, null, 2))
        return defaultIndex
    }

    const content = fs.readFileSync(RULES_INDEX_PATH, 'utf-8')
    return JSON.parse(content)
}

// Save rules index
function saveIndex(index: RulesIndex) {
    ensureRulesDir()
    fs.writeFileSync(RULES_INDEX_PATH, JSON.stringify(index, null, 2))
}



// Fetch all rules
export function fetchRulesList(): Rule[] {
    const index = loadIndex()
    return index.rules
}

// Create new rule
export function createRule(name: string, content: string): Rule {
    const index = loadIndex()

    const newRule: Rule = {
        id: uuidv4(),
        name,
        content,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }

    index.rules.push(newRule)
    saveIndex(index)

    return newRule
}

// Update rule
export function updateRule(id: string, content: string, name?: string): Rule {
    const index = loadIndex()
    const rule = index.rules.find(r => r.id === id)

    if (!rule) {
        throw new Error(`Rule not found: ${id}`)
    }

    rule.content = content
    if (name) {
        rule.name = name
    }
    rule.updatedAt = new Date().toISOString()

    saveIndex(index)



    return rule
}

// Delete rule
export function deleteRule(id: string): void {
    const index = loadIndex()
    const ruleIndex = index.rules.findIndex(r => r.id === id)

    if (ruleIndex === -1) {
        throw new Error(`Rule not found: ${id}`)
    }

    const wasActive = index.rules[ruleIndex].isActive
    index.rules.splice(ruleIndex, 1)



    saveIndex(index)
}

// Set active rule
export function setActiveRule(id: string): void {
    const index = loadIndex()
    const rule = index.rules.find(r => r.id === id)

    if (!rule) {
        throw new Error(`Rule not found: ${id}`)
    }

    // Deactivate all rules
    index.rules.forEach(r => {
        r.isActive = false
    })

    // Activate selected rule
    rule.isActive = true
    index.activeRuleId = id

    saveIndex(index)


}

// Get active rule
export function getActiveRule(): Rule | null {
    const index = loadIndex()
    return index.rules.find(r => r.isActive) || null
}

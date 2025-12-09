#!/usr/bin/env node

/**
 * Unit Test: Service Layer (MCP & Rules)
 * Tests core business logic in isolation
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import services from compiled dist
const mcpMultiPath = join(__dirname, 'dist/services/mcp-multi.js');
const rulesMultiPath = join(__dirname, 'dist/services/rules-multi.js');

const { fetchMcpPool, fetchMcpSets, createMcpDef, createMcpSet, updateMcpSet, deleteMcpDef, deleteMcpSet } = await import(mcpMultiPath);
const { fetchRulesList, createRule, updateRule, deleteRule } = await import(rulesMultiPath);

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        testsPassed++;
    } else {
        console.error(`❌ ${message}`);
        testsFailed++;
    }
}

function assertEquals(actual, expected, message) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
        console.log(`✅ ${message}`);
        testsPassed++;
    } else {
        console.error(`❌ ${message}`);
        console.error(`   Expected: ${JSON.stringify(expected)}`);
        console.error(`   Actual: ${JSON.stringify(actual)}`);
        testsFailed++;
    }
}

async function runTests() {
    console.log('🧪 Starting Unit Tests (Service Layer)\n');

    // ===== MCP Service Tests =====
    console.log('📦 Testing MCP Services...\n');

    // Test 1: Create MCP Definition
    console.log('Test 1: Create MCP Definition');
    const testMcp = await createMcpDef({
        name: 'Test MCP',
        command: 'test-command',
        args: ['--arg1', '--arg2'],
        env: { TEST_VAR: 'test_value' }
    });
    assert(testMcp && testMcp.id, 'MCP Definition created with ID');
    assert(testMcp.name === 'Test MCP', 'MCP name is correct');
    const mcpId = testMcp.id;

    // Test 2: Fetch MCP Pool
    console.log('\nTest 2: Fetch MCP Pool');
    const mcpPool = await fetchMcpPool();
    assert(Array.isArray(mcpPool), 'MCP Pool is an array');
    assert(mcpPool.some(m => m.id === mcpId), 'Created MCP exists in pool');

    // Test 3: Create MCP Set
    console.log('\nTest 3: Create MCP Set');
    const testSet = await createMcpSet('Test Set');
    assert(testSet && testSet.id, 'MCP Set created with ID');
    assert(testSet.name === 'Test Set', 'Set name is correct');
    assert(Array.isArray(testSet.items) && testSet.items.length === 0, 'Set items is empty array');
    const setId = testSet.id;

    // Test 4: Add MCP to Set
    console.log('\nTest 4: Add MCP to Set');
    const updatedSet = await updateMcpSet(setId, {
        items: [{ serverId: mcpId, disabled: false }]
    });
    assert(updatedSet.items.length === 1, 'Set has 1 item');
    assert(updatedSet.items[0].serverId === mcpId, 'Item references correct MCP');
    assert(updatedSet.items[0].disabled === false, 'Item is enabled');

    // Test 5: Fetch MCP Sets
    console.log('\nTest 5: Fetch MCP Sets');
    const mcpSets = await fetchMcpSets();
    assert(Array.isArray(mcpSets), 'MCP Sets is an array');
    assert(mcpSets.some(s => s.id === setId), 'Created Set exists in sets');

    // Test 6: Update MCP in Set (disable)
    console.log('\nTest 6: Update MCP in Set (disable)');
    const disabledSet = await updateMcpSet(setId, {
        items: [{ serverId: mcpId, disabled: true }]
    });
    assert(disabledSet.items[0].disabled === true, 'Item is disabled');

    // Test 7: Delete MCP Set
    console.log('\nTest 7: Delete MCP Set');
    await deleteMcpSet(setId);
    const setsAfterDelete = await fetchMcpSets();
    assert(!setsAfterDelete.some(s => s.id === setId), 'Set is deleted');

    // Test 8: Delete MCP Definition
    console.log('\nTest 8: Delete MCP Definition');
    await deleteMcpDef(mcpId);
    const poolAfterDelete = await fetchMcpPool();
    assert(!poolAfterDelete.some(m => m.id === mcpId), 'MCP is deleted from pool');

    // ===== Rules Service Tests =====
    console.log('\n\n📋 Testing Rules Services...\n');

    // Test 9: Create Rule
    console.log('Test 9: Create Rule');
    const testRule = await createRule({
        name: 'Test Rule',
        source: 'test-source.md',
        target: '~/.test-config'
    });
    assert(testRule && testRule.id, 'Rule created with ID');
    assert(testRule.name === 'Test Rule', 'Rule name is correct');
    const ruleId = testRule.id;

    // Test 10: Fetch Rules List
    console.log('\nTest 10: Fetch Rules List');
    const rules = await fetchRulesList();
    assert(Array.isArray(rules), 'Rules list is an array');
    assert(rules.some(r => r.id === ruleId), 'Created rule exists in list');

    // Test 11: Update Rule
    console.log('\nTest 11: Update Rule');
    const updatedRule = await updateRule(ruleId, {
        name: 'Updated Test Rule'
    });
    assert(updatedRule.name === 'Updated Test Rule', 'Rule name is updated');

    // Test 12: Delete Rule
    console.log('\nTest 12: Delete Rule');
    await deleteRule(ruleId);
    const rulesAfterDelete = await fetchRulesList();
    assert(!rulesAfterDelete.some(r => r.id === ruleId), 'Rule is deleted');

    // ===== Summary =====
    console.log('\n' + '='.repeat(50));
    console.log('📊 Unit Test Results:');
    console.log(`   ✅ Passed: ${testsPassed}`);
    console.log(`   ❌ Failed: ${testsFailed}`);
    console.log(`   Total: ${testsPassed + testsFailed}`);
    console.log('='.repeat(50));

    if (testsFailed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('💥 Test suite crashed:', err);
    process.exit(1);
});

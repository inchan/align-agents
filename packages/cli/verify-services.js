
import { createRule, fetchRulesList, deleteRule } from './dist/services/rules-multi.js';
import { createMcpDef, fetchMcpPool, deleteMcpDef, createMcpSet, fetchMcpSets, deleteMcpSet } from './dist/services/mcp-multi.js';

async function verifyServices() {
    console.log('--- Verifying Service Layer (CLI/Internal) ---');

    try {
        // 1. Rules Service
        console.log('[Rules Service] Creating rule...');
        const rule = createRule('Service Test Rule', 'Content');
        console.log('Created:', rule.id);

        console.log('[Rules Service] Fetching rules...');
        const rules = fetchRulesList();
        const foundRule = rules.find(r => r.id === rule.id);
        if (!foundRule) throw new Error('Rule not found after creation');
        console.log('Verified existence.');

        console.log('[Rules Service] Deleting rule...');
        deleteRule(rule.id);
        const rulesAfter = fetchRulesList();
        if (rulesAfter.find(r => r.id === rule.id)) throw new Error('Rule still exists after deletion');
        console.log('Verified deletion.');

        // 2. MCP Service
        console.log('[MCP Service] Creating MCP Def...');
        const mcp = createMcpDef({ name: 'Service Test MCP', command: 'echo', args: ['test'] });
        console.log('Created:', mcp.id);

        console.log('[MCP Service] Fetching Pool...');
        const pool = fetchMcpPool();
        if (!pool.find(m => m.id === mcp.id)) throw new Error('MCP not found after creation');
        console.log('Verified existence.');

        console.log('[MCP Service] Creating Set...');
        const set = createMcpSet('Service Test Set');
        console.log('Created Set:', set.id);

        console.log('[MCP Service] Deleting Set...');
        deleteMcpSet(set.id);
        const setsAfter = fetchMcpSets();
        if (setsAfter.find(s => s.id === set.id)) throw new Error('Set still exists after deletion');
        console.log('Verified Set deletion.');

        console.log('[MCP Service] Deleting MCP Def...');
        deleteMcpDef(mcp.id);
        const poolAfter = fetchMcpPool();
        if (poolAfter.find(m => m.id === mcp.id)) throw new Error('MCP still exists after deletion');
        console.log('Verified MCP deletion.');

        console.log('✅ Service Layer Verification Passed');
    } catch (error) {
        console.error('❌ Service Verification Failed:', error);
        process.exit(1);
    }
}

verifyServices();

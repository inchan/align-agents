#!/usr/bin/env node

/**
 * Integration Test: API Layer (HTTP Endpoints)
 * Tests API endpoints with actual HTTP requests
 */

const BASE_URL = 'http://localhost:3001';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message, context = null) {
    if (condition) {
        console.log(`✅ ${message}`);
        testsPassed++;
    } else {
        console.error(`❌ ${message}`);
        if (context) {
            console.error('   Context:', JSON.stringify(context, null, 2));
        }
        testsFailed++;
    }
}

async function request(method, path, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(`${BASE_URL}${path}`, options);
    const text = await response.text();

    return {
        status: response.status,
        data: text ? JSON.parse(text) : undefined
    };
}

async function runTests() {
    console.log('🧪 Starting Integration Tests (API Layer)\n');

    // ===== MCP API Tests =====
    console.log('📦 Testing MCP API Endpoints...\n');

    // Test 1: GET /api/mcps (Pool)
    console.log('Test 1: GET /api/mcps');
    const poolResponse = await request('GET', '/api/mcps');
    assert(poolResponse.status === 200, 'Status 200');
    assert(Array.isArray(poolResponse.data), 'Response is array');

    // Test 2: POST /api/mcps (Create MCP)
    console.log('\nTest 2: POST /api/mcps');
    const createMcpResponse = await request('POST', '/api/mcps', {
        name: 'Integration Test MCP',
        command: 'test-cmd',
        args: ['--test'],
        env: { TEST: 'value' }
    });
    assert(createMcpResponse.status === 200, 'Status 200');
    assert(createMcpResponse.data && createMcpResponse.data.id, 'MCP created with ID');
    const mcpId = createMcpResponse.data.id;

    // Test 3: PUT /api/mcps/:id (Update MCP)
    console.log('\nTest 3: PUT /api/mcps/:id');
    const updateMcpResponse = await request('PUT', `/api/mcps/${mcpId}`, {
        name: 'Updated Integration Test MCP'
    });
    assert(updateMcpResponse.status === 200, 'Status 200');
    assert(updateMcpResponse.data.name === 'Updated Integration Test MCP', 'MCP name updated');

    // Test 4: GET /api/mcp-sets (Sets)
    console.log('\nTest 4: GET /api/mcp-sets');
    const setsResponse = await request('GET', '/api/mcp-sets');
    assert(setsResponse.status === 200, 'Status 200');
    assert(Array.isArray(setsResponse.data), 'Response is array');

    // Test 5: POST /api/mcp-sets (Create Set)
    console.log('\nTest 5: POST /api/mcp-sets');
    const createSetResponse = await request('POST', '/api/mcp-sets', {
        name: 'Integration Test Set',
        items: []
    });
    assert(createSetResponse.status === 200, 'Status 200', createSetResponse);
    assert(createSetResponse.data && createSetResponse.data.id, 'Set created with ID', createSetResponse);
    const setId = createSetResponse.data ? createSetResponse.data.id : null;

    if (!setId) {
        console.error('⚠️ Skipping dependent tests (Test 6-8) because Set creation failed');
    } else {
        // Test 6: PUT /api/mcp-sets/:id (Update Set - Add MCP)
    console.log('\nTest 6: PUT /api/mcp-sets/:id (Add MCP)');
    const updateSetResponse = await request('PUT', `/api/mcp-sets/${setId}`, {
        items: [{ serverId: mcpId, disabled: false }]
    });
    assert(updateSetResponse.status === 200, 'Status 200');
    assert(updateSetResponse.data.items.length === 1, 'Set has 1 item');

    // Test 7: PUT /api/mcp-sets/:id/activate (Activate Set)
    console.log('\nTest 7: PUT /api/mcp-sets/:id/activate');
    const activateResponse = await request('PUT', `/api/mcp-sets/${setId}/activate`, {});
    assert(activateResponse.status === 200, 'Status 200');

    // Deactivate the test set by creating and activating a dummy set
    console.log('\nCreating dummy set to deactivate the test set...');
    const dummySetResponse = await request('POST', '/api/mcp-sets', { name: 'Dummy Set', items: [] });
    if (dummySetResponse.status === 200 && dummySetResponse.data && dummySetResponse.data.id) {
        await request('PUT', `/api/mcp-sets/${dummySetResponse.data.id}/activate`, {});
    } else {
        console.error('⚠️ Failed to create dummy set, Test 8 might fail');
    }

    // Test 8: DELETE /api/mcp-sets/:id (Delete Set)
    console.log('\nTest 8: DELETE /api/mcp-sets/:id');
    const deleteSetResponse = await request('DELETE', `/api/mcp-sets/${setId}`);
    assert(deleteSetResponse.status === 200 || deleteSetResponse.status === 204, 'Status 200/204');
    }

    // Test 9: DELETE /api/mcps/:id (Delete MCP)
    console.log('\nTest 9: DELETE /api/mcps/:id');
    const deleteMcpResponse = await request('DELETE', `/api/mcps/${mcpId}`);
    assert(deleteMcpResponse.status === 200 || deleteMcpResponse.status === 204, 'Status 200/204');

    // ===== Rules API Tests =====
    console.log('\n\n📋 Testing Rules API Endpoints...\n');

    // Test 10: GET /api/rules
    console.log('Test 10: GET /api/rules');
    const rulesResponse = await request('GET', '/api/rules');
    assert(rulesResponse.status === 200, 'Status 200');
    assert(Array.isArray(rulesResponse.data), 'Response is array');

    // Test 11: POST /api/rules (Create Rule)
    console.log('\nTest 11: POST /api/rules');
    const createRuleResponse = await request('POST', '/api/rules', {
        name: 'Integration Test Rule',
        source: 'test-source.md',
        target: '~/.test-config'
    });
    assert(createRuleResponse.status === 200, 'Status 200');
    assert(createRuleResponse.data && createRuleResponse.data.id, 'Rule created with ID');
    const ruleId = createRuleResponse.data.id;

    // Test 12: PUT /api/rules/:id (Update Rule)
    console.log('\nTest 12: PUT /api/rules/:id');
    const updateRuleResponse = await request('PUT', `/api/rules/${ruleId}`, {
        name: 'Updated Integration Test Rule',
        content: 'Updated content for integration test'
    });
    assert(updateRuleResponse.status === 200, 'Status 200', updateRuleResponse);

    // Test 13: PUT /api/rules/:id/activate (Activate Rule)
    console.log('\nTest 13: PUT /api/rules/:id/activate');
    const activateRuleResponse = await request('PUT', `/api/rules/${ruleId}/activate`, {});
    assert(activateRuleResponse.status === 200, 'Status 200');

    // Test 14: DELETE /api/rules/:id (Delete Rule)
    console.log('\nTest 14: DELETE /api/rules/:id');
    const deleteRuleResponse = await request('DELETE', `/api/rules/${ruleId}`);
    assert(deleteRuleResponse.status === 200 || deleteRuleResponse.status === 204, 'Status 200/204');

    // ===== Tools API Tests =====
    console.log('\n\n🔧 Testing Tools API Endpoints...\n');

    // Test 15: GET /api/tools
    console.log('Test 15: GET /api/tools');
    const toolsResponse = await request('GET', '/api/tools');
    assert(toolsResponse.status === 200, 'Status 200');
    assert(toolsResponse.data && toolsResponse.data.tools, 'Response has tools property');
    assert(Array.isArray(toolsResponse.data.tools), 'Tools is array');

    // ===== Summary =====
    console.log('\n' + '='.repeat(50));
    console.log('📊 Integration Test Results:');
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

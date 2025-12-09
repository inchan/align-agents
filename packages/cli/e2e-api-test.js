const BASE_URL = 'http://localhost:3001/api';

async function request(method, path, body = undefined) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${method} ${path} failed: ${res.status} ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : {};
}

async function runTest() {
    console.log('Starting API E2E Test...');

    try {
        // --- 1. Pool CRUD ---
        console.log('\n[Pool CRUD]');

        // Create
        console.log('1. Creating MCP Def...');
        const def = await request('POST', '/mcps', {
            name: 'E2E Test MCP',
            command: 'echo',
            args: ['test'],
            env: { TEST: 'true' }
        });
        console.log('   Created:', def.id);

        // Read
        console.log('2. Fetching Pool...');
        const pool = await request('GET', '/mcps');
        const foundDef = pool.find(p => p.id === def.id);
        if (!foundDef) throw new Error('Created MCP not found in pool');
        console.log('   Verified existence.');

        // Update
        console.log('3. Updating MCP Def...');
        const updatedDef = await request('PUT', `/mcps/${def.id}`, {
            name: 'E2E Test MCP Updated',
            args: ['updated']
        });
        if (updatedDef.name !== 'E2E Test MCP Updated') throw new Error('Update failed');
        console.log('   Updated successfully.');

        // --- 2. Set CRUD ---
        console.log('\n[Set CRUD]');

        // Create
        console.log('4. Creating MCP Set...');
        const set = await request('POST', '/mcp-sets', {
            name: 'E2E Test Set',
            items: [{ serverId: def.id, disabled: false }]
        });
        console.log('   Created:', set.id);

        // Read
        console.log('5. Fetching Sets...');
        const sets = await request('GET', '/mcp-sets');
        const foundSet = sets.find(s => s.id === set.id);
        if (!foundSet) throw new Error('Created Set not found');
        console.log('   Verified existence.');

        // Update (Add item, though we only have one def)
        console.log('6. Updating Set...');
        const updatedSet = await request('PUT', `/mcp-sets/${set.id}`, {
            name: 'E2E Test Set Updated',
            items: [] // Remove items
        });
        if (updatedSet.items.length !== 0) throw new Error('Set update failed');
        console.log('   Updated successfully.');

        // Activate
        console.log('7. Activating Set...');
        await request('PUT', `/mcp-sets/${set.id}/activate`, {});
        const setsAfterActivate = await request('GET', '/mcp-sets');
        const activeSet = setsAfterActivate.find(s => s.isActive);
        if (activeSet.id !== set.id) throw new Error('Activation failed');
        console.log('   Activated successfully.');

        // --- 3. Cleanup ---
        console.log('\n[Cleanup]');

        // Delete Set
        console.log('8. Deleting Set...');
        await request('DELETE', `/mcp-sets/${set.id}`);
        const setsAfterDelete = await request('GET', '/mcp-sets');
        if (setsAfterDelete.find(s => s.id === set.id)) throw new Error('Set deletion failed');
        console.log('   Set deleted.');

        // Delete Def
        console.log('9. Deleting MCP Def...');
        await request('DELETE', `/mcps/${def.id}`);
        const poolAfterDelete = await request('GET', '/mcps');
        if (poolAfterDelete.find(p => p.id === def.id)) throw new Error('Def deletion failed');
        console.log('   Def deleted.');

        console.log('\n✅ E2E API Test Passed Successfully!');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        process.exit(1);
    }
}

runTest();

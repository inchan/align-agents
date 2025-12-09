async function testApi() {
    const baseUrl = 'http://localhost:3002/api';

    try {
        console.log('1. Fetching MCP Sets...');
        const res1 = await fetch(`${baseUrl}/mcp-sets`);
        if (!res1.ok) throw new Error(`Failed to fetch sets: ${res1.status} ${res1.statusText}`);
        const sets = await res1.json();
        console.log('Sets:', JSON.stringify(sets, null, 2));

        console.log('2. Creating MCP Set...');
        const res2 = await fetch(`${baseUrl}/mcp-sets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'API Test Set', items: [] })
        });
        if (!res2.ok) {
            const err = await res2.text(); // text() to catch non-json errors
            throw new Error(`Failed to create set: ${res2.status} ${err}`);
        }
        const newSet = await res2.json();
        console.log('Created Set:', JSON.stringify(newSet, null, 2));

    } catch (error) {
        console.error('API Test Failed:', error);
    }
}

testApi();

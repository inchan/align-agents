
// const fetch = require('node-fetch'); // Native fetch is available in Node 18+

const BASE_URL = 'http://localhost:3001/api';

async function request(method, path, body = undefined) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);

    console.log(`\n[${method}] ${path}`);
    try {
        const res = await fetch(`${BASE_URL}${path}`, options);
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        try {
            const json = JSON.parse(text);
            console.log('Response:', JSON.stringify(json, null, 2));
            return json;
        } catch (e) {
            console.log('Response (Text):', text);
            return text;
        }
    } catch (e) {
        console.error('Request Failed:', e.message);
    }
}

async function runDebug() {
    console.log('\n--- Debugging Rules API ---');
    await request('GET', '/rules');
    const newRule = await request('POST', '/rules', { name: 'Debug Rule', content: 'Debug Content' });
    if (newRule && newRule.id) {
        console.log('Created Rule ID:', newRule.id);
        await request('DELETE', `/rules/${newRule.id}`);
    }

    console.log('\n--- Debugging MCP API ---');
    await request('GET', '/mcps');
    const newMcp = await request('POST', '/mcps', { name: 'Debug MCP', command: 'echo', args: ['debug'] });
    if (newMcp && newMcp.id) {
        console.log('Created MCP ID:', newMcp.id);
        await request('DELETE', `/mcps/${newMcp.id}`);
    }

    await request('GET', '/mcp-sets');
    const newSet = await request('POST', '/mcp-sets', { name: 'Debug Set' });
    if (newSet && newSet.id) {
        console.log('Created Set ID:', newSet.id);
        await request('DELETE', `/mcp-sets/${newSet.id}`);
    }
}

runDebug();

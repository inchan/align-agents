import { createMcpSet, fetchMcpSets } from './dist/services/mcp-multi.js';

async function test() {
    try {
        console.log('Fetching existing sets...');
        const sets = fetchMcpSets();
        console.log('Existing sets:', JSON.stringify(sets, null, 2));

        console.log('Creating new set...');
        const newSet = createMcpSet('Debug Set');
        console.log('Created set:', JSON.stringify(newSet, null, 2));
    } catch (error) {
        console.error('Error:', error);
        if (error instanceof Error) {
            console.error('Stack:', error.stack);
        }
    }
}

test();

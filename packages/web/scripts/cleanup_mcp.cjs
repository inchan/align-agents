// const fetch = require('node-fetch'); // Removed as global fetch is expected in modern Node.js ESM environment

const API_BASE_URL = 'http://localhost:3001/api'; // Adjust if your API runs on a different port or host

// Helper function to fetch MCP sets
async function fetchMcpSets() {
    console.log(`Fetching MCP sets from ${API_BASE_URL}/mcp-sets`);
    const response = await fetch(`${API_BASE_URL}/mcp-sets`);
    if (!response.ok) {
        throw new Error(`Failed to fetch MCP sets: ${response.statusText} (${response.status})`);
    }
    const data = await response.json();
    return data;
}

// Helper function to delete an MCP set
async function deleteMcpSet(id, name) {
    console.log(`Deleting MCP set: ${name} (ID: ${id})`);
    const response = await fetch(`${API_BASE_URL}/mcp-sets/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Failed to delete MCP set ${name} (ID: ${id}): ${response.statusText} (${response.status})`);
    }
    console.log(`Successfully deleted MCP set: ${name} (ID: ${id})`);
}

async function cleanupMcpSets() {
    console.log('Starting MCP set cleanup...');
    try {
        const mcpSets = await fetchMcpSets();
        console.log(`Found ${mcpSets.length} MCP sets in total.`);

        const setsToDelete = mcpSets.filter(set => set.name.toLowerCase().startsWith('m'));

        if (setsToDelete.length === 0) {
            console.log('No MCP sets found starting with "m".');
            return;
        }

        console.log(`Identified ${setsToDelete.length} MCP sets starting with "m" for deletion.`);
        for (const set of setsToDelete) {
            await deleteMcpSet(set.id, set.name);
        }
        console.log('MCP set cleanup completed.');
    } catch (error) {
        console.error('Error during MCP set cleanup:', error);
    }
}

cleanupMcpSets();

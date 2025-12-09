
// Native fetch in Node 18+
const API_BASE = 'http://localhost:3001/api';

async function reproduce() {
    console.log('Fetching rules...');
    const rulesRes = await fetch(`${API_BASE}/rules`);
    const rules = await rulesRes.json();

    if (!Array.isArray(rules) || rules.length === 0) {
        console.error('No rules found. Please create a rule first.');
        return;
    }

    const rule = rules[0];
    const sourceId = rule.id;
    console.log(`Using rule: ${rule.name} (${sourceId})`);

    console.log('Requesting sync with strategy: "overwrite"');
    const response = await fetch(`${API_BASE}/rules/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            toolId: 'codex', // Using codex as in user report
            sourceId: sourceId,
            strategy: 'overwrite', // Explicitly overwriting
            global: true
        })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
}

reproduce().catch(console.error);

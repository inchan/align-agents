
import Fastify from 'fastify';
import { ProjectService } from './services/ProjectService.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Mock server to replicate ui.ts logic
async function run() {
    console.log('--- Debugging Project Creation via HTTP ---');
    const server = Fastify({ logger: false });

    server.post<{ Body: any }>('/api/projects', async (request, reply) => {
        console.log('[API] Received create request body:', request.body);
        try {
            const project = await ProjectService.getInstance().createProject(request.body as any);
            return project;
        } catch (error: any) {
            console.error('[API] Create project failed:', error);
            // This replicates the behavior before my recent fix if running old code, 
            // but we want to see what actually happens with the *current* codebase logic
            // providing we are running this script with the *current* project service.
            reply.code(500).send({ error: error.message });
        }
    });

    try {
        const address = await server.listen({ port: 0 }); // Random port
        const port = typeof address === 'string' ? new URL(address).port : (address as any).port;
        console.log(`Test server listening on port ${port}`);

        // Send request
        console.log('Sending fetch request...');
        const response = await fetch(`http://localhost:${port}/api/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Debug HTTP Project',
                path: '/tmp/debug-http-project',
                source: 'manual'
            })
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (!response.ok) {
            console.error('FAIL: Request failed.');
        } else {
            console.log('SUCCESS: Project created.');
            const data = JSON.parse(text);
            // Cleanup
            if (data.id) {
                await ProjectService.getInstance().deleteProject(data.id);
                console.log('Cleaned up.');
            }
        }

        await server.close();
        process.exit(0);

    } catch (err) {
        console.error('Test script crashed:', err);
        process.exit(1);
    }
}

run();

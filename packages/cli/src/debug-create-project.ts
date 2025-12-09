
import { ProjectService } from './services/ProjectService.js';
import path from 'path';
import os from 'os';

async function run() {
    console.log('--- Debugging Project Creation ---');
    try {
        const service = ProjectService.getInstance();
        console.log('ProjectService initialized.');

        const projects = service.getProjects();
        console.log(`Current projects count: ${projects.length}`);

        console.log('Attempting to create a project...');
        const newProject = await service.createProject({
            name: 'Debug Creation Project',
            path: '/tmp/debug-creation',
            source: 'manual'
        });

        console.log('Project created successfully:', newProject);

        // Cleanup
        await service.deleteProject(newProject.id);
        console.log('Cleaned up test project.');

    } catch (error: any) {
        console.error('FAILED to create project:');
        console.error(error);
    }
}

run();

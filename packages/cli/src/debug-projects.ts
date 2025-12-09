
import { ProjectService } from './services/ProjectService.js';
import { ProjectScanner } from './services/ProjectScanner.js';

async function main() {
    console.log('--- Debugging ProjectService ---');
    const service = ProjectService.getInstance();

    // 1. Check existing projects
    const initialProjects = service.getProjects();
    console.log(`Initial projects count: ${initialProjects.length}`);
    console.log('Projects:', JSON.stringify(initialProjects, null, 2));

    // 2. Try Scan
    console.log('\n--- Scanning Projects ---');
    try {
        const scanner = new ProjectScanner();
        const scanned = await scanner.getAllRecentProjects();
        console.log(`Scanned ${scanned.length} projects.`);
        scanned.forEach(p => console.log(`- [${p.source}] ${p.name}: ${p.path}`));
    } catch (e) {
        console.error('Scan failed:', e);
    }

    // 3. Try Create
    console.log('\n--- Creating Test Project ---');
    try {
        const newProject = await service.createProject({
            name: 'Debug Project',
            path: '/tmp/debug-project',
            source: 'manual'
        });
        console.log('Created project:', newProject);

        // Verify it exists in list
        const updatedProjects = service.getProjects();
        const found = updatedProjects.find(p => p.id === newProject.id);
        console.log('Verification:', found ? 'SUCCESS' : 'FAILED');

        // Cleanup
        if (found) {
            await service.deleteProject(found.id);
            console.log('Cleaned up test project.');
        }
    } catch (e) {
        console.error('Create failed:', e);
    }
}

main().catch(console.error);

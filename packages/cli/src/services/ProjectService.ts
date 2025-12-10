import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectScanner } from './ProjectScanner.js';
import type { ProjectInfo } from './ProjectScanner.js';
import { v4 as uuidv4 } from 'uuid';
import { ToolRepository } from '../repositories/ToolRepository.js';
import { getProjectsConfigPath } from '../constants/paths.js';

export interface UserProject extends Omit<ProjectInfo, 'source'> {
    id: string;
    source: ProjectInfo['source'] | 'manual';
    isAutoScanned: boolean;
    createdAt: string;
    updatedAt: string;
}

export class ProjectService {
    private static instance: ProjectService;
    private readonly configPath: string;
    private scanner: ProjectScanner;

    private constructor() {
        this.configPath = getProjectsConfigPath();
        this.scanner = new ProjectScanner();
        this.ensureConfig();
    }

    public static getInstance(): ProjectService {
        if (!ProjectService.instance) {
            ProjectService.instance = new ProjectService();
        }
        return ProjectService.instance;
    }

    private ensureConfig() {
        const dir = path.dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(this.configPath)) {
            fs.writeFileSync(this.configPath, JSON.stringify([], null, 2));
        }
    }

    private loadProjects(): UserProject[] {
        try {
            const data = fs.readFileSync(this.configPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    private saveProjects(projects: UserProject[]) {
        fs.writeFileSync(this.configPath, JSON.stringify(projects, null, 2));
    }

    public getProjects(): UserProject[] {
        return this.loadProjects().sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
    }

    public async reorderProjects(ids: string[]): Promise<void> {
        const projects = this.loadProjects();
        const projectMap = new Map(projects.map(p => [p.id, p]));

        const newProjects: UserProject[] = [];

        // Add projects in the order of ids
        ids.forEach(id => {
            const project = projectMap.get(id);
            if (project) {
                newProjects.push(project);
                projectMap.delete(id);
            }
        });

        // Append any remaining projects
        for (const project of projectMap.values()) {
            newProjects.push(project);
        }

        this.saveProjects(newProjects);
    }

    public getProject(id: string): UserProject | undefined {
        return this.loadProjects().find(p => p.id === id);
    }

    public async createProject(project: Omit<UserProject, 'id' | 'isAutoScanned' | 'createdAt' | 'updatedAt'>): Promise<UserProject> {
        const projects = this.loadProjects();
        const now = new Date().toISOString();

        const newProject: UserProject = {
            ...project,
            id: uuidv4(),
            isAutoScanned: false,
            createdAt: now,
            updatedAt: now
        };

        projects.push(newProject);
        this.saveProjects(projects);
        return newProject;
    }

    public async updateProject(id: string, updates: Partial<Omit<UserProject, 'id'>>): Promise<UserProject> {
        const projects = this.loadProjects();
        const index = projects.findIndex(p => p.id === id);

        if (index === -1) {
            throw new Error(`Project with id ${id} not found`);
        }

        const updatedProject = {
            ...projects[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        projects[index] = updatedProject;
        this.saveProjects(projects);
        return updatedProject;
    }

    public async deleteProject(id: string): Promise<void> {
        const projects = this.loadProjects();
        const filtered = projects.filter(p => p.id !== id);
        this.saveProjects(filtered);
    }

    public async getProjectDetails(id: string): Promise<any> {
        const project = this.loadProjects().find(p => p.id === id);
        if (!project) {
            throw new Error('Project not found');
        }

        const toolRepository = ToolRepository.getInstance();
        await toolRepository.load();
        const installedTools = toolRepository.getTools().filter((t: any) => t.exists);

        const projectPath = project.path;
        const toolsDetails = [];
        const { TOOL_METADATA } = await import('../constants/ToolDefinitions.js');

        // Iterate installed tools to gather both Global and Project config details
        for (const installedTool of installedTools) {
            const toolMeta = TOOL_METADATA.find(t => t.id === installedTool.id);
            if (!toolMeta) continue;

            const files: { type: string, path: string, exists: boolean }[] = [];
            let hasRules = false;
            let hasMcpConfig = false;

            // 1. Check Project-Specific Rules
            if (toolMeta.rulesFilename) {
                const rulesPath = path.join(projectPath, toolMeta.rulesFilename);
                const rulesExists = fs.existsSync(rulesPath);
                if (rulesExists) {
                    hasRules = true;
                    files.push({
                        type: 'rules',
                        path: rulesPath, // Full path for clarity
                        exists: true
                    });
                }
            }

            // 2. Check Project-Specific MCP Config
            // Some IDEs have project-specific MCP files (e.g. .cursor/mcp.json)
            // We'll check if metadata defines a relative path or if we should check common locations
            // For now, let's look for standard patterns if supported
            if (toolMeta.supportsMcp) {
                // Check for generic mcp.json in project root or .tool folder
                const potentialMcpPaths = [
                    path.join(projectPath, 'mcp.json'),
                    path.join(projectPath, `.${toolMeta.id}`, 'mcp.json'),
                    // Add more project-level MCP conventions if they exist
                ];

                // If tool is Cursor, check .cursor/mcp.json
                if (toolMeta.id === 'cursor-ide') {
                    potentialMcpPaths.push(path.join(projectPath, '.cursor', 'mcp.json'));
                }

                for (const mcpP of potentialMcpPaths) {
                    if (fs.existsSync(mcpP)) {
                        hasMcpConfig = true;
                        files.push({
                            type: 'mcp',
                            path: mcpP,
                            exists: true
                        });
                        break; // Found one
                    }
                }
            }

            // 3. Prepare Global Config Info
            const globalConfig = {
                rulesPath: toolMeta.globalRulesDir ? path.join(toolMeta.globalRulesDir, toolMeta.rulesFilename || '') : null,
                mcpPath: installedTool.configPath || toolMeta.mcpConfigPath || null,
                supported: true // Since it's installed/configured
            };

            // Calculate "Global Configured" status (e.g. files exist on disk)
            const globalRulesExists = globalConfig.rulesPath ? fs.existsSync(globalConfig.rulesPath) : false;
            const globalMcpExists = globalConfig.mcpPath ? fs.existsSync(globalConfig.mcpPath) : false;

            // 4. Add to list ONLY if project-specific config exists
            if (hasRules || hasMcpConfig) {
                toolsDetails.push({
                    id: toolMeta.id,
                    name: toolMeta.name,
                    hasRules,
                    hasMcp: hasMcpConfig, // Project-level MCP existence
                    files, // Project-level files
                    globalConfig: {
                        ...globalConfig,
                        rulesExists: globalRulesExists,
                        mcpExists: globalMcpExists
                    }
                });
            }
        }

        return {
            id: project.id,
            path: project.path,
            tools: toolsDetails
        };
    }

    public async scanAndMergeProjects(): Promise<UserProject[]> {
        const scannedProjects = await this.scanner.getAllRecentProjects();
        const currentProjects = this.loadProjects();
        const now = new Date().toISOString();
        let changed = false;

        for (const scanned of scannedProjects) {
            // Check if already exists by path
            const existing = currentProjects.find(p => p.path === scanned.path);

            if (existing) {
                // Update existing if needed
                if (existing.isAutoScanned) {
                    // existing.updatedAt = now;
                    // changed = true;
                }
            } else {
                // Add new auto-scanned project
                currentProjects.push({
                    id: uuidv4(),
                    path: scanned.path,
                    name: scanned.name,
                    source: scanned.source,
                    lastAccessed: scanned.lastAccessed,
                    isAutoScanned: true,
                    createdAt: now,
                    updatedAt: now
                });
                changed = true;
            }
        }

        if (changed) {
            this.saveProjects(currentProjects);
        }

        return this.getProjects();
    }
}

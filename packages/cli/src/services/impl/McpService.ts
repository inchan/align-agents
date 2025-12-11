import os from 'os';
import { getConfigDir } from '../../constants/paths.js';
import { IMcpService, McpDef, McpSet, McpSetItem } from '../../interfaces/IMcpService.js';
import { McpRepository } from '../../infrastructure/repositories/McpRepository.js';
import { getDatabase } from '../../infrastructure/database.js';

/**
 * MCP Definition 및 Set 관리 서비스.
 * SQLite 기반의 McpRepository를 통해 MCP 설정을 영속화한다.
 */
export class McpService implements IMcpService {
    private repository: McpRepository;
    private masterDir: string;

    constructor(masterDir?: string) {
        this.masterDir = masterDir || this.getDefaultMasterDir();
        const db = getDatabase();
        this.repository = new McpRepository(db);
    }

    private getDefaultMasterDir(): string {
        return getConfigDir();
    }

    public getMasterDir(): string {
        return this.masterDir;
    }

    public setMasterDir(dir: string): void {
        this.masterDir = dir;
        // Repository doesn't need to be recreated as it uses global DB instance
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MCP Definitions Pool Management
    // ─────────────────────────────────────────────────────────────────────────

    /** 모든 MCP Definition 목록을 조회한다. */
    async getMcpDefinitions(): Promise<McpDef[]> {
        return this.repository.getDefinitions();
    }

    /** 특정 MCP Definition을 조회한다. */
    async getMcpDefinition(id: string): Promise<McpDef | null> {
        return this.repository.getDefinition(id);
    }

    /** 새 MCP Definition을 생성한다. */
    async createMcpDefinition(def: Omit<McpDef, 'id'>): Promise<McpDef> {
        return this.repository.createDefinition(def);
    }

    /** MCP Definition을 수정한다. */
    async updateMcpDefinition(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef> {
        return this.repository.updateDefinition(id, updates);
    }

    /** MCP Definition을 삭제한다. */
    async deleteMcpDefinition(id: string): Promise<void> {
        return this.repository.deleteDefinition(id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MCP Sets Management
    // ─────────────────────────────────────────────────────────────────────────

    /** 모든 MCP Set 목록을 조회한다. */
    async getMcpSets(): Promise<McpSet[]> {
        return this.repository.getSets();
    }

    /** 특정 MCP Set을 조회한다. */
    async getMcpSet(id: string): Promise<McpSet | null> {
        return this.repository.getSet(id);
    }

    /** 새 MCP Set을 생성한다. */
    async createMcpSet(name: string, items: McpSetItem[], description?: string): Promise<McpSet> {
        return this.repository.createSet(name, items, description);
    }

    /** MCP Set을 수정한다. */
    async updateMcpSet(id: string, updates: { name?: string; description?: string; items?: McpSetItem[] }): Promise<McpSet> {
        return this.repository.updateSet(id, updates);
    }

    /** MCP Set을 삭제한다. */
    async deleteMcpSet(id: string): Promise<void> {
        return this.repository.deleteSet(id);
    }

    /** 특정 MCP Set을 활성 상태로 설정한다. */
    async setActiveMcpSet(id: string): Promise<void> {
        return this.repository.setActiveSet(id);
    }

    /** MCP Set 순서를 재정렬한다. */
    async reorderMcpSets(ids: string[]): Promise<void> {
        return this.repository.reorderMcpSets(ids);
    }
}

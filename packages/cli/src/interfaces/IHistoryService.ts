export type HistoryType = 'rules' | 'mcp' | 'sync';

export interface HistoryEntry {
    id: string;
    timestamp: string;
    type: HistoryType;
    description?: string;
}

export interface IHistoryService {
    saveVersion(type: HistoryType, content: string, description?: string): string;
    getHistory(): HistoryEntry[];
}

export interface ProjectInfo {
    path: string;
    name: string;
    source: 'vscode' | 'cursor' | 'windsurf' | 'claude' | 'gemini' | 'copilot' | 'codex';
    lastAccessed?: Date;
}

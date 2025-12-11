const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface SyncHistoryEntry {
    id: string;
    created_at: string;
    target_type: 'rule' | 'mcp_set' | 'all_rules' | 'all_mcp';
    target_id?: string;
    target_name?: string;
    tool_id?: string;
    tool_name?: string;
    tool_set_id?: string;
    status: 'success' | 'partial' | 'failed';
    success_count: number;
    failed_count: number;
    skipped_count: number;
    strategy?: string;
    error_message?: string;
    details?: string | any;
    duration_ms?: number;
    user_agent?: string;
    triggered_by?: 'manual' | 'auto' | 'watch';
}

export interface SyncHistoryStats {
    total: number;
    by_status: {
        success: number;
        partial: number;
        failed: number;
    };
    success_rate: number;
    avg_duration_ms: number;
}

export interface SyncHistoryPagination {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface SyncHistoryResponse {
    data: SyncHistoryEntry[];
    pagination: SyncHistoryPagination;
}

/**
 * Fetch sync history with optional filtering and pagination
 */
export async function fetchSyncHistory(options?: {
    limit?: number;
    offset?: number;
    target_type?: string;
    tool_id?: string;
    status?: string;
}): Promise<SyncHistoryResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());
    if (options?.target_type) params.set('target_type', options.target_type);
    if (options?.tool_id) params.set('tool_id', options.tool_id);
    if (options?.status) params.set('status', options.status);

    const res = await fetch(`${API_BASE_URL}/sync-history?${params}`);
    if (!res.ok) throw new Error('Failed to fetch sync history');
    return res.json();
}

/**
 * Fetch a single sync history entry by ID
 */
export async function fetchSyncHistoryById(id: string): Promise<SyncHistoryEntry> {
    const res = await fetch(`${API_BASE_URL}/sync-history/${id}`);
    if (!res.ok) throw new Error('Failed to fetch sync history entry');
    return res.json();
}

/**
 * Retry a failed sync operation
 */
export async function retrySyncHistory(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/sync-history/${id}/retry`, {
        method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to retry sync');
}

/**
 * Get sync history statistics
 */
export async function fetchSyncHistoryStats(): Promise<SyncHistoryStats> {
    const res = await fetch(`${API_BASE_URL}/sync-history/stats`);
    if (!res.ok) throw new Error('Failed to fetch sync history stats');
    return res.json();
}

/**
 * Get recent sync history entries
 */
export async function fetchRecentSyncHistory(limit: number = 10): Promise<SyncHistoryEntry[]> {
    const res = await fetch(`${API_BASE_URL}/sync-history/recent?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch recent sync history');
    return res.json();
}

/**
 * Clean up old sync history entries
 */
export async function cleanupSyncHistory(daysOld: number = 30): Promise<{ deleted: number; message: string }> {
    const res = await fetch(`${API_BASE_URL}/sync-history/cleanup?daysOld=${daysOld}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to cleanup sync history');
    return res.json();
}

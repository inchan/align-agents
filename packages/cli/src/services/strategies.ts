import { EOL } from 'os';

export type SyncStrategy = 'overwrite' | 'smart-update';

/**
 * Deep merge utility for MCP server configurations.
 * Preserves existing properties (timeout, trust, includeTools, etc.) while updating core properties.
 *
 * @param target Existing MCP servers configuration
 * @param source New MCP servers from master
 * @returns Merged configuration
 */
export function deepMergeMcpServers(
    target: Record<string, any>,
    source: Record<string, any>
): Record<string, any> {
    const result = { ...target };

    for (const [serverName, sourceServer] of Object.entries(source)) {
        if (result[serverName] && typeof result[serverName] === 'object') {
            // Deep merge: preserve existing properties, update with source
            result[serverName] = {
                ...result[serverName],  // Keep existing (timeout, trust, etc.)
                ...sourceServer,        // Override with source (command, args, env)
            };
        } else {
            // New server: just copy
            result[serverName] = sourceServer;
        }
    }

    return result;
}

export const MARKER_START = '<!-- align-agents-start -->';
export const MARKER_END = '<!-- align-agents-end -->';

/**
 * Applies the selected synchronization strategy to content.
 * 
 * @param currentContent The existing content of the target file.
 * @param newContent The new content to be synchronized (from Master).
 * @param strategy The synchronization strategy to apply.
 * @returns The final content to be written to the file.
 */
export function applySyncStrategy(currentContent: string, newContent: string, strategy: SyncStrategy): string {
    console.log(`[CLI] DEBUG: applySyncStrategy - strategy=${strategy}, currentLength=${currentContent.length}, newLength=${newContent.length}`);

    switch (strategy) {
        case 'overwrite':
            console.log(`[CLI] DEBUG: Using overwrite strategy - returning new content`);
            return newContent;



        case 'smart-update':
            console.log(`[CLI] DEBUG: Using smart-update strategy`);
            return applySmartUpdate(currentContent, newContent);

        default:
            throw new Error(`Unknown sync strategy: ${strategy}`);
    }
}

function wrapWithMarkers(content: string): string {
    return `${MARKER_START}${EOL}${content}${EOL}${MARKER_END}`;
}

function applySmartUpdate(currentContent: string, newContent: string): string {
    const startIndex = currentContent.indexOf(MARKER_START);
    const endIndex = currentContent.indexOf(MARKER_END);

    if (startIndex === -1 || endIndex === -1) {
        console.log(`[CLI] DEBUG: Markers not found, wrapping new content with markers`);
        // Markers not found, append new content wrapped in markers
        if (!currentContent) {
            return wrapWithMarkers(newContent);
        }
        const separator = currentContent.endsWith(EOL) ? '' : EOL;
        return `${currentContent}${separator}${wrapWithMarkers(newContent)}`;
    }

    // Replace the content between markers
    const preBlock = currentContent.substring(0, startIndex);
    const postBlock = currentContent.substring(endIndex + MARKER_END.length);

    console.log(`[CLI] DEBUG: Smart update - preserving ${preBlock.length} chars before and ${postBlock.length} chars after markers`);
    return `${preBlock}${MARKER_START}${EOL}${newContent}${EOL}${MARKER_END}${postBlock}`;
}

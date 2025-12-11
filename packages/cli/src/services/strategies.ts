import { EOL } from 'os';

/** 동기화 전략 타입 */
export type SyncStrategy = 'overwrite' | 'smart-update';

/**
 * MCP 서버 설정을 딥 머지한다.
 * 기존 속성(timeout, trust, includeTools 등)을 유지하면서 핵심 속성을 업데이트한다.
 *
 * @param target - 기존 MCP 서버 설정
 * @param source - 새 MCP 서버 설정
 * @returns 병합된 설정
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

/** smart-update 전략에서 사용하는 시작 마커 */
export const MARKER_START = '<!-- align-agents-start -->';
/** smart-update 전략에서 사용하는 종료 마커 */
export const MARKER_END = '<!-- align-agents-end -->';

/**
 * 동기화 전략을 적용하여 최종 콘텐츠를 생성한다.
 *
 * @param currentContent - 대상 파일의 현재 내용
 * @param newContent - 동기화할 새 내용
 * @param strategy - 적용할 동기화 전략 ('overwrite' | 'smart-update')
 * @returns 파일에 쓸 최종 내용
 * @throws Error - 알 수 없는 전략인 경우
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

/** 콘텐츠를 마커로 감싼다. */
function wrapWithMarkers(content: string): string {
    return `${MARKER_START}${EOL}${content}${EOL}${MARKER_END}`;
}

/**
 * smart-update 전략을 적용한다.
 * 마커가 있으면 마커 사이 내용만 교체하고, 없으면 마커로 감싸서 추가한다.
 */
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

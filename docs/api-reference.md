# API Reference

## Web API Endpoints

align-agents는 REST API를 제공하여 웹 UI 또는 외부 도구에서 설정을 관리할 수 있습니다.

### Base URL

```
http://localhost:3001/api
```

> 참고: Codex는 MCP 동기화를 지원하며 TOML/JSON 설정 파일 모두 처리합니다.

---

## Tools API

### GET /api/tools

설치된 AI 도구 목록을 조회합니다.

**Response:**

```json
  {
    "id": "claude-desktop",
    "name": "Claude Desktop",
    "category": "desktop",
    "configPath": "/...",
    "exists": true
  },
  {
    "id": "codex",
    "name": "Codex",
    "category": "cli",
    "configPath": "/...",
    "exists": true
  }
]
```

### POST /api/tools/scan

도구를 재스캔하여 목록을 업데이트합니다.

**Response:**

```json
[
  {
    "id": "claude-desktop",
    "name": "Claude Desktop",
    "configPath": "/Users/username/Library/Application Support/Claude/claude_desktop_config.json",
    "exists": true
  }
]
```

---

## Rules API

> **Note**: Master Rules 엔드포인트(`GET/POST /api/rules/master`)는 제거되었습니다. Multi-Rules API를 사용하세요.

### POST /api/rules/sync

Rules를 도구에 동기화합니다.

**Request Body:**

```json
{
  "sourceId": "uuid-rule-id",
  "toolId": "claude-code",
  "targetPath": "/path/to/project",
  "global": false,
  "strategy": "smart-update"
}
```

- `sourceId` (required): 동기화할 Rule ID
- `toolId` (optional): 특정 도구 ID. 생략 시 모든 도구에 동기화
- `targetPath` (optional): 프로젝트 경로. 기본값: 현재 디렉토리
- `global` (optional): 전역 Rules 사용 여부. 기본값: `false`
- `strategy` (optional): 동기화 전략. 기본값: `"smart-update"`
  - `"overwrite"`: 기존 내용 덮어쓰기
  - `"merge"`: 내용 병합
  - `"smart-update"`: 마커 기반 스마트 업데이트

**Response (단일 도구):**

```json
{
  "toolId": "claude-code",
  "status": "success",
  "message": "Rules synced successfully",
  "targetPath": "/path/to/project/CLAUDE.md"
}
```

**Response (전체 도구):**

```json
{
  "results": [
    {
      "toolId": "claude-code",
      "status": "success",
      "targetPath": "/path/to/project/CLAUDE.md"
    },
    {
      "toolId": "codex",
      "status": "success",
      "targetPath": "/path/to/project/AGENTS.md"
    }
  ]
}
```

---

## MCP API

> **Note**: Master MCP 엔드포인트(`GET/POST /api/mcp/master`)는 제거되었습니다. MCP Sets API를 사용하세요.

### POST /api/mcp/sync

MCP 설정을 도구에 동기화합니다.

**Request Body:**

```json
{
  "sourceId": "uuid-mcp-set-id",
  "toolId": "claude-desktop",
  "strategy": "smart-update"
}
```

- `sourceId` (required): 동기화할 MCP Set ID
- `toolId` (optional): 특정 도구 ID. 생략 시 모든 도구에 동기화
- `targetPath` (optional): 프로젝트 경로 (global=false일 때 필수)
- `global` (optional): 전역 설정 사용 여부. 기본값: `true`
- `strategy` (optional): 동기화 전략. 기본값: `"smart-update"`

**Response (단일 도구):**

```json
{
  "toolId": "claude-desktop",
  "status": "success",
  "message": "MCP synced successfully",
  "path": "/Users/username/Library/Application Support/Claude/claude_desktop_config.json"
}
```

**Response (전체 도구):**

```json
{
  "results": [
    {
      "toolId": "claude-desktop",
      "status": "success",
      "path": "/Users/username/Library/Application Support/Claude/claude_desktop_config.json"
    },
    {
      "toolId": "codex",
      "status": "skipped",
      "message": "Tool does not support MCP"
    }
  ]
}
```

---

## Error Responses

모든 API 엔드포인트는 오류 발생 시 다음 형식으로 응답합니다:

```json
{
  "error": "Error message description"
}
```

**HTTP Status Codes:**

- `200 OK`: 성공
- `400 Bad Request`: 잘못된 요청 (필수 파라미터 누락 등)
- `500 Internal Server Error`: 서버 오류

---

## CORS

API 서버는 모든 origin에서의 요청을 허용합니다 (개발 환경).

프로덕션 환경에서는 `packages/api/src/server.ts`에서 CORS 설정을 조정하세요.

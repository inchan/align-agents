#!/bin/bash

# align-agents 개발 서버 실행 스크립트
# 주요 포트가 사용 중이면 종료 후 실행

set -e

PORTS=(3001 5173)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

kill_port() {
    local port=$1
    local pids=$(lsof -ti ":$port" 2>/dev/null)

    if [ -n "$pids" ]; then
        echo "🔪 포트 $port 사용 중 (PID: $pids) - 종료합니다"
        echo "$pids" | xargs kill -15 2>/dev/null || true
        sleep 1
        # graceful 종료 실패 시 강제 종료
        pids=$(lsof -ti ":$port" 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
        fi
    fi
}

echo "🚀 align-agents 개발 서버 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 포트 정리
for port in "${PORTS[@]}"; do
    kill_port "$port"
done

echo "✅ 포트 정리 완료: ${PORTS[*]}"
echo ""

# 개발 서버 실행
cd "$ROOT_DIR"
npm run dev

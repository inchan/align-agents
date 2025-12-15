#!/bin/bash

# align-agents 초기 설정 스크립트

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "📦 align-agents 의존성 설치"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$ROOT_DIR"
npm install

echo ""
echo "✅ 설치 완료"

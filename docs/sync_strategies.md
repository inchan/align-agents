# 동기화 전략 (Synchronization Strategies)

AI CLI Syncer는 세 가지 동기화 전략을 지원합니다.

## 1. 완전 교체 (Overwrite)

- **동작**: 대상 파일의 내용을 마스터 Rules로 완전히 교체합니다.
- **사용 시나리오**: 처음 설정하거나, 기존 내용을 완전히 무시하고 싶을 때
- **장점**: 간단하고 명확함
- **단점**: 기존 커스터마이징이 모두 사라짐

## 2. 병합 (Merge / Append)

- **동작**: 마스터 Rules를 기존 파일 끝에 추가합니다.
- **사용 시나리오**: 기존 Rules를 유지하면서 새로운 Rules를 추가할 때
- **장점**: 기존 내용 보존
- **단점**: 중복 내용이 발생할 수 있음

## 3. 스마트 업데이트 (Smart Update) - 기본값

- **동작**: 주석 마커를 사용하여 AI CLI Syncer가 관리하는 영역만 업데이트합니다.
- **마커**: `<!-- ai-cli-syncer-start -->` ~ `<!-- ai-cli-syncer-end -->`
- **사용 시나리오**: 사용자 커스터마이징과 AI CLI Syncer 관리 영역을 분리할 때
- **장점**:
  - 사용자 커스터마이징 보존
  - 마스터 Rules의 추가/삭제가 모두 반영됨
- **동작 방식**:
  1. 마커가 없으면 파일 끝에 마커와 함께 내용 추가
  2. 마커가 있으면 마커 사이의 내용만 업데이트
  3. 마커 밖의 내용은 그대로 유지

## 백업 전략

모든 동기화 작업 전에 자동으로 백업이 생성됩니다.

### 백업 위치

- `.backup` 디렉토리에 타임스탬프 기반 백업 파일 저장
- 예: `.backup/GEMINI.md.20251128-145900`

### 백업 관리

- 최대 5개의 백업 유지 (기본값)
- 오래된 백업 자동 삭제
- 각 파일별로 독립적으로 관리

### 백업 복원

```bash
# 최근 백업 목록 확인
ls -la .backup/

# 수동 복원
cp .backup/GEMINI.md.20251128-145900 GEMINI.md
```

## CLI 사용법

```bash
# 스마트 업데이트 (기본값)
acs rules sync --all --verbose

# 완전 교체
acs rules sync --all --strategy overwrite

# 병합
acs rules sync --all --strategy merge

# 특정 도구만 동기화
acs rules sync --tool gemini-cli --project . --strategy smart-update
```

# 주요 사용 시나리오 (Usage Scenarios)

align-agents를 활용하여 개발 환경을 효율적으로 관리하는 주요 시나리오입니다.

## 1. 전체 동기화 (Full Sync)

- **상황**:
  - 새로운 팀원이 프로젝트에 합류하여 개발 환경을 세팅해야 할 때.
  - 팀의 표준 MCP 서버 목록이나 코딩 규칙이 대규모로 업데이트되었을 때.
- **행동**:
  - 웹 대시보드 또는 CLI에서 '전체 동기화'를 실행합니다.
  - 동기화 전략으로 '완전 교체(Overwrite)' 또는 '스마트 업데이트(Smart Update)'를 선택합니다.
- **결과**:
  - 모든 AI Tools(Claude, Cursor, VS Code 등)에 최신 Master Rules와 MCP 설정이 일괄 적용됩니다.
  - 도구마다 일일이 설정을 복사-붙여넣기 할 필요가 없습니다.

## 2. Rules 우선 배포 (Rapid Rules Deployment)

- **상황**:
  - 프로젝트 진행 중 코딩 컨벤션이 변경되어(예: "변수명은 스네이크 케이스 사용") 팀원들에게 즉시 전파해야 할 때.
- **행동**:
  - Master Rules(`master-rules.md`)를 수정합니다.
  - 동기화 메뉴에서 'Rules'만 선택하고 '스마트 업데이트' 전략으로 배포합니다.
- **결과**:
  - 팀원들이 각자 설정해둔 개인적인 프롬프트나 설정은 유지됩니다.
  - 변경된 공통 규칙만 정확하게 업데이트되어 즉시 적용됩니다.

## 3. MCP 서버 추가 및 즉시 사용 (Add & Use MCP)

- **상황**:
  - 개발 중인 서비스의 DB 스키마를 조회하기 위해 `postgresql` MCP 서버를 추가해야 할 때.
- **행동**:
  - Master MCP 관리 화면에서 `postgresql` 서버 설정을 추가합니다.
  - 필요한 Tools(예: Claude Desktop, Cursor)를 체크하고 동기화합니다.
- **결과**:
  - 별도의 복잡한 설정 파일 수정 없이, 선택한 모든 도구에서 즉시 DB 관련 질의가 가능해집니다.

## 4. 프로젝트별 Rules 동기화 (Project-Specific Rules)

- **상황**:
  - A 프로젝트는 React, B 프로젝트는 Django를 사용하여 서로 다른 코딩 규칙이 필요할 때.
- **행동**:
  - 각 프로젝트 루트 디렉터리에 해당 프로젝트에 맞는 Master Rules를 작성합니다.
  - `acs rules sync --project .` 명령어로 해당 프로젝트의 설정 파일들을 갱신합니다.
- **결과**:
  - 어떤 AI 도구를 열더라도 현재 작업 중인 프로젝트의 문맥(Context)에 맞는 정확한 코딩 가이드를 받을 수 있습니다.

## 5. 설정 복원 (Rollback)

- **상황**:
  - 최근 동기화 후 문제가 발생하여 이전 상태로 되돌리고 싶을 때.
  - 실수로 잘못된 설정을 배포했을 때.
- **행동**:
  - 히스토리 명령어로 이전 버전 확인:

    ```bash
    acs history list
    acs history show <version-id>
    ```

  - 특정 버전으로 복원:

    ```bash
    acs history restore <version-id>
    ```

- **결과**:
  - Master Rules 또는 MCP 설정이 선택한 버전으로 복원됩니다.
  - 복원 후 다시 동기화하여 모든 도구에 적용할 수 있습니다.

## CLI 사용 예시

### 전역 동기화 (기본값)

```bash
# 모든 도구의 전역 Rules 동기화
acs rules sync --all --verbose

# 결과: ~/.gemini/GEMINI.md, ~/.claude/CLAUDE.md 등에 동기화
```

### 프로젝트 동기화

```bash
# 현재 프로젝트에 Rules 동기화
acs rules sync --all --verbose --project .

# 결과: ./GEMINI.md, ./CLAUDE.md, ./.cursorrules 생성
```

### 동기화 전략 선택

```bash
# 스마트 업데이트 (기본값)
acs rules sync --all --strategy smart-update

# 완전 교체
acs rules sync --all --strategy overwrite --project .

# 병합
acs rules sync --all --strategy merge --project .
```

### 히스토리 관리

```bash
# 저장된 버전 목록
acs history list
acs history list --type rules

# 특정 버전 내용 보기
acs history show 1732780800-rules

# 버전 복원
acs history restore 1732780800-rules
```

### 백업 확인

```bash
# 백업 파일 확인
ls -la .backup/

# 예시 출력:
# .backup/GEMINI.md.20251128-145900
# .backup/GEMINI.md.20251128-143000
# .backup/CLAUDE.md.20251128-145900
```

---
description: Linear 이슈를 받아 코드를 구현하고 완료 처리하는 Solver 파이프라인
argument-hint: <이슈ID | --my-issues>
---

# Issue Resolver

## 입력

$ARGUMENTS

## 워크플로우

1. **이슈 조회**: 이슈 ID → `get_issue` / `--my-issues` → `list_issues(assignee="me", state="Todo")`
2. **상태 변경**: `update_issue` → **In Progress**
3. **구현**: `/feature-dev:feature-dev` 슬래시 커맨드로 이슈 Description 기반 개발
4. **리뷰**: `/code-review:code-review` 슬래시 커맨드로 코드 리뷰 진행
5. **완료**: `update_issue` → **In Review**, `create_comment`로 결과 요약

## 상태 관리 필수

| 시점 | 상태 | 액션 |
|------|------|------|
| 착수 | In Progress | `update_issue` |
| 난관 | Blocked | `update_issue` + `create_comment` (사유) |
| 완료 | In Review | `update_issue` + `create_comment` (결과) |

Linear 상태 업데이트 없이 작업을 종료하지 마십시오.

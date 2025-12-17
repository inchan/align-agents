---
description: 자연어 요구사항을 Linear/GitHub 이슈로 변환 (issue-orchestrator 파이프라인)
argument-hint: [--project=프로젝트명] <요구사항 설명>
---

# Issue Orchestrator Pipeline

## 입력

$ARGUMENTS

## 프로젝트 결정

1. `--project=<프로젝트명>` 옵션이 있으면 사용
2. 없으면 `list_projects` 조회 후 사용자에게 선택 요청

## 지시문

@.claude/commands/issue-generation-orchestrator.yaml 의 workflow를 따라 서브에이전트를 순차 호출하세요.

코드베이스 탐색 시 Explore 서브에이전트를 활용하세요 (thoroughness: quick).

## 제약사항

@.claude/commands/issue-generation-orchestrator.yaml 의 constraints를 준수하세요.

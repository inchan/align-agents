---
description: 자연어 요구사항을 Linear/GitHub 이슈로 변환 (issue-orchestrator 파이프라인)
argument-hint: <요구사항 설명>
---

# Issue Orchestrator Pipeline

## 요구사항

$ARGUMENTS

## 지시문

@.claude/commands/issue-generation-orchestrator.yaml 의 workflow를 따라 서브에이전트를 순차 호출하세요.

코드베이스 탐색 시 Explore 서브에이전트를 활용하세요 (thoroughness: quick).

## 제약사항

@.claude/commands/issue-generation-orchestrator.yaml 의 constraints를 준수하세요.

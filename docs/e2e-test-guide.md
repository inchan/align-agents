# E2E 테스트 실행 가이드

## 설치

```bash
# Playwright 설치
cd packages/web
npm install

# Playwright 브라우저 설치
npx playwright install
```

## 테스트 실행

### 기본 실행

```bash
npm run test:e2e
```

### UI 모드로 실행 (권장)

```bash
npm run test:e2e:ui
```

### 브라우저를 보면서 실행

```bash
npm run test:e2e:headed
```

### 디버그 모드

```bash
npm run test:e2e:debug
```

### 특정 브라우저만 테스트

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### 특정 테스트만 실행

```bash
npm run test:e2e -- --grep "Dashboard"
```

### 테스트 리포트 보기

```bash
npm run test:e2e:report
```

## 테스트 시나리오

총 14개의 시나리오가 구현되어 있습니다:

1. **Dashboard 기본 기능**: 페이지 로드 및 도구 정보 표시
2. **Tools 페이지 - 정렬**: 설치된 도구가 위로 정렬
3. **Tools 페이지 - 툴팁**: 경로 툴팁 표시
4. **Tools 페이지 - 설정 편집**: 버튼 클릭 시 alert
5. **Tools 페이지 - MCP 버튼**: MCP 페이지로 이동
6. **Rules 페이지 - 조회**: Master Rules 표시
7. **Rules 페이지 - 편집**: 편집 모드 전환
8. **Rules 페이지 - 저장**: Rules 저장 기능
9. **MCP 페이지 - 조회**: MCP 서버 목록 표시
10. **MCP 페이지 - 편집**: JSON 편집 모드
11. **MCP 페이지 - 유효성**: JSON 유효성 검증
12. **Rules 동기화**: 전체 도구 동기화
13. **MCP 동기화**: 단일 도구 동기화
14. **네비게이션**: 페이지 간 이동

## CI/CD 통합

GitHub Actions에서 실행하려면:

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright Browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## 문제 해결

### 브라우저가 설치되지 않음

```bash
npx playwright install
```

### 포트가 이미 사용 중

```bash
# 기존 프로세스 종료
lsof -ti:5173 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### 테스트 타임아웃

`playwright.config.ts`에서 타임아웃 설정 조정:

```typescript
timeout: 30 * 1000, // 30초
```

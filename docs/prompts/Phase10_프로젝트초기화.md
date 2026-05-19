# Phase 10 — 프로젝트 초기화

> CEMS(Campus Energy Management System) 베이스 프로젝트 생성. Next.js 14 + TypeScript + Tailwind + 필요 패키지 설치.

---

## Claude Code 프롬프트

```
영남대 캠퍼스 에너지 관리 시스템(CEMS, Campus Energy Management System) 프로젝트를 시작한다.

작업:
1. 현재 디렉토리에 Next.js 14 프로젝트 생성
   - TypeScript 사용
   - Tailwind CSS 사용
   - App Router 사용
   - src 디렉토리 사용 안 함
   - import alias는 @/* 사용
   - ESLint 사용
   - npm 패키지명은 cems 사용

2. 다음 패키지 설치
   - mapbox-gl, @types/mapbox-gl
   - recharts
   - lucide-react
   - openai
   - 개발 의존성: tsx

3. 루트 기준 디렉토리 구조 생성 또는 유지
   app/
     api/
   components/
     map/
     panel/
     header/
   docs/
     prompts/
   lib/
   models/
   test/
   types/
   public/
     data/

4. .env.local 파일 생성 또는 확인
   NEXT_PUBLIC_MAPBOX_TOKEN=
   OPENAI_API_KEY=
   OPENAI_MODEL=gpt-5.5

5. .gitignore에 .env.local 포함 확인

6. package.json scripts에 테스트 명령 추가
   - `"test": "tsx --test test/**/*.test.ts"`

7. 기본 첫 화면은 CEMS 프로젝트임을 확인할 수 있게 구성
   - CEMS
   - Campus Energy Management System

검증:
- npm run dev 실행 시 localhost:3000에서 기본 페이지가 떠야 함
- npm test 실행 시 node:test 기반 테스트가 실행돼야 함
- 디렉토리 구조 tree 출력으로 확인

요구사항:
- 모든 주석은 한국어
- 기존 docs, models, public/data 파일은 삭제하지 않음
- 불필요한 설명 없이 작업만 진행
```

---

## 완료 후 본인이 할 것

- [ ] `npm run dev` → localhost:3000 정상 로드 확인
- [ ] Mapbox 토큰 발급받아 `.env.local`의 `NEXT_PUBLIC_MAPBOX_TOKEN`에 입력
- [ ] OpenAI API 키도 `.env.local`의 `OPENAI_API_KEY`에 입력 (없으면 Phase 90에서 받아도 됨)

수정 이력: 2026-05-15 — Phase90이 OpenAI 기반으로 변경되어 초기 설치 패키지와 환경변수를 OpenAI 기준으로 수정.
수정 이력: 2026-05-15 — 해커톤 품질 우선 방향에 맞춰 기본 모델을 gpt-5.5로 변경.
수정 이력: 2026-05-15 — 계산 로직 검증을 위해 tsx 기반 테스트 스크립트 추가를 반영.
수정 이력: 2026-05-15 — 중간 삽입이 쉬운 10단위 Phase 번호 체계로 변경.
수정 이력: 2026-05-19 — 프로젝트명을 CAMPUS-RE100에서 CEMS(Campus Energy Management System)로 정정하고 루트 실제 구조와 환경변수 기준을 반영.

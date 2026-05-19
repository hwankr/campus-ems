# CEMS

CEMS는 영남대 캠퍼스 에너지 관리 시스템(Campus Energy Management System)입니다.
Next.js 14, TypeScript, Tailwind CSS, Mapbox 기반으로 캠퍼스 에너지 데이터를 시각화하고 관리하는 프로젝트입니다.

## Getting Started

개발 서버 실행:

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## Test

```bash
npm test
```

## Environment

`.env.local`:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
```

## Structure

주요 디렉토리는 `app/`, `components/`, `docs/`, `lib/`, `models/`, `public/data/`, `test/`, `types/`입니다.

# Supabase 설정 가이드 (로또 프로젝트)

참고: HaanRiver 프로젝트와 동일한 방식으로 Supabase를 사용합니다.

## 1. Supabase 프로젝트 생성

1. [Supabase](https://supabase.com) 가입 후 새 프로젝트 생성
2. 프로젝트가 준비될 때까지 대기

## 2. 테이블 생성

1. Supabase 대시보드 → **SQL Editor**
2. `supabase-lotto-schema.sql` 파일 내용을 복사해 실행
3. `lotto_rounds`, `lotto_analysis`, `lotto_draw_settings` 테이블이 생성됩니다

## 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 아래 값을 설정하세요.

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- **NEXT_PUBLIC_SUPABASE_URL**: Supabase 대시보드 → Settings → API → Project URL
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Settings → API → Project API keys → anon public

## 4. 패키지 설치

```bash
pnpm install
```

## 5. 기존 SQLite 데이터 마이그레이션 (선택)

이전에 `data/lotto.db`를 사용했다면, 먼저 seed API(`/api/seed-lotto`)로 `LottoNumber.txt`를 넣거나, 직접 Supabase 대시보드에서 데이터를 입력할 수 있습니다.

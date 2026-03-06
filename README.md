# 로또 번호 뽑기 (Next.js)

1부터 45까지 번호 중 6개를 무작위로 뽑는 간단한 웹 앱입니다.

## 실행 방법

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 으로 접속하세요.

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## 기능

- **번호 뽑기**: 버튼 클릭 시 중복 없이 6개 번호 무작위 추출
- **색상 구간**: 한국 로또와 유사하게 번호 구간별 색상 (1–10 회색, 11–20 파랑, 21–30 빨강, 31–40 초록, 41–45 노랑)

---

## Git

- **원격 저장소**: nextPL과 동일한 GitHub 계정 사용  
  `https://github.com/amourfou/next-lotto.git`
- **기본 브랜치**: `main`

```bash
# 최초 푸시 전 GitHub에서 저장소 생성 후
git add .
git commit -m "Initial commit"
git push -u origin main
```

## Vercel 배포

- nextPL과 동일하게 Vercel로 배포합니다.
- **연결**: [Vercel](https://vercel.com) → Import Git Repository → `amourfou/next-lotto` 선택 (또는 해당 계정의 이 저장소).
- **빌드 설정**: Framework Preset **Next.js**, Build Command `pnpm build`, Output Directory 기본값 유지.
- **환경 변수**: API·접속 정보가 필요하면 nextPL 프로젝트와 동일한 키/값을 Vercel 프로젝트 설정 → Environment Variables에 추가합니다. (현재 이 프로젝트는 별도 env 미사용)

배포 후 Vercel이 부여한 URL(예: `https://next-lotto-xxx.vercel.app`)로 접속할 수 있습니다.

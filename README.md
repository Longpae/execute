# Execute

Execute는 하루와 한 주의 실행량, 의식적 실행 밀도, XP, 레벨을 추적하는 개인 실행 OS입니다.

> 계획이고 완료고 보다 중요한건 실행했는가, 그리고 얼마나 의식적으로 했는가 이다.

## 아키텍처

- `app/`: Next.js App Router 진입점과 전역 스타일
- `components/`: 모바일 앱 UI, 하단 탭, 모달, 입력 폼, 캘린더
- `hooks/`: localStorage 기반 상태 관리 훅
- `lib/types.ts`: Schedule, Todo, UserProgress, CategoryDailyXp 타입
- `lib/xp.ts`: XP 풀 분배, 잔여 XP 재분배, 레벨·등급 순수 함수
- `lib/storage.ts`: localStorage 드라이버와 초기화 로직
- `lib/stats.ts`: 주간 통계, 연속 실행일, 지난주 대비 변화
- `lib/date.ts`: 날짜 키, 주차, 캘린더 유틸
- `public/`: PWA manifest, 서비스 워커, 오프라인 화면, 앱 아이콘

## 실행

현재 폴더에서 패키지 매니저가 연결되어 있으면 아래 순서로 실행합니다.

```bash
npm install
npm run dev
```

Windows에서는 프로젝트 폴더의 `start-dev.cmd`를 더블클릭해도 됩니다. 서버가 켜진 뒤 브라우저에서 아래 주소를 엽니다.

개발 서버가 뜨면 iPhone Safari에서 같은 네트워크의 PC 주소로 접속하거나, 배포 후 Safari에서 접속한 뒤 공유 버튼의 `홈 화면에 추가`를 선택합니다.

```text
http://localhost:3000
```

## iPhone에서 앱처럼 쓰기까지의 커리큘럼

### 1단계: PC에서 개발 서버로 테스트

프로젝트 폴더의 `start-dev.cmd`를 더블클릭합니다. 검은 터미널 창이 켜져 있는 동안 같은 Wi-Fi의 iPhone Safari에서 아래 형식으로 접속할 수 있습니다.

```text
http://PC의_IP주소:3000
```

이 방식은 개발용입니다. 터미널 창을 끄면 iPhone에서도 열리지 않습니다.

### 2단계: Vercel에 무료 배포

프로젝트 폴더의 `deploy-vercel.cmd`를 더블클릭합니다.

처음 배포할 때 나오는 질문은 보통 아래처럼 답합니다.

```text
Set up and deploy? → Y
Which scope? → 본인 계정 선택
Link to existing project? → N
Project name? → execute
Directory? → Enter
Override settings? → N
```

배포가 끝나면 아래와 비슷한 HTTPS 주소가 생성됩니다.

```text
https://execute-xxxx.vercel.app
```

### 3단계: iPhone 홈 화면에 추가

iPhone Safari에서 Vercel 주소를 연 뒤 아래 순서로 설치합니다.

```text
공유 버튼 → 홈 화면에 추가 → 추가
```

이후에는 PC의 `cmd`를 켜둘 필요가 없습니다. 데이터는 서버가 아니라 iPhone Safari의 로컬 저장소에 저장됩니다.

### 4단계: 업데이트 배포

코드를 수정한 뒤 다시 `deploy-vercel.cmd`를 더블클릭하면 같은 프로젝트에 새 버전이 배포됩니다. iPhone에서 앱을 다시 열면 업데이트된 화면을 사용할 수 있습니다.

## 검증

XP 계산 로직은 UI와 분리되어 있으며 테스트 파일은 `tests/xp.test.ts`에 있습니다.

```bash
npm run test:xp
npm run typecheck
```

## PWA

- `public/manifest.json`
- `public/sw.js`
- `public/offline.html`
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/apple-touch-icon.png`

서비스 워커는 기본 앱 셸을 캐싱하고, 네트워크가 끊긴 경우 오프라인 화면을 반환합니다.

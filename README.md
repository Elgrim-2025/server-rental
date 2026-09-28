# ELGRIM Bare Metal — elliongpu.com

엘그림 GPU 서버를 베어메탈로 임대하는 정적 사이트. 백엔드 없이 GitHub Pages 에서 동작하고,
가격/상태는 Google Sheet 에서 실시간으로 읽어옵니다.

```
elgrim-baremetal/
├── index.html            # 단일 페이지 (KO/EN, KRW/USD 토글)
├── CNAME                 # elliongpu.com
├── assets/
│   ├── style.css         # ufostack.com 디자인 토큰 차용
│   ├── i18n.js           # 모든 UI 문구 ko / en
│   ├── servers.js        # 설정 + 서버 스펙(폴백 데이터). 엔드포인트/키 이미 입력됨
│   └── app.js            # 렌더링, 토글, 시트 로드, 전송 로직
└── apps-script/Code.gs   # 배포된 Apps Script 원본 (참고용, 이미 배포 완료)
```

## 연결된 Google 리소스 (이미 생성·배포됨)

| 항목 | 값 |
|---|---|
| 스프레드시트 | https://docs.google.com/spreadsheets/d/1GuotX0HCkdlWDwI3TW4UgNEDc6eI4Xq4OAMqI0urJwk/edit |
| Apps Script 프로젝트 | https://script.google.com/u/0/home/projects/1OD-O2C60rltU2iLgiDcTXg9oMioWWW2tI_xM5bPZl8otLTPdqnHpGnv5/edit |
| 웹앱 URL | `servers.js` 의 `logEndpoint` (버전 4, 액세스: 모든 사용자) |
| 계정 | lgodl3512@gmail.com |

### 시트 탭

**servers** — 가격·상태·문구. 여기만 고치면 사이트에 반영됩니다 (브라우저 캐시 최대 2분, "새로고침" 버튼은 즉시).

| 열 | 의미 |
|---|---|
| `id` | 서버 식별자. `servers.js` 의 id 와 같아야 함 (바꾸지 말 것) |
| `status` | 드롭다운: `available` 즉시 사용 가능 / `reserve` 입고 예정·예약 / `soldout` 사용 중 |
| `price_krw` | 원화 월 가격 (숫자만). 비우면 "가격 문의" |
| `price_usd` | 달러 월 가격. 비우면 KRW ÷ `fx_usd_krw` 로 자동 환산해 `≈` 표시 |
| `name_ko` / `name_en` | 카드 제목 |
| `price_note_ko` / `price_note_en` | 가격 아래 한 줄 메모 |
| `eta_ko` / `eta_en` | 위치 옆 표시 (예: 입고 예정 / Arriving soon) |

**config** — `fx_usd_krw` 환율, `reply_within_ko/en` 회신 목표 시간, `contact_email`.

- `contact_email` 하나만 바꾸면 사이트의 메일 표시·mailto 링크·버튼 문구, FormSubmit 수신 주소, Apps Script 예약 알림 수신 주소가 모두 따라갑니다.
- 알림만 다른 주소로 받고 싶으면 `notify_email` 행을 추가하세요 (수신은 `notify_email` 우선, 표시는 `contact_email`).
- 수신 주소가 바뀌면 FormSubmit 이 새 주소로 "Activate form" 메일을 1회 보냅니다. 승인해야 이후 메일이 전달됩니다 (그 전에도 logs 시트 기록은 정상).
- `servers.js` 의 `contactEmail` 과 `index.html` 의 주소는 시트를 못 읽을 때만 쓰는 폴백입니다.

**logs** — 사용 요청 / 예약 로그. 프론트가 자동으로 append. `status` 열(드롭다운 new / contacted / done / cancelled)을 손으로 바꾸면 처리 현황 관리 끝.

### API

```
GET  {logEndpoint}?action=servers                      공개. 가격/상태/설정 JSON
GET  {logEndpoint}?action=logs&key=KEY                 로그 JSON (최신순)
GET  {logEndpoint}?action=logs&key=KEY&type=reserve&status=new&limit=50
POST {logEndpoint}   body: JSON(key 포함)              logs 에 한 줄 append
```

`KEY` 는 `servers.js` 의 `logKey` (= Code.gs 의 `SHARED_KEY`).

## 전송 흐름

| 버튼 | 대상 | 동작 |
|---|---|---|
| 사용 요청하기 / Request access | status = available | FormSubmit → 시트 `contact_email`(또는 `notify_email`) 메일 + logs 시트 append |
| 예약하기 / Reserve | status = reserve | logs 시트 append + Apps Script 가 시트 `contact_email`(또는 `notify_email`) 로 알림 메일 (`NOTIFY_ON = ["reserve"]`) |

- **FormSubmit 활성화**: 수신 주소별로 첫 실제 제출 때 그 주소로 "Activate form" 메일이 한 번 옵니다. 링크를 누르면 이후 자동. 그 전까지는 요청이 시트에는 기록되지만 메일은 가지 않습니다.
- 둘 다 실패하면 내용이 채워진 `mailto:` 링크로 폴백. 로그 전송 실패분은 localStorage 에 보관했다가 다음 방문 시 재전송.
- 메일을 Apps Script 하나로 통일하고 싶으면: Code.gs 의 `NOTIFY_ON` 을 `["request","reserve"]` 로 바꾸고 새 버전 배포, `servers.js` 의 `mailEndpoint` 를 `""` 로. (`mailEndpoint` 의 `{email}` 은 시트 수신 주소로 자동 치환)

## 언어 / 통화

- 헤더의 `KO | EN`, `KRW ₩ | USD $` 토글. localStorage 에 저장.
- URL 로 강제: `?lang=en&cur=USD` (링크 공유용).
- 기본값: 브라우저 언어가 en 이면 EN + USD, 아니면 KO + KRW.
- 문구 수정은 `assets/i18n.js`, 스펙 문구는 `assets/servers.js` (ko/en 쌍).

## GitHub Pages 배포

1. 이 폴더 내용을 레포 루트에 커밋 → Settings → Pages → Branch `main` / root
2. `CNAME` 은 `elliongpu.com` (2026-09-28 `servers.elgrim.kr` 에서 변경). DNS 는 Cloudflare(Hwasoo3838 계정) `elliongpu.com` 존: apex A 185.199.108~111.153 / AAAA 2606:50c0:8000~8003::153, `www` CNAME → `elgrim-2025.github.io`, 모두 프록시, SSL Full + 항상 HTTPS
3. HTTPS 는 Cloudflare Universal SSL 이 처리 (프록시 상태에서는 GitHub 의 Enforce HTTPS 는 꺼져 있어도 정상)

## Apps Script 코드 수정 시

편집기에서 저장 후 **배포 → 배포 관리 → 수정 → 버전: 새 버전 → 배포**. 새 버전을 만들지 않으면 `/exec` 에 반영되지 않습니다. URL 은 그대로 유지됩니다.

## 참고

- 개인정보 수집 동의 체크박스 포함. 운영 전 개인정보처리방침 페이지 권장.
- 서버 임대는 통신판매업 신고 대상이 될 수 있음. 결제 붙이기 전 사업자등록/통신판매업 신고 확인.

/* ============================================================
   ELGRIM Bare Metal - 설정 + 서버 기본 데이터
   - 가격 / 상태 / 문구는 Google Sheet("servers" 탭)에서 실시간으로 덮어씁니다.
   - 시트에 접근할 수 없을 때는 이 파일의 값이 그대로 보입니다(폴백).
   ============================================================ */

window.ELGRIM_CONFIG = {
  contactEmail: "help@elgrim.kr",

  // (1) 이메일 발송: FormSubmit (무료, 백엔드 불필요, 첫 제출 시 활성화 메일 1회 승인)
  mailEndpoint: "https://formsubmit.co/ajax/help@elgrim.kr",

  // (2) Google Apps Script 웹앱 URL. 가격 읽기(GET ?action=servers) + 로그 적재(POST) 모두 이 주소.
  logEndpoint: "https://script.google.com/macros/s/AKfycbwVd1C7xAuDyleSRXUtSRBUyxbDHAeyKx-M0ygCc_kIOVXLC50HP4hzUPdexzZj9riW1A/exec",

  // 로그 읽기/쓰기 보호용 공유키 (Code.gs 의 SHARED_KEY 와 동일)
  logKey: "elgrim-x0c35u7c1ci4w5u9",

  // 시트 가격 캐시 시간(초). 시트 수정 후 이 시간 안에는 이전 값이 보일 수 있음.
  cacheSeconds: 120,

  // USD 가격이 시트에 비어 있을 때 KRW → USD 환산에 쓰는 기본 환율 (시트 config 탭 fx_usd_krw 가 있으면 그 값 우선)
  fxUsdKrw: 1400,

  replyWithin: { ko: "24시간", en: "24 hours" },
};

/* status: "available" | "reserve" | "soldout" */
window.SERVERS = [
  {
    id: "elgrim-gfx-a4000",
    accent: "gpu",
    catLabel: "GPU · Bare Metal",
    name: { ko: "그래픽 서버 · RTX A4000", en: "Graphics Server · RTX A4000" },
    location: { ko: "KR · 국내 IDC", en: "KR · Seoul IDC" },
    status: "available",
    tagline: {
      ko: "48코어 EPYC + 251GB RAM 물리 서버 전체를 통째로. LLM 추론, 렌더링, 게임 서버 호스팅에 적합.",
      en: "A whole 48-core EPYC box with 251 GB RAM, all yours. Great for LLM inference, rendering and game-server hosting.",
    },
    specs: [
      { k: "CPU", ko: "AMD EPYC 7642 · 48코어 (2.3 / 3.3 GHz)", en: "AMD EPYC 7642 · 48 cores (2.3 / 3.3 GHz)" },
      { k: "GPU", ko: "NVIDIA RTX A4000 16GB GDDR6 (Ampere)", en: "NVIDIA RTX A4000 16 GB GDDR6 (Ampere)" },
      { k: "RAM", ko: "251 GB DDR4 ECC", en: "251 GB DDR4 ECC" },
      { k: "Storage", ko: "3.5 TB 시스템 디스크 + 14.6 TB RAID", en: "3.5 TB system disk + 14.6 TB RAID" },
      { k: "Network", ko: "1 Gbps · 전용 IPv4 1개", en: "1 Gbps · 1 dedicated IPv4" },
      { k: "Access", ko: "Root / SSH · 원격 재설치 지원", en: "Root / SSH · remote reinstall" },
    ],
    priceKrw: null, // 시트에서 덮어씀. null 이면 "가격 문의"
    priceUsd: null,
    priceNote: { ko: "월 단위 · 협의 후 확정", en: "Monthly · finalised on reply" },
    os: ["Ubuntu 24.04 LTS", "Ubuntu 22.04 LTS", "Debian 12", "Rocky Linux 9", "Proxmox VE 8", "Windows Server (ask)"],
    ctaType: "request",
  },
  {
    id: "elgrim-mi325x-8",
    accent: "ai",
    catLabel: "AI · 8x MI325X",
    name: { ko: "AI 가속 서버 · MI325X ×8", en: "AI Accelerator Server · 8× MI325X" },
    location: { ko: "KR · 국내 IDC", en: "KR · Seoul IDC" },
    status: "reserve",
    eta: { ko: "입고 예정", en: "Arriving soon" },
    tagline: {
      ko: "GIGABYTE G893-ZX1-AAX2 플랫폼. 대규모 LLM 학습/추론용 8-GPU 노드. 입고 즉시 예약 순서대로 연결해 드립니다.",
      en: "GIGABYTE G893-ZX1-AAX2 platform. An 8-GPU node for large-scale LLM training and inference. Reservations are served in order once it lands.",
    },
    specs: [
      { k: "Platform", ko: "GIGABYTE G893-ZX1-AAX2", en: "GIGABYTE G893-ZX1-AAX2" },
      { k: "GPU", ko: "AMD Instinct MI325X ×8 · 256GB HBM3E each (총 2 TB)", en: "AMD Instinct MI325X ×8 · 256 GB HBM3E each (2 TB total)" },
      { k: "CPU", ko: "AMD EPYC 9555 ×2 · 총 128코어 / 256스레드", en: "AMD EPYC 9555 ×2 · 128 cores / 256 threads" },
      { k: "RAM", ko: "96 GB DDR5 ×24 = 2,304 GB", en: "96 GB DDR5 ×24 = 2,304 GB" },
      { k: "Storage", ko: "NVMe 960GB M.2 ×2 (OS) + NVMe 3.84TB ×8 (30.7 TB)", en: "NVMe 960 GB M.2 ×2 (OS) + NVMe 3.84 TB ×8 (30.7 TB)" },
      { k: "Network", ko: "ConnectX-7 200GbE 2-port + 400G ×8 (GPU 패브릭)", en: "ConnectX-7 200GbE 2-port + 8× 400G (GPU fabric)" },
    ],
    priceKrw: null,
    priceUsd: null,
    priceNote: { ko: "GPU 단위 분할 임대 협의 가능", en: "Per-GPU split rental negotiable" },
    os: ["Ubuntu 24.04 LTS + ROCm", "Ubuntu 22.04 LTS + ROCm", "RHEL 9 (ask)"],
    ctaType: "reserve",
  },
];

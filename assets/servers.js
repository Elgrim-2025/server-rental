/* ============================================================
   ELGRIM Bare Metal - 설정 + 서버 기본 데이터
   - 가격 / 상태 / 문구는 Google Sheet("servers" 탭)에서 실시간으로 덮어씁니다.
   - 시트에 접근할 수 없을 때는 이 파일의 값이 그대로 보입니다(폴백).
   ============================================================ */

window.ELGRIM_CONFIG = {
  // 연락 메일 기본값(폴백). 시트 config 탭의 contact_email 이 있으면 그 값이 우선합니다.
  // 화면 표시 / mailto / 요청 메일 수신이 모두 시트 값을 따르므로 평소에는 시트만 고치면 됩니다.
  contactEmail: "help@elliongpu.com",

  // (1) 이메일 발송: FormSubmit (무료, 백엔드 불필요). {email} 자리에 시트의 notify_email → contact_email 순으로 들어감.
  //     수신 주소가 바뀌면 그 주소로 첫 제출 때 "Activate form" 메일이 1회 오고, 승인해야 이후 메일이 전달됩니다.
  mailEndpoint: "https://formsubmit.co/ajax/{email}",

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
      ko: "EPYC 48코어에 메모리 251GB인 물리 서버를 한 대 통째로 씁니다. LLM 추론이나 렌더링, 게임 서버용으로 쓰기 좋습니다.",
      en: "A whole physical server with a 48-core EPYC and 251 GB of RAM. Good for LLM inference, rendering or game servers.",
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
      ko: "GIGABYTE G893-ZX1-AAX2에 MI325X 8장을 올린 노드로, 큰 LLM 학습과 추론용입니다. 입고되면 예약 순서대로 연락드립니다.",
      en: "A GIGABYTE G893-ZX1-AAX2 node with eight MI325X GPUs, for training and serving large LLMs. Once it arrives we contact reservations in order.",
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
  {
    id: "elgrim-rtx4090",
    accent: "gpu",
    catLabel: "GPU · RTX 4090",
    name: { ko: "GPU 서버 · RTX 4090", en: "GPU Server · RTX 4090" },
    location: { ko: "KR · 국내 IDC", en: "KR · Seoul IDC" },
    status: "reserve",
    eta: { ko: "입고 예정", en: "Arriving soon" },
    tagline: {
      ko: "RTX 4090 한 장에 16코어, 메모리 128GB 구성입니다. 추론이나 개발용으로 쓰기 좋습니다.",
      en: "One RTX 4090 with 16 cores and 128 GB of RAM. Suits inference and development work.",
    },
    specs: [
      { k: "GPU", ko: "NVIDIA GeForce RTX 4090 24GB GDDR6X (Ada Lovelace)", en: "NVIDIA GeForce RTX 4090 24 GB GDDR6X (Ada Lovelace)" },
      { k: "Host", ko: "16 Core · 128 GB RAM", en: "16 cores · 128 GB RAM" },
      { k: "Use", ko: "추론 · 개발", en: "Inference · Development" },
      { k: "Access", ko: "Root / SSH", en: "Root / SSH" },
    ],
    priceKrw: 700000, // 시트 price_krw 가 우선
    priceUsd: null,
    priceNote: { ko: "월 단위 · 예약 순서대로 배정", en: "Monthly · assigned in reservation order" },
    os: ["Ubuntu 24.04 LTS", "Ubuntu 22.04 LTS", "Debian 12", "Rocky Linux 9", "Windows Server (ask)"],
    ctaType: "reserve",
  },
  {
    id: "elgrim-l40s-6000ada",
    accent: "gpu",
    catLabel: "GPU · 48GB Ada",
    name: { ko: "GPU 서버 · L40S / RTX 6000 Ada", en: "GPU Server · L40S / RTX 6000 Ada" },
    location: { ko: "KR · 국내 IDC", en: "KR · Seoul IDC" },
    status: "reserve",
    eta: { ko: "입고 예정", en: "Arriving soon" },
    tagline: {
      ko: "VRAM 48GB인 L40S 또는 RTX 6000 Ada 한 장에 32코어, 메모리 256GB 구성입니다. 추론과 그래픽 작업, 렌더링에 씁니다.",
      en: "One 48 GB L40S or RTX 6000 Ada with 32 cores and 256 GB of RAM, for inference, graphics and rendering.",
    },
    specs: [
      { k: "GPU", ko: "NVIDIA L40S 또는 RTX 6000 Ada 48GB GDDR6 ECC (Ada Lovelace)", en: "NVIDIA L40S or RTX 6000 Ada 48 GB GDDR6 ECC (Ada Lovelace)" },
      { k: "Host", ko: "32 Core · 256 GB RAM", en: "32 cores · 256 GB RAM" },
      { k: "Use", ko: "추론 · 그래픽 · 렌더", en: "Inference · Graphics · Rendering" },
      { k: "Access", ko: "Root / SSH", en: "Root / SSH" },
    ],
    priceKrw: 1500000, // 시트 price_krw 가 우선
    priceUsd: null,
    priceNote: { ko: "월 단위 · 예약 순서대로 배정", en: "Monthly · assigned in reservation order" },
    os: ["Ubuntu 24.04 LTS", "Ubuntu 22.04 LTS", "Debian 12", "Rocky Linux 9", "Proxmox VE 8", "Windows Server (ask)"],
    ctaType: "reserve",
  },
];

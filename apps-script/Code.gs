/**
 * ELGRIM Bare Metal — Google Sheets 백엔드 (Apps Script 웹앱)
 *
 * 시트 구성 (setup() 실행 시 자동 생성)
 *   servers : 가격/상태/문구. 여기만 고치면 사이트에 반영됩니다 (캐시 최대 2분).
 *   config  : 환율, 회신시간 등 키/값 설정
 *   logs    : 사용 요청 / 예약 로그 (프론트에서 POST)
 *
 * API
 *   GET  ?action=servers            공개. servers + config 를 JSON 으로 (프론트 가격 표시용)
 *   GET  ?action=logs&key=KEY       로그 조회. &type=reserve&server=ID&status=new&limit=50 필터
 *   POST body(JSON, key 포함)       logs 시트에 한 줄 append (+ 선택: 메일 알림)
 */

const SHARED_KEY = "elgrim-x0c35u7c1ci4w5u9";          // 프론트 servers.js 의 logKey 와 동일하게
const NOTIFY_EMAIL = "help@elgrim.kr";   // "" 이면 Apps Script 메일 알림 끔
const NOTIFY_ON = ["reserve"];           // 알림 보낼 type. FormSubmit 을 끄면 ["request","reserve"] 로

const SH_SERVERS = "servers";
const SH_CONFIG = "config";
const SH_LOGS = "logs";

const SERVER_COLS = ["id", "status", "price_krw", "price_usd", "name_ko", "name_en", "price_note_ko", "price_note_en", "eta_ko", "eta_en", "memo"];
const LOG_COLS = [
  "timestamp", "type", "serverId", "serverName", "email", "name", "os", "purpose", "duration", "gpuCount",
  "message", "lang", "currency", "page", "referrer", "userAgent", "language", "screen", "timezone",
  "utm_source", "utm_medium", "utm_campaign", "replayed", "status",
];

const SEED_SERVERS = [
  ["elgrim-gfx-a4000", "available", "", "", "그래픽 서버 · RTX A4000", "Graphics Server · RTX A4000", "월 단위 · 협의 후 확정", "Monthly · finalised on reply", "", "", "price 비우면 '가격 문의' 로 표시"],
  ["elgrim-mi325x-8", "reserve", "", "", "AI 가속 서버 · MI325X ×8", "AI Accelerator Server · 8× MI325X", "GPU 단위 분할 임대 협의 가능", "Per-GPU split rental negotiable", "입고 예정", "Arriving soon", "status: available / reserve / soldout"],
];
const SEED_CONFIG = [
  ["fx_usd_krw", "1400", "USD 가격이 비어 있을 때 KRW÷환율 로 자동 환산"],
  ["reply_within_ko", "24시간", "회신 목표 시간(한글)"],
  ["reply_within_en", "24 hours", "회신 목표 시간(영문)"],
  ["contact_email", "help@elgrim.kr", "표시용 연락 메일"],
];

/* ---------------- helpers ---------------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name, header, seed) {
  let sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name);
    sh.appendRow(header);
    sh.getRange(1, 1, 1, header.length).setFontWeight("bold").setBackground("#0e1326").setFontColor("#5dffb0");
    sh.setFrozenRows(1);
    if (seed && seed.length) sh.getRange(2, 1, seed.length, seed[0].length).setValues(seed);
    sh.autoResizeColumns(1, header.length);
  }
  return sh;
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function rows_(sh) {
  const v = sh.getDataRange().getValues();
  const h = v.shift() || [];
  return v.filter((r) => String(r[0]).trim() !== "").map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] instanceof Date ? r[i].toISOString() : r[i]])));
}
function num_(x) { const n = Number(String(x).replace(/[^\d.]/g, "")); return isFinite(n) && n > 0 ? n : null; }

/* ---------------- GET ---------------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = p.action || "servers";

  if (action === "servers") {
    const servers = rows_(sheet_(SH_SERVERS, SERVER_COLS, SEED_SERVERS)).map((r) => ({
      id: String(r.id).trim(),
      status: String(r.status || "").trim() || undefined,
      priceKrw: num_(r.price_krw),
      priceUsd: num_(r.price_usd),
      name: { ko: r.name_ko || "", en: r.name_en || "" },
      priceNote: { ko: r.price_note_ko || "", en: r.price_note_en || "" },
      eta: { ko: r.eta_ko || "", en: r.eta_en || "" },
    }));
    const cfg = {};
    rows_(sheet_(SH_CONFIG, ["key", "value", "memo"], SEED_CONFIG)).forEach((r) => (cfg[r.key] = r.value));
    return json_({ ok: true, updatedAt: new Date().toISOString(), servers: servers, config: cfg });
  }

  if (action === "logs") {
    if (SHARED_KEY && p.key !== SHARED_KEY) return json_({ ok: false, error: "bad key" });
    let rows = rows_(sheet_(SH_LOGS, LOG_COLS));
    if (p.type) rows = rows.filter((r) => r.type === p.type);
    if (p.server) rows = rows.filter((r) => r.serverId === p.server);
    if (p.status) rows = rows.filter((r) => r.status === p.status);
    rows.reverse();
    return json_({ ok: true, count: rows.length, rows: rows.slice(0, Number(p.limit) || 200) });
  }

  return json_({ ok: false, error: "unknown action" });
}

/* ---------------- POST (로그 적재) ---------------- */
function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    if (SHARED_KEY && body.key !== SHARED_KEY) return json_({ ok: false, error: "bad key" });

    const sh = sheet_(SH_LOGS, LOG_COLS);
    const row = LOG_COLS.map((c) => {
      if (c === "timestamp") return body.timestamp ? new Date(body.timestamp) : new Date();
      if (c === "status") return "new";
      const v = body[c];
      return v == null ? "" : String(v);
    });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sh.appendRow(row);
      sh.getRange(sh.getLastRow(), 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
    } finally { lock.releaseLock(); }

    if (NOTIFY_EMAIL && NOTIFY_ON.indexOf(body.type) !== -1) notify_(body);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function notify_(b) {
  const subject = "[ELGRIM " + (b.type === "reserve" ? "예약" : "사용요청") + "] " + (b.serverName || "") + " — " + (b.email || "");
  const lines = [
    "구분: " + (b.type === "reserve" ? "예약(입고 예정)" : "사용 요청"),
    "서버: " + b.serverName + " (" + b.serverId + ")",
    "이메일: " + b.email,
    "이름/소속: " + (b.name || "-"),
    "OS: " + (b.os || "-"),
    "용도: " + (b.purpose || "-"),
    "기간: " + (b.duration || "-"),
    "희망 GPU 수: " + (b.gpuCount || "-"),
    "메시지: " + (b.message || "-"),
    "언어/통화: " + (b.lang || "-") + " / " + (b.currency || "-"),
    "",
    "시각: " + b.timestamp,
    "페이지: " + b.page,
    "시트: " + ss_().getUrl(),
  ];
  MailApp.sendEmail({ to: NOTIFY_EMAIL, replyTo: b.email || undefined, subject: subject, body: lines.join("\n") });
}

/** 편집기에서 1회 실행: 시트 3개 생성 + 권한 승인 */
function setup() {
  const sv = sheet_(SH_SERVERS, SERVER_COLS, SEED_SERVERS);
  sheet_(SH_CONFIG, ["key", "value", "memo"], SEED_CONFIG);
  const lg = sheet_(SH_LOGS, LOG_COLS);
  // 드롭다운 + 서식: 상태값 오타 방지, 타임스탬프 읽기 쉽게
  sv.getRange("B2:B50").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["available", "reserve", "soldout"], true).build());
  sv.getRange("C2:C50").setNumberFormat("#,##0");
  sv.getRange("D2:D50").setNumberFormat("#,##0");
  lg.getRange("A2:A").setNumberFormat("yyyy-mm-dd hh:mm:ss");
  const statusCol = LOG_COLS.indexOf("status") + 1;
  lg.getRange(2, statusCol, lg.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(["new", "contacted", "done", "cancelled"], true).build());
  const first = ss_().getSheets()[0];
  if (first.getName() !== SH_SERVERS && first.getLastRow() === 0) ss_().deleteSheet(first);
  Logger.log("ok: " + ss_().getUrl());
}

/* ============================================================
   ELGRIM Bare Metal - 프론트엔드 로직 (백엔드 없음, GitHub Pages)
   - KO / EN, KRW / USD 토글 (localStorage + ?lang= ?cur= 쿼리)
   - 가격/상태는 Google Sheet(Apps Script GET ?action=servers) 에서 실시간 로드
   - 전송: (1) FormSubmit → chkang@elgrim.kr 메일  (2) Apps Script → logs 시트
   - 실패 시 mailto: 폴백 + localStorage 임시 보관
   ============================================================ */
(function () {
  "use strict";
  const CFG = window.ELGRIM_CONFIG || {};
  const BASE = window.SERVERS || [];
  const I18N = window.I18N || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LS = { logs: "elgrim.pendingLogs", lang: "elgrim.lang", cur: "elgrim.currency", cache: "elgrim.serversCache" };
  const q = new URLSearchParams(location.search);

  /* ---------- 상태 ---------- */
  let lang = (q.get("lang") || localStorage.getItem(LS.lang) || (navigator.language || "ko").toLowerCase().slice(0, 2)) === "en" ? "en" : "ko";
  let currency = q.get("cur") || localStorage.getItem(LS.cur) || (lang === "en" ? "USD" : "KRW");
  currency = currency.toUpperCase() === "USD" ? "USD" : "KRW";
  let filter = "all";
  let sort = "default";
  let live = null; // { servers, config, updatedAt }
  let SERVERS = BASE.map((s) => ({ ...s }));

  const t = (k, vars) => {
    let s = (I18N[lang] && I18N[lang][k]) ?? (I18N.ko && I18N.ko[k]) ?? k;
    if (typeof s === "string" && vars) Object.entries(vars).forEach(([a, b]) => (s = s.split("{" + a + "}").join(b)));
    return s;
  };
  const L = (obj) => (obj && typeof obj === "object" ? obj[lang] || obj.ko || "" : obj || "");
  const replyWithin = () => (live && live.config && live.config["reply_within_" + lang]) || L(CFG.replyWithin) || "24h";
  const contactEmail = () => (live && live.config && live.config.contact_email) || CFG.contactEmail;
  const fx = () => Number(live && live.config && live.config.fx_usd_krw) || CFG.fxUsdKrw || 1400;

  /* ---------- i18n 적용 ---------- */
  function applyI18n() {
    document.documentElement.lang = lang;
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));
    $$("[data-i18n-attr]").forEach((el) => {
      const [attr, key] = el.dataset.i18nAttr.split(":");
      el.setAttribute(attr, t(key));
    });
    $$("[data-mail]").forEach((a) => (a.href = "mailto:" + contactEmail()));
    $$("[data-mail-text]").forEach((el) => (el.textContent = contactEmail()));
    $$("[data-reply-within]").forEach((el) => (el.textContent = replyWithin()));
    $$("#langSeg button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
    $("#currencySel").value = currency;
    $("#useTags").innerHTML = t("use.tags").map((x) => `<span>${x}</span>`).join("");
    $("#faqList").innerHTML = t("faq.items").map(([qq, a]) => `<details><summary>${qq}</summary><div class="ans">${a}</div></details>`).join("");
    $$("#faqList [data-reply-within]").forEach((el) => (el.textContent = replyWithin()));
    fillSelect($("#fPurpose"), t("form.purposes"));
    fillSelect($("#fDuration"), t("form.durations"));
    document.title = t("meta.title");
    renderPriceSource();
  }
  function fillSelect(sel, arr) {
    const v = sel.value;
    sel.innerHTML = arr.map((o) => `<option>${o}</option>`).join("");
    if (arr.includes(v)) sel.value = v;
  }
  function setLang(l) { lang = l; localStorage.setItem(LS.lang, l); applyI18n(); render(); }
  function setCurrency(c) { currency = c; localStorage.setItem(LS.cur, c); render(); }
  $("#langSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang); });
  $("#currencySel").addEventListener("change", (e) => setCurrency(e.target.value));
  $("#year").textContent = new Date().getFullYear();

  /* ---------- 시트에서 가격/상태 로드 ---------- */
  function mergeLive(data) {
    live = data;
    SERVERS = BASE.map((s) => {
      const r = (data.servers || []).find((x) => x.id === s.id);
      if (!r) return { ...s };
      const m = { ...s };
      if (r.status) m.status = r.status;
      if (r.priceKrw != null) m.priceKrw = r.priceKrw;
      if (r.priceUsd != null) m.priceUsd = r.priceUsd;
      ["name", "priceNote", "eta"].forEach((k) => {
        const v = r[k];
        if (v && (v.ko || v.en)) m[k] = { ko: v.ko || (s[k] && s[k].ko) || "", en: v.en || (s[k] && s[k].en) || "" };
      });
      return m;
    });
  }
  async function loadLive(force) {
    if (!CFG.logEndpoint) return;
    try {
      const c = JSON.parse(sessionStorage.getItem(LS.cache) || "null");
      if (!force && c && Date.now() - c.at < (CFG.cacheSeconds || 120) * 1000) { mergeLive(c.data); return; }
    } catch (_) {}
    try {
      const r = await fetch(CFG.logEndpoint + "?action=servers&_=" + Date.now(), { cache: "no-store" });
      const data = await r.json();
      if (data && data.ok) {
        mergeLive(data);
        sessionStorage.setItem(LS.cache, JSON.stringify({ at: Date.now(), data }));
      }
    } catch (e) { console.warn("live prices unavailable", e); }
  }
  function renderPriceSource() {
    const el = $("#priceSource");
    if (!el) return;
    if (live && live.updatedAt) {
      const d = new Date(live.updatedAt);
      el.textContent = t("price.live", { time: d.toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" }) });
    } else el.textContent = CFG.logEndpoint ? "" : t("price.fallback");
  }

  /* ---------- 가격 표시 ---------- */
  function priceHtml(s) {
    let amount = null, approx = false;
    if (currency === "KRW") {
      if (s.priceKrw) amount = s.priceKrw;
      else if (s.priceUsd) { amount = Math.round((s.priceUsd * fx()) / 1000) * 1000; approx = true; }
    } else {
      if (s.priceUsd) amount = s.priceUsd;
      else if (s.priceKrw) { amount = Math.round(s.priceKrw / fx()); approx = true; }
    }
    if (amount == null) return `<div class="price">${t("price.ask")}</div><div class="price-note">${L(s.priceNote)}</div>`;
    const fmt = currency === "KRW"
      ? "₩" + amount.toLocaleString("ko-KR")
      : "$" + amount.toLocaleString("en-US", { maximumFractionDigits: 0 });
    const note = [approx ? t("price.approx") : "", t("price.vat"), L(s.priceNote)].filter(Boolean).join(" · ");
    return `<div class="price">${fmt}<small>${t("price.mo")}</small></div><div class="price-note">${note}</div>`;
  }

  /* ---------- 서버 카드 ---------- */
  const grid = $("#plans-grid");
  const gpuCount = (s) => { const g = s.specs.find((x) => x.k === "GPU"); const m = g && (g.en || "").match(/×(\d+)/); return m ? +m[1] : 1; };
  const ctaClass = (s) => (s.status === "reserve" ? "btn btn-amber" : s.status === "soldout" ? "btn" : "btn btn-accent");
  const ctaType = (s) => (s.status === "reserve" ? "reserve" : "request");
  const ctaLabel = (s) => (s.status === "soldout" ? t("card.wait") : s.status === "reserve" ? t("card.reserve") : t("card.request"));

  function render() {
    let list = SERVERS.filter((s) => filter === "all" || s.status === filter);
    if (sort === "available") list = [...list].sort((a, b) => (a.status === "available" ? -1 : 1) - (b.status === "available" ? -1 : 1));
    if (sort === "gpu") list = [...list].sort((a, b) => gpuCount(b) - gpuCount(a));
    if (!list.length) { grid.innerHTML = `<div class="card empty">${t("empty")}</div>`; return; }
    grid.innerHTML = list.map((s) => `
      <article class="card plan" data-accent="${s.accent}" data-id="${s.id}">
        <div class="plan-top">
          <span class="badge cat">${s.catLabel}</span>
          <span class="status ${s.status}">${t("status." + s.status)}</span>
        </div>
        <div>
          <h3>${L(s.name)}</h3>
          <div class="loc">📍 ${L(s.location)}${L(s.eta) ? " · " + L(s.eta) : ""}</div>
        </div>
        <p class="tagline">${L(s.tagline)}</p>
        <dl class="specs">${s.specs.map((x) => `<dt>${x.k}</dt><dd>${x[lang] || x.ko}</dd>`).join("")}</dl>
        <div class="os-row">
          <label for="os-${s.id}">${t("card.os")}</label>
          <select class="select-inline" id="os-${s.id}">${s.os.map((o) => `<option>${o}</option>`).join("")}</select>
        </div>
        <div class="plan-foot">
          <div>${priceHtml(s)}</div>
          <button class="${ctaClass(s)}" data-open="${ctaType(s)}" data-server="${s.id}">${ctaLabel(s)}</button>
        </div>
      </article>`).join("");
    renderPriceSource();
  }

  $("#statusSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-filter]");
    if (!b) return;
    $$("#statusSeg button").forEach((x) => x.classList.toggle("on", x === b));
    filter = b.dataset.filter;
    render();
  });
  $("#sortSel").addEventListener("change", (e) => { sort = e.target.value; render(); });
  $("#refreshBtn").addEventListener("click", async () => { await loadLive(true); render(); toast(t("refreshed")); });

  /* ---------- 모바일 메뉴 ---------- */
  $("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
  $$("#nav a").forEach((a) => a.addEventListener("click", () => $("#nav").classList.remove("open")));

  /* ---------- 모달 ---------- */
  const modal = $("#modal");
  const form = $("#reqForm");
  const done = $("#done");
  const errBox = $("#formErr");
  let current = null;

  function openModal(type, serverId) {
    const server = SERVERS.find((s) => s.id === serverId) || SERVERS[0];
    current = { server, type };
    const isReserve = type === "reserve";
    $("#modalLabel").textContent = t(isReserve ? "modal.reserve.label" : "modal.request.label");
    $("#modalTitle").textContent = t(isReserve ? "modal.reserve.title" : "modal.request.title");
    $("#modalServer").innerHTML = `<b>${L(server.name)}</b> · ${L(server.location)}`;
    $("#fType").value = type;
    $("#fServerId").value = server.id;
    $("#fServerName").value = L(server.name);
    const osSel = $("#fOs");
    osSel.innerHTML = server.os.map((o) => `<option>${o}</option>`).join("");
    const cardOs = $(`#os-${server.id}`);
    if (cardOs) osSel.value = cardOs.value;
    $("#gpuField").style.display = isReserve ? "grid" : "none";
    const sb = $("#submitBtn");
    sb.textContent = t(isReserve ? "form.submit.reserve" : "form.submit.request");
    sb.className = isReserve ? "btn btn-amber" : "btn btn-accent";
    errBox.style.display = "none";
    form.style.display = "grid";
    done.style.display = "none";
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#fEmail").focus(), 50);
  }
  function closeModal() { modal.classList.remove("open"); document.body.style.overflow = ""; }
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (o) { e.preventDefault(); openModal(o.dataset.open, o.dataset.server); return; }
    if (e.target.closest("[data-close]") || e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());

  /* ---------- 전송 ---------- */
  function buildPayload() {
    const p = Object.fromEntries(new FormData(form).entries());
    return {
      ...p,
      gpuCount: current.type === "reserve" ? p.gpuCount : "",
      lang, currency,
      timestamp: new Date().toISOString(),
      page: location.href,
      referrer: document.referrer || "",
      userAgent: navigator.userAgent,
      language: navigator.language,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      utm_source: q.get("utm_source") || "",
      utm_medium: q.get("utm_medium") || "",
      utm_campaign: q.get("utm_campaign") || "",
    };
  }
  const isR = (p) => p.type === "reserve";
  const mailSubject = (p) => `${t(isR(p) ? "mail.subject.reserve" : "mail.subject.request")} ${p.serverName} — ${p.email}`;
  const mailFields = (p) => ({
    Type: isR(p) ? "Reservation (upcoming)" : "Access request",
    Server: `${p.serverName} (${p.serverId})`,
    Email: p.email,
    Name: p.name || "-",
    OS: p.os,
    Purpose: p.purpose,
    Term: p.duration,
    GPUs: p.gpuCount || "-",
    Message: p.message || "-",
    "Lang/Currency": `${p.lang} / ${p.currency}`,
    Time: p.timestamp,
    Page: p.page,
  });
  const mailBody = (p) => Object.entries(mailFields(p)).map(([k, v]) => `${k}: ${v}`).join("\n");

  async function sendMail(p) {
    if (!CFG.mailEndpoint) return { ok: false, skipped: true };
    const body = { _subject: mailSubject(p), _replyto: p.email, _template: "table", _captcha: "false", ...mailFields(p) };
    const r = await fetch(CFG.mailEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && String(j.success) !== "false", res: j };
  }
  async function sendLog(p) {
    if (!CFG.logEndpoint) { queueLocal(p); return { ok: false, skipped: true }; }
    try {
      await fetch(CFG.logEndpoint, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ key: CFG.logKey || "", ...p }) });
      return { ok: true };
    } catch (e) { queueLocal(p); return { ok: false, error: String(e) }; }
  }
  function queueLocal(p) {
    try { const arr = JSON.parse(localStorage.getItem(LS.logs) || "[]"); arr.push(p); localStorage.setItem(LS.logs, JSON.stringify(arr.slice(-200))); } catch (_) {}
  }
  async function flushLocal() {
    if (!CFG.logEndpoint) return;
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(LS.logs) || "[]"); } catch (_) {}
    if (!arr.length) return;
    localStorage.removeItem(LS.logs);
    for (const p of arr) await sendLog({ ...p, replayed: true });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errBox.style.display = "none";
    if (!form.reportValidity()) return;
    const btn = $("#submitBtn");
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = t("form.sending");
    const p = buildPayload();
    const [mail, log] = await Promise.all([sendMail(p).catch((err) => ({ ok: false, error: String(err) })), sendLog(p)]);
    btn.disabled = false; btn.textContent = label;

    if (!mail.ok && !log.ok) {
      const href = `mailto:${contactEmail()}?subject=${encodeURIComponent(mailSubject(p))}&body=${encodeURIComponent(mailBody(p))}`;
      errBox.innerHTML = t("form.fail", { href });
      errBox.style.display = "block";
      return;
    }
    const r = isR(p);
    $("#doneTitle").textContent = t(r ? "done.reserve.title" : "done.request.title");
    $("#doneMsg").innerHTML = r
      ? t("done.reserve.msg", { server: p.serverName, email: p.email }) + (mail.ok ? "" : t("done.reserve.logonly"))
      : t("done.request.msg", { contact: contactEmail(), within: replyWithin(), email: p.email });
    form.style.display = "none";
    done.style.display = "block";
    form.reset();
    toast(t(r ? "toast.reserve" : "toast.request"));
  });

  /* ---------- 토스트 ---------- */
  let tt;
  function toast(msg) { const el = $("#toast"); el.textContent = msg; el.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("show"), 2200); }

  /* ---------- 스크롤 스파이 ---------- */
  const secs = ["top", "plans", "how", "included", "faq"].map((id) => document.getElementById(id)).filter(Boolean);
  const links = $$("#nav a");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id)); });
  }, { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach((s) => io.observe(s));

  /* ---------- 시작 ---------- */
  applyI18n();
  render();
  loadLive(false).then(() => { applyI18n(); render(); flushLocal(); });
})();

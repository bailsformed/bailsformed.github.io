/* =====================================================================
   GREMLIN TOWN: the game. Content lives in data.js.
   Saves to this browser (localStorage) and, when she's logged in to the
   Family Village on this browser, to her account (game key 'kyla').
   ===================================================================== */
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const pick = a => a[Math.floor(Math.random() * a.length)];
const money = n => (n < 0 ? "-" : "") + "$" + Math.abs(+n || 0).toLocaleString("en-US", {minimumFractionDigits: (Math.abs(n) % 1 ? 2 : 0), maximumFractionDigits: 2});
const num = v => { const x = parseFloat(String(v).replace(/[$,]/g, "")); return isFinite(x) ? x : 0; };
const daysUntil = d => { if (!d) return null; const t = new Date(d + "T00:00"), n = new Date(); n.setHours(0, 0, 0, 0); return Math.round((t - n) / 864e5); };
const GM = Object.fromEntries(GREMS.map(g => [g.id, g]));
const QM = Object.fromEntries(QUESTS.map(q => [q.id, q]));
const isParent = s => s.startsWith("👪");

// ---------- state ----------
const KEY = "gremlin_town_kyla_v1";
function fresh() {
  return {v:1, updatedAt:0, name:"Kyla Bug", state:"", fandom:"", seenIntro:false, sound:true, calm:false, hotMode:"some",
    q:{}, got:{}, snk:0, snkEarned:0, bx:0, days:{}, rest:{}, log:[], colleges:[], job:{where:"", rate:"", hours:""},
    jars:JSON.parse(JSON.stringify(DEFAULT_JARS)), tx:[], pm:{}, owned:{hop:1, flip:1, spin:1}, hats:{}, fics:[],
    lastHot:0, hotCount:0, focusMin:0, skip:0, tab:"home", met:{}};
}
let S = fresh();
try { const r = localStorage.getItem(KEY); if (r) S = Object.assign(fresh(), JSON.parse(r)); } catch (e) {}
let cloud = {ref:null, w:false, p:false}, stT = null;
function save() { S.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} clearTimeout(stT); stT = setTimeout(push, 1000); }
async function push() { if (!cloud.ref) return; if (cloud.w) { cloud.p = true; return; } cloud.w = true;
  try { await cloud.ref.set({state:JSON.stringify(S), updatedAt:S.updatedAt}); } catch (e) {} cloud.w = false; if (cloud.p) { cloud.p = false; push(); } }
function setSaveStat(t) { const e = $("#saveStat"); if (e) e.textContent = t; }
async function initCloud() {
  if (!window.CloudSave) { setSaveStat("Saved on this device"); return; }
  try {
    const ref = await CloudSave.connect({game:"kyla", localKey:KEY, getState:() => S, status:setSaveStat,
      setState:d => { S = Object.assign(fresh(), d); lastLv = levelInfo().lv; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
        if (S.seenIntro && ($("#i1") || $("#i2") || $("#i3"))) closeModal(); renderAll(); }});
    if (ref) { cloud.ref = ref; push(); }
  } catch (e) { setSaveStat("Saved on this device"); }
}

// ---------- sound ----------
let ac = null;
function tone(fs, type = "triangle", gap = .1, vol = .07, len = .5) {
  if (!S.sound) return;
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); let t = ac.currentTime;
    fs.forEach(f => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + len); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + len + .05); t += gap; });
  } catch (e) {}
}
const SFX = {tap:() => tone([880], "sine", .1, .04, .15), step:() => tone([660, 990], "triangle", .08),
  done:() => tone([523, 659, 784, 1046]), lvl:() => tone([392, 494, 587, 784, 988, 1175], "triangle", .09),
  kazoo:() => tone([392, 440, 392, 523, 494, 392, 349, 392], "sawtooth", .16, .035, .18), hot:() => tone([1568, 1318, 1760], "sine", .12, .05, .7),
  bonk:() => tone([180, 120], "square", .1, .04, .2)};

// ---------- art: gremlins ----------
const D = "#3b2a4d";
function hatSVG(h) {
  switch (h) {
    case "cat": return `<path d="M17 25 L19 10 L28 22Z M43 25 L41 10 L32 22Z" fill="${D}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><path d="M20 21 L21 14 L25 21Z M40 21 L39 14 L35 21Z" fill="#ffb3c8"/>`;
    case "ninja": return `<path d="M12 31 Q30 23 48 31 L48 36 Q30 28 12 36Z" fill="#3e5bd6" stroke="${D}" stroke-width="2"/><rect x="26" y="27" width="8" height="5" rx="1" fill="#c9d3e0" stroke="${D}" stroke-width="1"/><path d="M48 32 Q56 30 58 38 M48 34 Q54 38 52 44" stroke="#3e5bd6" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case "wizard": return `<path d="M30 0 L44 25 L16 25Z" fill="#6b4fd8" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="30" cy="25" rx="18" ry="3.5" fill="#6b4fd8" stroke="${D}" stroke-width="2"/><text x="26" y="17" font-size="7" fill="#ffe066">✦</text><text x="32" y="11" font-size="5" fill="#ffe066">✦</text>`;
    case "chef": return `<rect x="20" y="16" width="20" height="9" fill="#fff" stroke="${D}" stroke-width="2"/><circle cx="22" cy="12" r="6" fill="#fff" stroke="${D}" stroke-width="2"/><circle cx="30" cy="9" r="7" fill="#fff" stroke="${D}" stroke-width="2"/><circle cx="38" cy="12" r="6" fill="#fff" stroke="${D}" stroke-width="2"/><rect x="21" y="15" width="18" height="6" fill="#fff"/>`;
    case "frog": return `<path d="M14 27 Q14 12 30 12 Q46 12 46 27Z" fill="#7cc85a" stroke="${D}" stroke-width="2"/><circle cx="22" cy="12" r="5" fill="#7cc85a" stroke="${D}" stroke-width="2"/><circle cx="38" cy="12" r="5" fill="#7cc85a" stroke="${D}" stroke-width="2"/><circle cx="22" cy="12" r="2" fill="${D}"/><circle cx="38" cy="12" r="2" fill="${D}"/><path d="M26 20 Q30 23 34 20" stroke="${D}" stroke-width="1.5" fill="none"/>`;
    case "pirate": return `<path d="M10 25 Q14 8 30 8 Q46 8 50 25 Q30 19 10 25Z" fill="#2b2533" stroke="${D}" stroke-width="2"/><circle cx="30" cy="16" r="3" fill="#fff"/><path d="M28 19 h4" stroke="#fff" stroke-width="1"/>`;
    case "bow": return `<path d="M30 18 L16 9 Q12 18 16 26Z M30 18 L44 9 Q48 18 44 26Z" fill="#ff8fb8" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><circle cx="30" cy="18" r="4" fill="#ff5d8f" stroke="${D}" stroke-width="2"/>`;
    case "crown": return `<path d="M19 24 L19 12 L24 18 L30 9 L36 18 L41 12 L41 24Z" fill="#ffd23f" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><circle cx="30" cy="19" r="2" fill="#ff5d8f"/>`;
    case "halo": return `<ellipse cx="30" cy="10" rx="13" ry="4" fill="none" stroke="#ffd23f" stroke-width="3"/>`;
    default: return "";
  }
}
function gSVG(g, o = {}) {
  const c = g.col, b = g.belly, hat = o.hat !== undefined ? o.hat : (S.hats[g.id] || "");
  const ear = `<path d="M17 30 Q5 18 2 8 Q14 11 25 22Z" fill="${c}" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><path d="M15 25 Q9 17 7 12 Q14 15 20 21Z" fill="#ffb3c8"/>`;
  let s = `<g>${ear}<g transform="translate(60 0) scale(-1 1)">${ear}</g>
   <ellipse cx="21" cy="58" rx="6.5" ry="3.8" fill="${c}" stroke="${D}" stroke-width="2"/><ellipse cx="39" cy="58" rx="6.5" ry="3.8" fill="${c}" stroke="${D}" stroke-width="2"/>
   <ellipse cx="30" cy="40" rx="19" ry="18" fill="${c}" stroke="${D}" stroke-width="2"/>
   <ellipse cx="30" cy="48" rx="11" ry="8" fill="${b}"/>
   <path d="M12 42 Q5 45 8 51" stroke="${D}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M48 42 Q55 45 52 51" stroke="${D}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
   <ellipse cx="17" cy="45" rx="3.2" ry="2" fill="#ff8fb8" opacity=".55"/><ellipse cx="43" cy="45" rx="3.2" ry="2" fill="#ff8fb8" opacity=".55"/>`;
  if (g.acc === "nightcap" || o.sleepy) s += `<path d="M18 37 Q23 41 28 37 M32 37 Q37 41 42 37" stroke="${D}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  else s += [23, 37].map(x => `<circle cx="${x}" cy="36" r="5.6" fill="#fff" stroke="${D}" stroke-width="1.8"/><circle cx="${x + .9}" cy="36.8" r="2.8" fill="${D}"/><circle cx="${x - .2}" cy="35.4" r="1.1" fill="#fff"/>`).join("");
  s += `<path d="M25 46 Q30 50.5 35 46" stroke="${D}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M27.6 47.3 L29.2 50.6 L30.8 47.9Z" fill="#fff" stroke="${D}" stroke-width="1"/>`;
  if (g.acc === "tongue") s += `<ellipse cx="33" cy="50" rx="2.4" ry="2.8" fill="#ff5d8f" stroke="${D}" stroke-width="1"/>`;
  if (g.acc === "glasses") s += `<circle cx="23" cy="36" r="7" fill="#ffffff22" stroke="${D}" stroke-width="2"/><circle cx="37" cy="36" r="7" fill="#ffffff22" stroke="${D}" stroke-width="2"/><path d="M30 35 h0.1" stroke="${D}" stroke-width="2"/><path d="M29.5 35.5 Q30 34 30.5 35.5" stroke="${D}" stroke-width="2" fill="none"/>`;
  if (g.acc === "tophat") s += `<circle cx="37" cy="36" r="7" fill="none" stroke="#d9a400" stroke-width="2"/><path d="M44 37 Q48 46 44 52" stroke="#d9a400" stroke-width="1" fill="none"/>`;
  if (!hat) {
    if (g.acc === "sprout") s += `<path d="M30 23 Q30 16 31 12" stroke="#4f8a3a" stroke-width="2" fill="none"/><path d="M31 14 Q38 8 42 12 Q36 17 31 14Z M30 16 Q23 10 19 14 Q25 19 30 16Z" fill="#7cc85a" stroke="${D}" stroke-width="1.4"/>`;
    if (g.acc === "tophat") s += `<rect x="22" y="6" width="16" height="15" rx="1" fill="#2b2533" stroke="${D}" stroke-width="2"/><rect x="22" y="15" width="16" height="3" fill="#ff8fb8"/><rect x="17" y="20" width="26" height="3.5" rx="1.5" fill="#2b2533" stroke="${D}" stroke-width="2"/>`;
    if (g.acc === "nightcap") s += `<path d="M14 28 Q18 10 34 14 Q48 18 54 34 Q46 26 44 28 Q30 20 14 28Z" fill="#9b8cff" stroke="${D}" stroke-width="2" stroke-linejoin="round"/><circle cx="54" cy="35" r="3.6" fill="#fff" stroke="${D}" stroke-width="1.6"/>`;
    if (g.acc === "visor") s += `<path d="M13 30 Q30 20 47 30" stroke="#3fbf8f" stroke-width="5" fill="none"/><path d="M18 28 Q30 34 42 28 Q30 38 18 28Z" fill="#3fbf8f" stroke="${D}" stroke-width="1.5"/><text x="26.5" y="27" font-size="6" fill="#fff" font-weight="900">$</text>`;
  }
  s += hatSVG(hat) + "</g>";
  return `<svg viewBox="0 0 60 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${s}</svg>`;
}
const face = id => gSVG(GM[id]);

// ---------- art: Seraphine ----------
function ladySVG() {
  const sk = "#f4c7a9", hr = "#7a1f3d";
  return `<svg class="lady" viewBox="0 0 200 270" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M40 92 Q28 18 100 16 Q172 18 162 94 Q182 150 166 212 Q156 246 122 236 L80 236 Q44 246 36 210 Q20 150 40 92Z" fill="${hr}" stroke="${D}" stroke-width="3"/>
  <path d="M28 270 Q32 186 100 172 Q168 186 172 270Z" fill="#1f1b24" stroke="${D}" stroke-width="3"/>
  <path d="M80 176 L100 222 L120 176Z" fill="#e0284e" stroke="${D}" stroke-width="2"/>
  <path d="M60 196 L84 186 L74 240 M140 196 L116 186 L126 240" stroke="#3a3442" stroke-width="3" fill="none"/>
  <rect x="88" y="132" width="24" height="44" fill="${sk}" stroke="${D}" stroke-width="2.5"/>
  <ellipse cx="100" cy="102" rx="39" ry="47" fill="${sk}" stroke="${D}" stroke-width="3"/>
  <circle cx="62" cy="116" r="8" fill="none" stroke="#ffcc33" stroke-width="3"/><circle cx="138" cy="116" r="8" fill="none" stroke="#ffcc33" stroke-width="3"/>
  <path d="M60 96 Q62 46 104 46 Q144 48 142 86 Q120 62 94 70 Q74 76 60 96Z" fill="${hr}" stroke="${D}" stroke-width="2.5"/>
  <path d="M60 92 Q50 140 64 182 Q76 150 70 108Z M140 92 Q152 140 138 182 Q126 150 130 108Z" fill="${hr}" stroke="${D}" stroke-width="2.5"/>
  <rect x="70" y="42" width="26" height="15" rx="7" fill="#1f1b24" stroke="${D}" stroke-width="2"/><rect x="104" y="42" width="26" height="15" rx="7" fill="#1f1b24" stroke="${D}" stroke-width="2"/><path d="M96 49 h8" stroke="${D}" stroke-width="3"/><path d="M75 46 l6 0" stroke="#ff8fb8" stroke-width="2"/><path d="M109 46 l6 0" stroke="#ff8fb8" stroke-width="2"/>
  <path d="M74 86 Q86 79 97 86" stroke="${D}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M104 86 Q115 79 126 86" stroke="${D}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M76 101 Q87 92 98 101 Q87 107 76 101Z" fill="#fff" stroke="${D}" stroke-width="1.5"/><circle cx="88" cy="101" r="4.6" fill="#5a2a1a"/><circle cx="89.5" cy="99.5" r="1.4" fill="#fff"/>
  <path d="M74 100 Q86 89 99 100 L104 95" stroke="${D}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M78 95 l-3 -4 M83 92 l-1 -5 M89 91 l0 -5" stroke="${D}" stroke-width="1.6"/>
  <path d="M104 101 Q114 108 124 101" stroke="${D}" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M124 101 L129 96 M120 104 l2 4 M114 106 l0 4" stroke="${D}" stroke-width="1.6"/>
  <ellipse cx="77" cy="118" rx="8" ry="4" fill="#ff7aa2" opacity=".45"/><ellipse cx="123" cy="118" rx="8" ry="4" fill="#ff7aa2" opacity=".45"/>
  <path d="M100 106 Q97 115 101 117" stroke="${D}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M89 127 Q95 123 100 126 Q105 123 111 127 Q101 138 89 127Z" fill="#e0284e" stroke="${D}" stroke-width="1.8"/><path d="M93 128 Q100 130 107 128" stroke="#ff9fb8" stroke-width="1.2" fill="none"/>
  <circle cx="114" cy="124" r="1.3" fill="${D}"/>
  <text x="20" y="40" font-size="20" fill="#ffcc33">✦</text><text x="166" y="60" font-size="16" fill="#ff8fb8">✦</text><text x="170" y="150" font-size="22" fill="#ffcc33">✦</text><text x="10" y="150" font-size="14" fill="#ff8fb8">✦</text>
  </svg>`;
}

// ---------- progress math ----------
const qs = id => (S.q[id] = S.q[id] || {s:[], d:false, n:""});
const isDone = id => !!(S.q[id] && S.q[id].d);
const stepsDone = q => (S.q[q.id] && S.q[q.id].s ? S.q[q.id].s.filter(Boolean).length : 0);
function xp() { let x = S.bx || 0; QUESTS.forEach(q => { x += stepsDone(q) * 10; if (isDone(q.id)) x += q.xp || 60; }); return x; }
function levelInfo() { const x = xp(); let lv = 1; LV.forEach((t, i) => { if (x >= t) lv = i + 1; }); return {x, lv, name:LV_NAMES[lv - 1], cur:LV[lv - 1], nxt:LV[lv] ?? null}; }
function chProg(ch) { const l = QUESTS.filter(q => q.ch === ch); return {d:l.filter(q => isDone(q.id)).length, t:l.length}; }
function mainProg() { const l = QUESTS.filter(q => q.ch <= 5); return l.filter(q => isDone(q.id)).length / l.length; }
function logDay(what) { const t = today(); S.days[t] = (S.days[t] || 0) + 1; if (what) { S.log.unshift({at:Date.now(), t:what}); S.log = S.log.slice(0, 60); } }
function earn(key, n) { if (key && S.got[key]) return 0; if (key) S.got[key] = 1; S.snk += n; S.snkEarned += n; return n; }
function streak() { let d = new Date(), n = 0; const k = x => S.days[iso(x)] || S.rest[iso(x)];
  if (!k(d)) d.setDate(d.getDate() - 1); while (k(d)) { n++; d.setDate(d.getDate() - 1); } return n; }

let lastLv = null;
function changed() { const li = levelInfo(); save();
  if (lastLv !== null && li.lv > lastLv) setTimeout(() => { SFX.lvl(); confetti(); toast(`⭐ LEVEL UP! You are now <b>${esc(li.name)}</b>`); }, 900);
  lastLv = li.lv; renderAll(); }

// ---------- UI basics ----------
function toast(h) { const e = document.createElement("div"); e.className = "toast"; e.innerHTML = h; const b = $("#toasts"); b.appendChild(e);
  while (b.children.length > 3) b.firstChild.remove(); setTimeout(() => { e.style.transition = "opacity .4s"; e.style.opacity = 0; setTimeout(() => e.remove(), 450); }, 3400); }
function openModal(h) { $("#modal").innerHTML = `<button class="btn white sm x" data-close aria-label="Close">✕</button>` + h; $("#scrim").classList.add("on"); $("#modal").scrollTop = 0; }
function closeModal() { $("#scrim").classList.remove("on"); }
$("#scrim").addEventListener("click", e => { if (e.target.id === "scrim" || e.target.closest("[data-close]")) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
async function copy(t) {
  try { await navigator.clipboard.writeText(t); toast("📋 Copied! Paste it into your texts."); return; } catch (e) {}
  const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = 0; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); toast("📋 Copied!"); } catch (e) { toast("Couldn't copy. Press and hold the text to copy it."); } ta.remove();
}
function go(v) { $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === v)); $$(".view").forEach(x => x.classList.toggle("on", x.id === "v-" + v));
  S.tab = v; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} window.scrollTo({top:0}); if (v === "quests" && S.q) S.met.quests = 1; }
$$(".tab").forEach(t => t.addEventListener("click", () => { SFX.tap(); go(t.dataset.v); peekTab(t.dataset.v); }));
function peekTab(v) { if (!S.met["tab_" + v]) { S.met["tab_" + v] = 1; save(); }
  if (["home", "quests", "colleges", "bank", "help", "den"].every(x => S.met["tab_" + x])) autoStep("q0a", 1); }
function autoStep(id, i) { const s = qs(id); if (!s.s[i]) setStep(id, i, true, true); }

// ---------- header ----------
function renderTop() { const li = levelInfo();
  $("#hello").textContent = `Hi, ${S.name || "Kyla Bug"} 💖`;
  $("#lvl").textContent = `Lv ${li.lv} · ${li.name}`;
  $("#xpbar").style.width = (li.nxt ? Math.min(100, (li.x - li.cur) / (li.nxt - li.cur) * 100) : 100) + "%";
  $("#snacks").textContent = `🍪 ${S.snk}`;
  document.body.classList.toggle("calm", !!S.calm);
  const dlAlert = urgentColleges().length > 0; const tq = $('.tab[data-v="colleges"]'); tq.querySelector(".dot")?.remove(); if (dlAlert) tq.insertAdjacentHTML("beforeend", '<span class="dot"></span>');
}

// ---------- scene ----------
function sceneSVG() {
  const h = new Date().getHours(), night = h >= 20 || h < 6, dusk = h >= 17 && h < 20, dawn = h >= 6 && h < 8;
  const sky = night ? ["#2b2350", "#5b4a8a"] : dusk ? ["#ff9fb8", "#ffd59e"] : dawn ? ["#ffd1dc", "#ffe9c9"] : ["#8fcaff", "#e3f4ff"];
  const far = night ? "#4a3c78" : "#c9b8f0", mid = night ? "#2f5a55" : "#a8e6c9", fg = night ? "#3c6e5f" : "#8fd6b3";
  const lit = night || dusk;
  let o = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="400" height="230" fill="url(#sk)"/>`;
  if (night) { for (let i = 0; i < 26; i++) o += `<circle cx="${(i * 73) % 400}" cy="${(i * 37) % 90 + 5}" r="${i % 3 ? .8 : 1.4}" fill="#fff" opacity=".8"/>`; o += `<circle cx="60" cy="38" r="14" fill="#fff6d6"/><circle cx="66" cy="34" r="12" fill="${sky[0]}"/>`; }
  else o += `<circle cx="60" cy="40" r="17" fill="#fff3a6" stroke="#ffd23f" stroke-width="3"/>` + `<g fill="#fff" opacity=".9"><ellipse cx="150" cy="40" rx="22" ry="8"/><ellipse cx="165" cy="34" rx="14" ry="9"/><ellipse cx="300" cy="28" rx="18" ry="6"/><ellipse cx="312" cy="23" rx="11" ry="7"/></g>`;
  o += `<path d="M0 120 Q100 72 200 92 Q280 58 400 100 L400 230 L0 230Z" fill="${far}"/>`;
  // the college on the hill
  const p = mainProg(), committed = S.colleges.find(c => c.committed), s2 = chProg(6).d > 0;
  const stage = s2 ? 4 : committed ? 3 : p >= .4 ? 2 : p >= .12 ? 1 : 0;
  const cx = 292, cy = 74;
  if (stage === 0) o += `<g opacity=".95"><ellipse cx="${cx}" cy="${cy - 6}" rx="30" ry="14" fill="#fff"/><ellipse cx="${cx + 18}" cy="${cy - 14}" rx="16" ry="11" fill="#fff"/><ellipse cx="${cx - 16}" cy="${cy - 12}" rx="14" ry="10" fill="#fff"/><text x="${cx - 5}" y="${cy - 3}" font-family="Mochiy Pop One" font-size="16" fill="#b8a1ff">?</text></g>`;
  else {
    const wall = stage === 1 ? "#9a8fb0" : "#fff3e6", roof = stage === 1 ? "#7d7296" : "#ff8fb8", win = stage === 1 ? "#7d7296" : lit ? "#ffe066" : "#9fd4ff";
    o += `<g stroke="${D}" stroke-width="${stage === 1 ? 0 : 1.5}"><rect x="${cx - 26}" y="${cy - 16}" width="52" height="22" fill="${wall}"/><path d="M${cx - 30} ${cy - 16} L${cx} ${cy - 30} L${cx + 30} ${cy - 16}Z" fill="${roof}"/><rect x="${cx - 6}" y="${cy - 46}" width="12" height="20" fill="${wall}"/><path d="M${cx - 8} ${cy - 46} L${cx} ${cy - 56} L${cx + 8} ${cy - 46}Z" fill="${roof}"/>`;
    [-18, -8, 2, 12].forEach(x => o += `<rect x="${cx + x}" y="${cy - 10}" width="6" height="8" fill="${win}"/>`); o += `<circle cx="${cx}" cy="${cy - 38}" r="3" fill="${win}"/></g>`;
    if (stage >= 2) o += `<path d="M${cx} ${cy - 56} V${cy - 70}" stroke="${D}" stroke-width="1.5"/><path d="M${cx} ${cy - 70} L${cx + 12} ${cy - 66} L${cx} ${cy - 62}Z" fill="#ff5d8f" stroke="${D}" stroke-width="1"/>`;
    if (stage >= 3) { const nm = (committed?.name || "MY SCHOOL").toUpperCase().slice(0, 18);
      o += `<rect x="${cx - 46}" y="${cy + 8}" width="92" height="13" rx="3" fill="#ffe066" stroke="${D}" stroke-width="1.5"/><text x="${cx}" y="${cy + 17.5}" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="8" fill="${D}">${esc(nm)}</text>`;
      o += `<text x="${cx - 44}" y="${cy - 30}" font-size="10" fill="#ffe066">✦</text><text x="${cx + 34}" y="${cy - 38}" font-size="12" fill="#ff8fb8">✦</text>`; }
    if (stage === 4) o += `<g fill="none" stroke-width="2"><circle cx="${cx - 50}" cy="${cy - 44}" r="10" stroke="#ff8fb8" stroke-dasharray="3 3"/><circle cx="${cx + 52}" cy="${cy - 50}" r="12" stroke="#7fd8be" stroke-dasharray="3 3"/></g><text x="${cx + 34}" y="${cy - 8}" font-family="Mochiy Pop One" font-size="10" fill="${D}">S2</text>`;
  }
  o += `<path d="M200 232 Q160 196 222 168 Q286 140 286 ${cy + 8}" stroke="#f6e3c4" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>`;
  o += `<path d="M0 162 Q120 124 220 152 Q320 176 400 142 L400 230 L0 230Z" fill="${mid}"/>`;
  const house = (x, y, c, r) => `<g stroke="${D}" stroke-width="1.6"><rect x="${x}" y="${y}" width="30" height="24" fill="${c}"/><path d="M${x - 4} ${y} L${x + 15} ${y - 15} L${x + 34} ${y}Z" fill="${r}"/><rect x="${x + 5}" y="${y + 6}" width="8" height="7" fill="${lit ? "#ffe066" : "#d7efff"}"/><rect x="${x + 18}" y="${y + 10}" width="7" height="14" fill="#c98b5e"/></g>`;
  o += house(26, 138, "#ffd6e6", "#b8a1ff") + house(82, 128, "#fff3c2", "#ff8fb8") + house(336, 128, "#d5f7ec", "#ffb370");
  const tree = (x, y, sc = 1) => `<g transform="translate(${x} ${y}) scale(${sc})"><rect x="-3" y="0" width="6" height="22" fill="#8a5a44" stroke="${D}" stroke-width="1.4"/><g fill="#ffb3d1" stroke="${D}" stroke-width="1.4"><circle cx="-11" cy="-2" r="11"/><circle cx="11" cy="-2" r="11"/><circle cx="0" cy="-12" r="13"/></g><g fill="#fff" opacity=".7"><circle cx="-6" cy="-10" r="1.6"/><circle cx="7" cy="-4" r="1.4"/><circle cx="2" cy="-18" r="1.4"/></g></g>`;
  o += tree(150, 140) + tree(390, 132, .9) + tree(8, 150, .8);
  o += `<path d="M0 196 Q200 180 400 196 L400 230 L0 230Z" fill="${fg}"/>`;
  o += `<g transform="translate(8 198)"><rect x="8" y="10" width="4" height="16" fill="#8a5a44"/><rect x="0" y="0" width="74" height="14" rx="3" fill="#ffe7c2" stroke="${D}" stroke-width="1.4"/><text x="37" y="10" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="7.5" fill="${D}">${esc((S.name || "Kyla Bug").slice(0, 14))}'s Town</text></g>`;
  const pos = [[100, 214], [150, 206], [196, 216], [246, 208], [298, 216], [352, 210]];
  GREMS.forEach((g, i) => { const [x, y] = pos[i];
    o += `<g class="gr" data-g="${g.id}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(g.name)}"><g class="bob" style="animation-delay:-${i * .37}s"><svg x="-20" y="-42" width="40" height="43" viewBox="0 0 60 64">${gSVG(g).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</svg></g></g>`; });
  return o;
}
function renderScene() { const sc = $("#scene"); sc.innerHTML = sceneSVG();
  sc.querySelectorAll(".gr").forEach(el => { const f = () => { SFX.tap(); const id = el.dataset.g; say(id, gLine(id)); S.met["g_" + id] = 1;
      if (GREMS.every(g => S.met["g_" + g.id])) autoStep("q0a", 0); save(); };
    el.addEventListener("click", f); el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }); }); }
function gLine(id) { const g = GM[id], fd = (S.fandom || "").trim();
  const extra = fd ? {crumbs:[`I've started a ${fd} AU of your life. You're the strongest character. Obviously.`], pickle:[`I'm cosplaying as someone from ${fd}. (it's a paper bag. it's a good paper bag)`], gub:[`gub. (gub likes ${fd} too)`]}[id] || [] : [];
  return pick(g.lines.concat(extra)); }
function say(id, t) { $("#sayFace").innerHTML = face(id); $("#sayWho").textContent = GM[id].name; $("#sayTxt").textContent = t; }
function contextSay() { const h = new Date().getHours(), uc = urgentColleges();
  const lastActive = Object.keys(S.days).sort().pop(), gap = lastActive ? Math.floor((new Date(today()) - new Date(lastActive)) / 864e5) : 0;
  if (h >= 23 || h < 5) return say("moth", "it's late. sleep is a quest too. the forms will still be here tomorrow. 🌙");
  if (gap >= 3) return say("moth", "welcome back. no guilt, okay? we missed you. one tiny thing and we're back in it. 💜");
  if (uc.length) return say("gnorbert", `${uc[0].name} is due in ${uc[0].dl} day${uc[0].dl === 1 ? "" : "s"}. I'm wearing my Serious Hat. We're doing a step today.`);
  if (!isDone("q3c") && [9, 10, 11, 0, 1, 2].includes(new Date().getMonth()) && Math.random() < .5) return say("gnorbert", "The FAFSA is open. It's free money and some of it runs out. We are doing it. Sooner, not later.");
  const g = pick(GREMS); say(g.id, gLine(g.id)); }

// ---------- today's tiny thing ----------
function candidates() {
  const order = []; const add = q => { if (q && !isDone(q.id) && !order.includes(q)) order.push(q); };
  QUESTS.filter(q => q.ch === 0).forEach(add);
  QUESTS.filter(q => q.urgent).forEach(add);
  QUESTS.filter(q => q.ch >= 1 && q.ch <= 6).forEach(add);
  QUESTS.filter(q => q.ch === 7).forEach(add);
  return order;
}
function tinyNow() { const c = candidates(); if (!c.length) return null; const q = c[(S.skip || 0) % Math.min(c.length, 6)];
  const s = qs(q.id); const i = q.steps.findIndex((_, k) => !s.s[k]); return {q, i: i < 0 ? 0 : i}; }
function renderTiny() { const t = tinyNow(), box = $("#tinyCard");
  if (!t) { box.innerHTML = `<h3 style="margin-top:0">🏆 Every quest is done.</h3><p>You beat the game. Go touch grass. Then tell Bailey. 💖</p>`; return; }
  const {q, i} = t, st = q.steps[i], ch = CHAPTERS[q.ch], par = isParent(st);
  box.innerHTML = `<div class="row sp"><span class="chip p">${ch.e} ${esc(ch.n)}</span><span class="chip s">+10 XP · +2 🍪</span></div>
   <div class="muted fr" style="margin-top:6px">${q.e} ${esc(q.t)} · step ${i + 1} of ${q.steps.length}</div>
   <div class="step">${esc(st.replace(/^👪\s*/, ""))} ${par ? '<span class="parent">👪 grown-up</span>' : ""}</div>
   <div class="row"><button class="btn mint big" id="tDid" style="flex:1">✓ Did it!</button></div>
   <div class="row" style="margin-top:8px"><button class="btn white sm" id="tSmall">🤏 Smaller please</button><button class="btn white sm" id="tSkip">⏭ A different one</button><button class="btn white sm" id="tOpen">📖 Open quest</button>${par ? '<button class="btn sun sm" id="tPar">📋 What do I text them?</button>' : ""}</div>`;
  $("#tDid").onclick = () => setStep(q.id, i, true);
  $("#tSmall").onclick = () => smaller(q, i);
  $("#tSkip").onclick = () => { S.skip = (S.skip || 0) + 1; SFX.tap(); save(); renderTiny(); say("pickle", pick(["ooh new one", "skipping is allowed. we'll come back for that one.", "SHUFFLE!!"])); };
  $("#tOpen").onclick = () => openQuest(q.id);
  if (par) $("#tPar").onclick = () => { go("help"); };
}
function smaller(q, i) { const m = pick(SMALLER);
  openModal(`<h2>🤏 Smaller version</h2><div class="say"><div class="face">${face("moth")}</div><div class="bub"><b class="who">Moth</b>${esc(m)}</div></div>
   <p class="muted">The real step: <b>${esc(q.steps[i].replace(/^👪\s*/, ""))}</b></p>
   <div class="foot"><button class="btn white" id="smOther">Another tiny version</button><button class="btn mint" id="smDid">I did the tiny version (+2 🍪)</button></div>`);
  $("#smOther").onclick = () => smaller(q, i);
  $("#smDid").onclick = () => { const k = "tiny_" + today(); const got = earn(k + "_" + q.id, 2); logDay("tiny: " + q.t); closeModal(); SFX.step();
    toast(got ? "+2 🍪 Tiny steps count. Moth says so." : "Tiny steps count! (Snacks already given for this one today.)"); say("moth", "see? you did a thing. that's the whole secret."); changed(); };
}

// ---------- alerts ----------
function urgentColleges() { return S.colleges.filter(c => c.deadline && !c.applied && c.result !== "denied").map(c => ({...c, dl:daysUntil(c.deadline)})).filter(c => c.dl !== null && c.dl >= 0 && c.dl <= 14).sort((a, b) => a.dl - b.dl); }
function renderAlerts() { const uc = urgentColleges(); let h = "";
  if (uc.length) h += `<div class="card alert soft"><div class="say"><div class="face">${gSVG(GM.gnorbert, {hat:"pirate"})}</div><div class="bub"><b class="who">Gnorbert (Serious Hat ON)</b>${uc.map(c => `<b>${esc(c.name)}</b> is due in <b>${c.dl} day${c.dl === 1 ? "" : "s"}</b>.`).join("<br>")}<br>Not panicking. Scheduling. Open its card and do the next step.</div></div></div>`;
  const past = S.colleges.filter(c => c.deadline && !c.applied && c.result !== "denied" && daysUntil(c.deadline) < 0);
  if (past.length) h += `<div class="card soft" style="margin-top:12px"><div class="say"><div class="face">${face("moth")}</div><div class="bub"><b class="who">Moth</b>${past.map(c => esc(c.name)).join(", ")} ${past.length > 1 ? "have" : "has"} a deadline that passed. That's okay. Many schools still take late or rolling applications. Check their site or call admissions, or mark the card so we stop worrying about it. 💜</div></div></div>`;
  $("#alertBox").innerHTML = h; }
function renderDays() { const out = []; const d = new Date(); d.setDate(d.getDate() - 6);
  for (let i = 0; i < 7; i++) { const k = iso(d); out.push(`<span class="${S.days[k] ? "y" : S.rest[k] ? "r" : ""} ${k === today() ? "t" : ""}" title="${k}">${"SMTWTFS"[d.getDay()]}<br>${S.days[k] ? "✓" : S.rest[k] ? "💤" : "·"}</span>`); d.setDate(d.getDate() + 1); }
  $("#days").innerHTML = out.join(""); const s = streak(); $("#streak").textContent = s ? `🔥 ${s}-day streak` : "🔥 start a streak!"; $("#streak").title = "Rest days count toward your streak."; }
function renderHome() { renderScene(); renderTiny(); renderAlerts(); renderDays(); if (!$("#sayTxt").textContent) contextSay(); }

$("#loudBtn").onclick = () => {
  openModal(`<h2>🫠 Brain too loud?</h2><div class="say"><div class="face">${face("moth")}</div><div class="bub"><b class="who">Moth</b>okay. that's real. let's make it smaller. pick one:</div></div>
  <div class="stack" style="margin-top:14px;gap:10px">
   <button class="btn mint big" id="l1">🤏 Give me ONE tiny thing</button>
   <button class="btn lav big" id="l2">🫂 Sit with me for 5 minutes (body double)</button>
   <button class="btn white big" id="l3">💤 Not today. Rest day.</button></div>
  <div class="tip" style="margin-top:14px">Quick reset: breathe in for 4… hold for 4… out for 6. Twice. Drink some water. Then pick one.</div>`);
  $("#l1").onclick = () => { const t = tinyNow(); if (t) smaller(t.q, t.i); else closeModal(); };
  $("#l2").onclick = () => startFocus(5, "just sitting with Moth");
  $("#l3").onclick = () => { S.rest[today()] = true; save(); closeModal(); renderDays(); say("moth", "rest is a real thing. it counts toward your streak. 💤");
    setTimeout(() => toast(`${'<span style="display:inline-block;width:26px;vertical-align:middle">' + face("gnorbert") + "</span>"} Gnorbert: "Tomorrow though. I wrote it down. In pen."`), 1400); };
};
$("#focusBtn").onclick = () => focusPicker();

// ---------- quests ----------
function setStep(id, i, val, quiet) { const q = QM[id], s = qs(id); s.s[i] = val;
  if (val) { logDay(q.steps[i]); const got = earn(id + ":" + i, 2); SFX.step();
    if (!quiet) toast(got ? `✓ +10 XP · +2 🍪 ${pick(["nice", "LET'S GO", "W", "huge", "main character behavior", "gremlins are cheering"])}` : "✓ nice");
    if (q.steps.every((_, k) => s.s[k]) && !s.d) { completeQuest(id); return; }
  } else if (s.d) s.d = false;
  if (!quiet && val && Math.random() < .25) setTimeout(() => miniHop(), 200);
  changed(); }
function completeQuest(id) { const q = QM[id], s = qs(id); s.d = true; s.at = today(); q.steps.forEach((_, k) => s.s[k] = true);
  earn(id + ":done", 8); S.log.unshift({at:Date.now(), t:q.t, quest:1}); logDay();
  const cp = chProg(q.ch), chDone = cp.d === cp.t;
  changed(); closeModal(); SFX.done();
  setTimeout(() => { doTrick(chDone ? "best" : null); toast(`🏆 Quest complete: <b>${esc(q.t)}</b> · +${q.xp || 60} XP · +8 🍪`); if (chDone) { confetti(); setTimeout(() => toast(`🎉 <b>${esc(CHAPTERS[q.ch].n)}</b> CLEARED. Sir Crumbs is writing a whole fic about it.`), 1600); } }, 250);
  maybeHot(chDone ? .9 : .3, 4500);
}
function renderQuests() { const cur = (() => { for (let c = 0; c <= 6; c++) { const p = chProg(c); if (p.d < p.t) return c; } return 6; })();
  $("#questList").innerHTML = CHAPTERS.map((c, ci) => { const p = chProg(ci), list = QUESTS.filter(q => q.ch === ci);
    return `<details class="ch" ${ci === cur || (ci === 3 && !isDone("q3c")) ? "open" : ""}><summary><span class="che">${c.e}</span><div style="flex:1"><div class="fr" style="font-size:18px;line-height:1.2">${esc(c.n)} ${p.d === p.t ? "✅" : ""}</div><div class="muted small" style="font-weight:700">${esc(c.when)} · ${p.d}/${p.t} quests</div><div class="chbar"><i style="width:${p.d / p.t * 100}%"></i></div></div></summary>
    <p class="muted small" style="margin:8px 14px 0;font-weight:700">${esc(c.blurb)}</p><ul class="ql">${list.map(q => { const n = stepsDone(q), d = isDone(q.id), par = q.steps.some(isParent);
      return `<li class="qi ${d ? "done" : ""}" data-q="${q.id}" tabindex="0"><span class="ck">${d ? "✓" : q.e}</span><span class="qt">${esc(q.t)}<div class="qm">${d ? "Done " + esc(s_at(q.id)) : `${n}/${q.steps.length} steps · +${q.xp || 60} XP`}${q.urgent && !d ? ' · <span style="color:#d6284a">⏰ do soon</span>' : ""}${par ? " · 👪" : ""}</div></span></li>`; }).join("")}</ul></details>`; }).join("");
  $$("#questList .qi").forEach(el => { el.onclick = () => openQuest(el.dataset.q); el.onkeydown = e => { if (e.key === "Enter") openQuest(el.dataset.q); }; });
}
const s_at = id => (S.q[id] && S.q[id].at) || "";
function openQuest(id) { const q = QM[id], s = qs(id), ch = CHAPTERS[q.ch];
  const stateBtn = q.state ? `<div class="tip">${S.state && !S.state.startsWith("Other") ? `<a class="btn sun sm" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent(S.state + " state grant for college students deadline")}">🔎 Look up ${esc(S.state)}'s college grant</a>` : `Set your state in ⚙️ Settings and a search button shows up here. Or search "<b>[your state] state grant for college</b>".`}</div>` : "";
  openModal(`<div class="muted fr">${ch.e} ${esc(ch.n)}</div><h2>${q.e} ${esc(q.t)}</h2>
   ${q.why ? `<div class="why">${esc(q.why)}</div>` : ""}
   <ul class="steps" id="qSteps">${q.steps.map((st, i) => `<li class="${s.s[i] ? "on" : ""}" data-i="${i}" tabindex="0"><span class="b">${s.s[i] ? "✓" : ""}</span><span style="flex:1">${esc(st.replace(/^👪\s*/, ""))} ${isParent(st) ? '<span class="parent">👪 grown-up</span>' : ""}</span></li>`).join("")}</ul>
   ${q.steps.some(isParent) ? `<p class="small muted" style="margin:0">👪 steps need a parent or adult. <a href="#" id="qHelp">Get the exact text to send them →</a></p>` : ""}
   ${q.tip ? `<div class="tip">💡 ${esc(q.tip)}</div>` : ""}${stateBtn}
   ${q.links ? `<div class="row" style="margin:8px 0">${q.links.map(([l, u]) => `<a class="btn white sm" target="_blank" rel="noopener" href="${u}">🔗 ${esc(l)}</a>`).join("")}</div>` : ""}
   <label class="f" for="qn">Your notes</label><textarea id="qn" rows="3" placeholder="Anything: what the counselor said, deadlines, 'ugh'…">${esc(s.n || "")}</textarea>
   <div class="foot"><span class="muted small">${s.d ? "Completed " + esc(s.at || "") : `+${q.xp || 60} XP when it's all done`}</span>${s.d ? `<button class="btn white sm" id="qUndo">Mark not done</button>` : `<button class="btn mint" id="qAll">Mark whole quest done</button>`}</div>`);
  $$("#qSteps li").forEach(li => { const f = () => { const i = +li.dataset.i, v = !qs(id).s[i]; setStep(id, i, v); if ($("#scrim").classList.contains("on") && !isDone(id)) openQuest(id); };
    li.onclick = f; li.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f(); } }; });
  $("#qn").oninput = e => { qs(id).n = e.target.value; save(); };
  if ($("#qHelp")) $("#qHelp").onclick = e => { e.preventDefault(); closeModal(); go("help"); };
  if ($("#qAll")) $("#qAll").onclick = () => completeQuest(id);
  if ($("#qUndo")) $("#qUndo").onclick = () => { s.d = false; changed(); openQuest(id); };
}

// ---------- college cards ----------
const RAR = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
function rarity(c) { if (c.committed) return 5; if (c.result === "accepted") return 4; if (c.applied) return 3; if (c.tour && c.tour !== "no") return 2; if (c.npc || c.deadline) return 1; return 0; }
const KIND = {pub:["🏛️", "4-year public"], priv:["🏰", "4-year private"], cc:["🏫", "Community college"], trade:["🔧", "Trade / other"]};
function initials(n) { const w = String(n).replace(/\b(of|the|and|at|university|college|community|state)\b/gi, " ").trim().split(/\s+/).filter(Boolean); return ((w[0] || n || "?")[0] + (w[1] ? w[1][0] : "")).toUpperCase(); }
function renderColleges() {
  const list = S.colleges.slice().sort((a, b) => rarity(b) - rarity(a));
  $("#cardGrid").innerHTML = list.map(c => { const r = rarity(c), dl = daysUntil(c.deadline), k = KIND[c.kind] || KIND.pub;
    const stamp = c.committed ? "MINE ✨" : c.result === "denied" ? "THEIR LOSS" : c.result === "waitlisted" ? "WAITLIST" : c.result === "deferred" ? "DEFERRED" : "";
    return `<div class="cc ${RAR[r]} ${c.result === "denied" ? "denied" : ""}" data-c="${c.id}" tabindex="0" role="button"><span class="rar">${"★".repeat(r + 1)} ${RAR[r]}</span>
     <div class="art">${esc(initials(c.name))}<span style="position:absolute;right:8px;bottom:4px;font-size:22px">${k[0]}</span></div>${stamp ? `<span class="stamp">${stamp}</span>` : ""}
     <div class="nm">${esc(c.name)}</div><div class="loc">${esc(c.loc || k[1])}</div>${c.vibe ? `<div class="hearts">${"♥".repeat(c.vibe)}${"♡".repeat(5 - c.vibe)}</div>` : ""}
     <div class="badges">${c.deadline && !c.applied ? `<span class="chip ${dl !== null && dl <= 14 && dl >= 0 ? "r" : ""}">⏰ ${dl < 0 ? "deadline passed" : dl === 0 ? "due TODAY" : dl + " days"}</span>` : ""}${c.npc ? `<span class="chip m">🧮 ~${money(num(c.npc))}/yr</span>` : ""}${c.tour && c.tour !== "no" ? `<span class="chip">🚌 toured</span>` : ""}${c.applied ? `<span class="chip p">🚀 applied</span>` : ""}${c.result === "accepted" ? `<span class="chip s">🎉 accepted</span>` : ""}</div></div>`; }).join("")
    + `<div class="cc add" id="addCard" tabindex="0" role="button"><div style="font-size:40px">🃏</div>＋ Pull a new card</div>`;
  $$("#cardGrid .cc[data-c]").forEach(el => { el.onclick = () => openCollege(el.dataset.c); el.onkeydown = e => { if (e.key === "Enter") openCollege(el.dataset.c); }; });
  $("#addCard").onclick = () => openCollege(null);
}
$("#addCol").onclick = () => openCollege(null);
function openCollege(id) {
  const c = id ? S.colleges.find(x => x.id === id) : {id:uid(), name:"", loc:"", kind:"pub", how:"Common App", deadline:"", fee:"", waiver:false, test:"Not sure", npc:"", tour:"no", applied:false, result:"", coa:"", grants:"", loans:"", ws:"", committed:false, vibe:0, notes:""};
  const sel = (n, opts, v) => `<select id="c_${n}">${opts.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}</select>`;
  openModal(`<h2>${id ? "🃏 " + esc(c.name) : "🃏 New College Card"}</h2>
  <div class="f2"><label class="f full">College name<input id="c_name" value="${esc(c.name)}" placeholder="e.g. State University" required></label>
   <label class="f">City, state<input id="c_loc" value="${esc(c.loc)}" placeholder="Somewhere, USA"></label>
   <label class="f">Type${sel("kind", Object.entries(KIND).map(([k, v]) => [k, v[0] + " " + v[1]]), c.kind)}</label>
   <label class="f">Vibe (how much do you like it?)<select id="c_vibe">${[0, 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${+c.vibe === n ? "selected" : ""}>${n ? "♥".repeat(n) : "not sure yet"}</option>`).join("")}</select></label>
   <label class="f">Toured?${sel("tour", [["no", "Not yet"], ["virtual", "Virtual tour"], ["person", "In person!"]], c.tour)}</label></div>
  <h3>📝 Applying</h3><div class="f2">
   <label class="f">How you apply${sel("how", ["Common App", "School's own website", "Other / not sure"], c.how)}</label>
   <label class="f">Application deadline<input type="date" id="c_deadline" value="${esc(c.deadline)}"></label>
   <label class="f">App fee ($)<input id="c_fee" inputmode="decimal" value="${esc(c.fee)}" placeholder="0"></label>
   <label class="f">SAT/ACT${sel("test", ["Not sure", "Required", "Optional", "Not used"], c.test)}</label>
   <label class="f full" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="c_waiver" style="width:auto" ${c.waiver ? "checked" : ""}> I'm using a fee waiver</label>
   <label class="f full" style="display:flex;gap:8px;align-items:center;font-size:17px"><input type="checkbox" id="c_applied" style="width:auto" ${c.applied ? "checked" : ""}> 🚀 I APPLIED</label>
   <label class="f">Decision${sel("result", [["", "Waiting / not yet"], ["accepted", "🎉 Accepted"], ["waitlisted", "Waitlisted"], ["deferred", "Deferred"], ["denied", "Denied (their loss)"]], c.result)}</label></div>
  <h3>💰 Money</h3><p class="muted small" style="margin:0">Net price = what you'd pay after free grant money. Get the estimate from the college's Net Price Calculator. The rest comes from your aid offer later.</p><div class="f2">
   <label class="f full">Net Price Calculator estimate ($/year)<input id="c_npc" inputmode="decimal" value="${esc(c.npc)}" placeholder="from their website"></label>
   <label class="f">Cost of attendance ($/yr)<input id="c_coa" inputmode="decimal" value="${esc(c.coa)}"></label>
   <label class="f">Grants + scholarships (free $)<input id="c_grants" inputmode="decimal" value="${esc(c.grants)}"></label>
   <label class="f">Loans offered<input id="c_loans" inputmode="decimal" value="${esc(c.loans)}"></label>
   <label class="f">Work-study<input id="c_ws" inputmode="decimal" value="${esc(c.ws)}"></label></div>
  <label class="f" style="display:flex;gap:8px;align-items:center;font-size:17px;margin-top:14px"><input type="checkbox" id="c_committed" style="width:auto" ${c.committed ? "checked" : ""}> 👑 THIS IS MY SCHOOL (committed)</label>
  <label class="f" for="c_notes">Notes</label><textarea id="c_notes" rows="3" placeholder="Vibes, questions, what the tour guide said…">${esc(c.notes)}</textarea>
  <div class="foot">${id ? `<button class="btn white sm" id="cDel">🗑 Delete card</button>` : "<span></span>"}<button class="btn mint" id="cSave">Save card</button></div>`);
  $("#cSave").onclick = () => { const v = n => $("#c_" + n).value.trim(); const name = v("name"); if (!name) { toast("Give it a name first!"); return; }
    const before = id ? rarity(c) : -1, wasCommitted = !!c.committed;
    Object.assign(c, {name, loc:v("loc"), kind:v("kind"), vibe:+v("vibe"), tour:v("tour"), how:v("how"), deadline:v("deadline"), fee:v("fee"), test:v("test"),
      waiver:$("#c_waiver").checked, applied:$("#c_applied").checked, result:v("result"), npc:v("npc"), coa:v("coa"), grants:v("grants"), loans:v("loans"), ws:v("ws"),
      committed:$("#c_committed").checked, notes:$("#c_notes").value});
    if (c.applied && !c.appliedAt) c.appliedAt = today();
    if (c.committed) S.colleges.forEach(x => { if (x !== c) x.committed = false; });
    if (!id) { S.colleges.push(c); autoStep("q0d", 0); autoStep("q0d", 1); }
    const after = rarity(c); closeModal(); logDay("card: " + c.name);
    if (after > before && before >= 0 || (!id && after > 0)) { const got = earn("card:" + c.id + ":" + after, 5); setTimeout(() => { doTrick(after >= 4 ? "best" : null); toast(`✨ Card evolved → <b>${RAR[after].toUpperCase()}</b>!${got ? " +5 🍪" : ""}`); }, 200); }
    else if (!id) { earn("card:" + c.id + ":0", 3); toast(`🃏 New card: <b>${esc(c.name)}</b> +3 🍪`); SFX.step(); }
    if (c.committed && !wasCommitted) { setTimeout(() => { confetti(); SFX.lvl(); toast(`👑 <b>${esc(c.name)}</b> is YOUR school. Look at the hill on the Home screen. 🏰`); }, 900); setTimeout(() => showHot(true, "I heard you picked a school. Cute AND decisive? Stop it. 😘"), 6000); }
    changed(); };
  if ($("#cDel")) $("#cDel").onclick = () => { if (!confirm(`Delete the ${c.name} card? This can't be undone.`)) return; S.colleges = S.colleges.filter(x => x !== c); closeModal(); changed(); };
}
$("#cmpBtn").onclick = () => { const L = S.colleges.filter(c => num(c.coa) || num(c.npc) || c.result === "accepted");
  if (!L.length) { openModal(`<h2>⚖️ Compare money</h2><p>Nothing to compare yet. Add a Net Price Calculator estimate or an aid offer to a College Card and it'll show up here.</p>`); return; }
  openModal(`<h2>⚖️ Compare money</h2><div class="say"><div class="face">${face("beans")}</div><div class="bub"><b class="who">Beans</b>Grants are free money. Loans are NOT free. You pay them back with interest. Look at "you'd still owe" and "after loans".</div></div>
  <div class="tbl" style="margin-top:12px"><table class="cmp"><tr><th>School</th><th>Net price est.</th><th>Cost/yr</th><th>Free $</th><th>You'd still owe</th><th>Loans</th><th>Work-study</th><th>Gap after loans</th></tr>
  ${L.map(c => { const coa = num(c.coa), g = num(c.grants), owe = coa ? Math.max(0, coa - g) : 0, gap = coa ? Math.max(0, owe - num(c.loans) - num(c.ws)) : 0;
    return `<tr><td><b>${esc(c.name)}</b>${c.committed ? " 👑" : ""}</td><td>${c.npc ? money(num(c.npc)) : "—"}</td><td>${coa ? money(coa) : "—"}</td><td>${g ? money(g) : "—"}</td><td><b>${coa ? money(owe) : "—"}</b></td><td>${c.loans ? money(num(c.loans)) : "—"}</td><td>${c.ws ? money(num(c.ws)) : "—"}</td><td>${coa ? money(gap) : "—"}</td></tr>`; }).join("")}</table></div>
  <p class="muted small">"Gap after loans" is what you and your family would still need to cover each year. If it's big, that's a reason to ask the school for more aid (the quest 'Ask for more aid' in Arc 4), not a reason to panic.</p>`); };

// ---------- bean bank ----------
let viewMonth = today().slice(0, 7);
const jarById = id => S.jars.find(j => j.id === id);
function jarBal(id) { let b = 0; S.tx.forEach(t => { if (t.type === "pay") b += num(t.split && t.split[id]); else if (t.type === "spend" && t.jar === id) b -= num(t.amt); else if (t.type === "move") { if (t.from === id) b -= num(t.amt); if (t.to === id) b += num(t.amt); } }); return Math.round(b * 100) / 100; }
function monthly() { const r = num(S.job.rate), h = num(S.job.hours); const gross = r * h * 52 / 12; return {week:r * h, gross, take:gross * .9}; }
function jarSVG(j, bal) { const max = j.goal ? j.goal : Math.max(100, ...S.jars.filter(x => !x.goal).map(x => jarBal(x.id))); const f = Math.max(0, Math.min(1, bal / (max || 1)));
  const top = 30 + (1 - f) * 92;
  return `<svg viewBox="0 0 100 140" aria-hidden="true"><defs><clipPath id="jc_${j.id}"><path d="M20 30 Q14 32 14 44 L14 120 Q14 132 26 132 L74 132 Q86 132 86 120 L86 44 Q86 32 80 30Z"/></clipPath></defs>
   <rect x="22" y="12" width="56" height="16" rx="4" fill="#c9a27a" stroke="${D}" stroke-width="2.5"/>
   <path d="M20 30 Q14 32 14 44 L14 120 Q14 132 26 132 L74 132 Q86 132 86 120 L86 44 Q86 32 80 30Z" fill="#ffffffcc"/>
   <g clip-path="url(#jc_${j.id})"><rect x="0" y="${top}" width="100" height="140" fill="${j.col}"/>${f > 0 ? [0, 1, 2, 3, 4].map(i => `<circle cx="${24 + i * 13}" cy="${top + 4 + (i % 2) * 3}" r="5" fill="${j.col}" stroke="${D}" stroke-width="1"/>`).join("") : ""}</g>
   <path d="M20 30 Q14 32 14 44 L14 120 Q14 132 26 132 L74 132 Q86 132 86 120 L86 44 Q86 32 80 30Z" fill="none" stroke="${D}" stroke-width="3"/>
   <path d="M24 50 L24 100" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/><text x="50" y="${Math.min(118, 86)}" text-anchor="middle" font-size="26">${j.e}</text></svg>`; }
function renderBank() {
  $("#beansFace").innerHTML = face("beans");
  const m = monthly(), fun = S.jars.find(j => j.id === "fun");
  $("#beansSay").textContent = !num(S.job.rate) ? "tell me your pay and hours (that box over there). I'll do the math. I love math. (I love money.)"
    : fun && jarBal(fun.id) < 0 ? "fun jar is in the red. we borrow from fun, NEVER from college. 🫘" : !S.tx.length ? `you'll make about ${money(Math.round(m.take))} a month. when you get paid, tap 'I got paid' and I'll split it into jars.` : pick(GM.beans.lines);
  $("#jars").innerHTML = S.jars.map(j => { const b = jarBal(j.id); return `<div class="jar" data-j="${j.id}" tabindex="0" role="button">${jarSVG(j, b)}<div class="jn">${esc(j.n)}</div><div class="jv" style="color:${b < 0 ? "#d6284a" : "inherit"}">${money(b)}</div><div class="muted small">${j.goal ? "goal " + money(j.goal) : j.pct + "% of each check"}</div></div>`; }).join("");
  $$(".jar").forEach(el => el.onclick = () => openJar(el.dataset.j));
  $("#jobCard").innerHTML = `<h3 style="margin-top:0">💼 My job</h3><div class="f2"><label class="f full">Where I work<input id="jWhere" value="${esc(S.job.where)}" placeholder="the place 🍟"></label>
   <label class="f">Pay ($/hour)<input id="jRate" inputmode="decimal" value="${esc(S.job.rate)}" placeholder="12.00"></label><label class="f">Hours / week (about)<input id="jHrs" inputmode="decimal" value="${esc(S.job.hours)}" placeholder="15"></label></div>
   ${num(S.job.rate) && num(S.job.hours) ? `<div class="tiles" style="margin-top:12px"><div class="tile"><div class="l">Per week</div><div class="stat">${money(Math.round(m.week))}</div></div><div class="tile"><div class="l">Per month (before tax)</div><div class="stat">${money(Math.round(m.gross))}</div></div><div class="tile"><div class="l">Take-home ≈</div><div class="stat">${money(Math.round(m.take))}</div></div></div>
   <p class="small muted">Social Security + Medicare always take 7.65%. Income tax might take a little more, or none. Your paystub tells the truth. If extra tax gets taken out, you can get it back by filing a tax return (see the Adulting DLC quests).</p>
   <div class="tip">Each month, about: ${S.jars.map(j => `${j.e} ${money(Math.round(m.take * j.pct / 100))}`).join(" · ")}${(() => { const cj = jarById("college"); if (!cj || !cj.goal) return ""; const per = m.take * cj.pct / 100, left = cj.goal - jarBal("college"); return per > 0 && left > 0 ? `<br>🎓 College Fund hits ${money(cj.goal)} in about <b>${Math.ceil(left / per)} month${Math.ceil(left / per) === 1 ? "" : "s"}</b>.` : ""; })()}</div>` : `<p class="muted small">Put in your pay and hours and Beans makes you a starter budget.</p>`}`;
  ["jWhere", "jRate", "jHrs"].forEach(k => $("#" + k).onchange = () => { S.job.where = $("#jWhere").value; S.job.rate = $("#jRate").value; S.job.hours = $("#jHrs").value; if (num(S.job.rate) && num(S.job.hours)) autoStep("s4", 0); save(); renderBank(); });
  const tot = S.jars.reduce((a, j) => a + (+j.pct || 0), 0);
  $("#splitCard").innerHTML = `<h3 style="margin-top:0">🥧 How each paycheck splits</h3><p class="muted small" style="margin-top:0">Beans' starter plan for someone living at home. Change it however you want. It has to add up to 100%.</p>
   ${S.jars.map(j => `<label class="f">${j.e} ${esc(j.n)}: <b id="pv_${j.id}">${j.pct}%</b></label><input type="range" min="0" max="100" step="5" value="${j.pct}" data-pct="${j.id}">`).join("")}
   <div class="row sp" style="margin-top:8px"><b id="pTot" style="color:${tot === 100 ? "#3fbf8f" : "#d6284a"}">Total: ${tot}%${tot === 100 ? " ✓" : " (needs to be 100)"}</b><button class="btn white sm" id="pReset">Reset to Beans' plan</button></div>`;
  $$("[data-pct]").forEach(r => { r.oninput = () => { const j = jarById(r.dataset.pct); j.pct = +r.value; $("#pv_" + j.id).textContent = j.pct + "%"; const t = S.jars.reduce((a, x) => a + (+x.pct || 0), 0); $("#pTot").textContent = `Total: ${t}%${t === 100 ? " ✓" : " (needs to be 100)"}`; $("#pTot").style.color = t === 100 ? "#3fbf8f" : "#d6284a"; };
    r.onchange = () => { const t = S.jars.reduce((a, x) => a + (+x.pct || 0), 0); if (t === 100) autoStep("s4", 1); save(); renderBank(); }; });
  $("#pReset").onclick = () => { S.jars.forEach(j => { const d = DEFAULT_JARS.find(x => x.id === j.id); if (d) j.pct = d.pct; }); save(); renderBank(); };
  renderTx();
}
function renderTx() { const [y, mo] = viewMonth.split("-").map(Number); $("#mLbl").textContent = new Date(y, mo - 1, 1).toLocaleDateString("en-US", {month:"short", year:"numeric"});
  const L = S.tx.filter(t => (t.date || "").startsWith(viewMonth)).sort((a, b) => b.date.localeCompare(a.date));
  const inn = L.filter(t => t.type === "pay").reduce((a, t) => a + num(t.amt), 0), out = L.filter(t => t.type === "spend").reduce((a, t) => a + num(t.amt), 0), col = L.filter(t => t.type === "pay").reduce((a, t) => a + num(t.split && t.split.college), 0);
  $("#mTiles").innerHTML = `<div class="tile"><div class="l">Got paid</div><div class="stat">${money(inn)}</div></div><div class="tile"><div class="l">Spent</div><div class="stat">${money(out)}</div></div><div class="tile"><div class="l">To college fund</div><div class="stat">${money(col)}</div></div>`;
  $("#txList").innerHTML = L.length ? L.map(t => { const j = jarById(t.jar) || {}, to = jarById(t.to) || {}, fr = jarById(t.from) || {};
    const lab = t.type === "pay" ? `💸 Paycheck${t.note ? " · " + esc(t.note) : ""}` : t.type === "spend" ? `${j.e || "🛍️"} ${esc(t.note || "Spent")}` : `🔁 ${fr.e || ""} → ${to.e || ""} moved`;
    return `<li><span>${lab}<br><span class="muted small">${esc(t.date)}</span></span><span>${t.type === "pay" ? "+" : t.type === "spend" ? "−" : ""}${money(num(t.amt))} <button class="btn white sm" data-del="${t.id}" aria-label="Delete">✕</button></span></li>`; }).join("") : `<li class="muted">Nothing logged this month yet.</li>`;
  $$("[data-del]").forEach(b => b.onclick = () => { if (!confirm("Delete this entry?")) return; S.tx = S.tx.filter(t => t.id !== b.dataset.del); save(); renderBank(); }); }
$("#mPrev").onclick = () => { const [y, m] = viewMonth.split("-").map(Number); const d = new Date(y, m - 2, 1); viewMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; renderTx(); };
$("#mNext").onclick = () => { const [y, m] = viewMonth.split("-").map(Number); const d = new Date(y, m, 1); viewMonth = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; renderTx(); };
$("#payBtn").onclick = () => { const tot = S.jars.reduce((a, j) => a + (+j.pct || 0), 0);
  openModal(`<h2>💸 I got paid!</h2><div class="say"><div class="face">${face("beans")}</div><div class="bub"><b class="who">Beans</b>put in what actually landed in your account (the "net pay" on your paystub). I'll split it into the jars.</div></div>
   <div class="f2"><label class="f">Amount ($)<input id="pAmt" inputmode="decimal" placeholder="0.00" autofocus></label><label class="f">Date<input type="date" id="pDate" value="${today()}"></label><label class="f full">Note (optional)<input id="pNote" placeholder="first paycheck!!"></label></div>
   <div id="pPrev" class="tip">Type an amount to see the split.</div>${tot !== 100 ? `<p class="small" style="color:#d6284a">Your split adds to ${tot}%, not 100%. I'll scale it so it adds up.</p>` : ""}
   <div class="foot"><span></span><button class="btn mint" id="pGo">Split it!</button></div>`);
  const split = a => { const o = {}, live = S.jars.filter(j => +j.pct > 0); let left = Math.round(a * 100);
    S.jars.forEach(j => o[j.id] = 0); live.forEach((j, i) => { const c = i === live.length - 1 ? left : Math.round(a * 100 * j.pct / tot); o[j.id] = c / 100; left -= c; }); return o; };
  $("#pAmt").oninput = () => { const a = num($("#pAmt").value), s = split(a); $("#pPrev").innerHTML = a ? S.jars.map(j => `${j.e} ${esc(j.n)}: <b>${money(s[j.id])}</b>`).join("<br>") : "Type an amount to see the split."; };
  $("#pGo").onclick = () => { const a = num($("#pAmt").value); if (a <= 0) { toast("How much did you get paid?"); return; }
    if (tot <= 0) { toast("Every jar is at 0%. Give at least one jar a percentage first."); return; }
    S.tx.push({id:uid(), type:"pay", amt:a, date:$("#pDate").value || today(), note:$("#pNote").value.trim(), split:split(a)});
    const got = earn("pay:" + today(), 3); logDay("logged a paycheck"); autoStep("s4", 2); if (S.q.s2 && S.q.s2.s && S.q.s2.s[2]) autoStep("s2", 3);
    closeModal(); SFX.done(); toast(`🫘 Beans split it into jars!${got ? " +3 🍪" : ""}`); setTimeout(() => doTrick(), 300); changed(); go("bank"); };
};
$("#spendBtn").onclick = () => { openModal(`<h2>🛍️ I spent money</h2><div class="say"><div class="face">${face("beans")}</div><div class="bub"><b class="who">Beans</b>no judgment. logging it is the whole skill. which jar did it come from?</div></div>
   <div class="f2"><label class="f">Amount ($)<input id="sAmt" inputmode="decimal" placeholder="0.00"></label><label class="f">From jar<select id="sJar">${S.jars.map(j => `<option value="${j.id}" ${j.id === "fun" ? "selected" : ""}>${j.e} ${esc(j.n)} (${money(jarBal(j.id))})</option>`).join("")}</select></label>
   <label class="f">What for?<input id="sNote" placeholder="boba, gas, manga…"></label><label class="f">Date<input type="date" id="sDate" value="${today()}"></label></div>
   <div class="foot"><span></span><button class="btn peach" id="sGo">Log it</button></div>`);
  $("#sGo").onclick = () => { const a = num($("#sAmt").value); if (a <= 0) { toast("How much?"); return; } const jar = $("#sJar").value;
    S.tx.push({id:uid(), type:"spend", amt:a, jar, note:$("#sNote").value.trim(), date:$("#sDate").value || today()}); earn("spend:" + today(), 1); logDay();
    closeModal(); SFX.step(); toast(jar === "college" ? "🫘 Beans: \"from the COLLEGE jar?? okay… if it's for college stuff, that's what it's for.\"" : jarBal(jar) < 0 ? "🫘 That jar went negative. Move some beans in from another jar (tap the jar)." : "🫘 Logged. Tracking it is the whole skill."); changed(); go("bank"); }; };
function openJar(id) { const j = jarById(id);
  openModal(`<h2>${j.e} ${esc(j.n)}</h2><p class="stat">${money(jarBal(id))}</p>
   <div class="f2"><label class="f">Name<input id="jn" value="${esc(j.n)}"></label><label class="f">Emoji<input id="je" value="${esc(j.e)}" maxlength="4"></label><label class="f full">Goal ($, 0 = no goal)<input id="jg" inputmode="decimal" value="${esc(j.goal || 0)}"></label></div>
   <h3>🔁 Move beans</h3><div class="f2"><label class="f">Amount<input id="mAmt" inputmode="decimal" placeholder="0.00"></label><label class="f">To jar<select id="mTo">${S.jars.filter(x => x.id !== id).map(x => `<option value="${x.id}">${x.e} ${esc(x.n)}</option>`).join("")}</select></label></div>
   <div class="foot"><button class="btn white" id="mGo">Move it</button><button class="btn mint" id="jSave">Save jar</button></div>`);
  $("#jSave").onclick = () => { j.n = $("#jn").value.trim() || j.n; j.e = $("#je").value.trim() || j.e; j.goal = num($("#jg").value); if (id === "ohno" && j.n !== "Oh No Fund") autoStep("s5", 0); closeModal(); changed(); };
  $("#mGo").onclick = () => { const a = num($("#mAmt").value); if (a <= 0) return; S.tx.push({id:uid(), type:"move", amt:a, from:id, to:$("#mTo").value, date:today()}); closeModal(); toast("🔁 Moved!"); changed(); }; }

// ---------- grown-ups ----------
function renderHelp() { $("#mothFace").innerHTML = face("moth");
  $("#pmList").innerHTML = PARENT.map(p => { const st = S.pm[p.id] || "";
    return `<div class="pm ${st === "done" ? "done" : ""}"><div class="row sp"><h3 style="margin:0">${p.e} ${esc(p.t)}</h3><span class="st">${st === "done" ? "✅ done" : st === "asked" ? "📨 asked" : ""}</span></div>
    <p class="muted small" style="margin:4px 0">${esc(p.why)}</p><details><summary class="fr" style="cursor:pointer">👀 See the text</summary><pre class="script">${esc(p.text)}</pre></details>
    <div class="row" style="margin-top:8px"><button class="btn sun sm" data-cp="${p.id}">📋 Copy text</button><button class="btn white sm" data-st="${p.id}:asked">📨 I asked</button><button class="btn mint sm" data-st="${p.id}:done">✅ It's done</button></div></div>`; }).join("");
  $$("[data-cp]").forEach(b => b.onclick = () => copy(PARENT.find(p => p.id === b.dataset.cp).text));
  $$("[data-st]").forEach(b => b.onclick = () => { const [id, v] = b.dataset.st.split(":"); S.pm[id] = S.pm[id] === v ? "" : v;
    if (S.pm[id]) { const got = earn("pm:" + id + ":" + v, v === "done" ? 5 : 3); logDay(); toast(v === "done" ? `✅ Grown-up mission complete!${got ? " +5 🍪" : ""}` : `📨 Asking is the hard part. Proud of you.${got ? " +3 🍪" : ""}`); if (v === "done") miniHop(); }
    changed(); });
  $("#noHelp").innerHTML = NOHELP;
  $("#scripts").innerHTML = `<h3 style="margin-top:0">📜 Scripts (copy, paste, change the [brackets])</h3>` + SCRIPTS.map((s, i) => `<details style="margin-bottom:8px"><summary class="fr" style="cursor:pointer">${esc(s.t)}</summary><pre class="script">${esc(s.text)}</pre><button class="btn sun sm" data-sc="${i}">📋 Copy</button></details>`).join("");
  $$("[data-sc]").forEach(b => b.onclick = () => copy(SCRIPTS[+b.dataset.sc].text)); }

// ---------- den ----------
function renderDen() {
  $("#roster").innerHTML = GREMS.map(g => `<div class="gc" data-g="${g.id}" tabindex="0" role="button">${gSVG(g)}<b>${esc(g.name)}</b><span class="muted small">${esc(g.role)}</span></div>`).join("");
  $$(".gc").forEach(el => el.onclick = () => openHat(el.dataset.g));
  const ownedHats = HATS.filter(h => S.owned["hat_" + h.id]);
  $("#shop").innerHTML = HATS.map(h => { const own = S.owned["hat_" + h.id]; return `<div class="si ${own ? "own" : ""}"><div class="ie">${h.e}</div><b class="fr">${esc(h.n)}</b><div>${own ? "✓ owned" : `<button class="btn sm ${S.snk >= h.cost ? "sun" : "white"}" data-buy="hat_${h.id}" data-cost="${h.cost}">🍪 ${h.cost}</button>`}</div></div>`; }).join("")
    + TRICKS.map(t => { const own = S.owned[t.id]; return `<div class="si ${own ? "own" : ""}"><div class="ie">${t.e}</div><b class="fr">Trick: ${esc(t.n)}</b><div>${own ? `<button class="btn white sm" data-try="${t.id}">▶ watch</button>` : `<button class="btn sm ${S.snk >= t.cost ? "sun" : "white"}" data-buy="${t.id}" data-cost="${t.cost}">🍪 ${t.cost}</button>`}</div></div>`; }).join("")
    + `<div class="si"><div class="ie">💋</div><b class="fr">Summon Seraphine</b><div class="muted small">one (1) compliment</div><button class="btn sm ${S.snk >= 25 ? "pink" : "white"}" id="buyHot">🍪 25</button></div>`;
  $$("[data-buy]").forEach(b => b.onclick = () => { const c = +b.dataset.cost; if (S.snk < c) { SFX.bonk(); toast(`🍪 Need ${c - S.snk} more snacks. Do a step! Snacks come from steps.`); return; }
    S.snk -= c; S.owned[b.dataset.buy] = 1; SFX.done(); changed(); if (!b.dataset.buy.startsWith("hat_")) setTimeout(() => doTrick(b.dataset.buy), 200); else toast("🎩 Bought! Tap a gremlin to put it on them."); });
  $$("[data-try]").forEach(b => b.onclick = () => doTrick(b.dataset.try));
  $("#buyHot").onclick = () => { if (S.snk < 25) { SFX.bonk(); toast("🍪 Seraphine's rate is 25 snacks. She's worth it."); return; } S.snk -= 25; save(); renderTop(); renderDen(); showHot(true); };
  $("#letter").innerHTML = esc(LETTER.replace(/\{n\}/g, S.name || "Kyla Bug")).replace(/\n/g, "<br>");
  renderFics();
  const qd = QUESTS.filter(q => isDone(q.id)).length, sd = QUESTS.reduce((a, q) => a + stepsDone(q), 0);
  $("#statsCard").innerHTML = `<h3 style="margin-top:0">📈 Your stats</h3><div class="tiles"><div class="tile"><div class="l">Quests</div><div class="stat">${qd}/${QUESTS.length}</div></div><div class="tile"><div class="l">Steps</div><div class="stat">${sd}</div></div><div class="tile"><div class="l">College cards</div><div class="stat">${S.colleges.length}</div></div><div class="tile"><div class="l">Focus minutes</div><div class="stat">${S.focusMin}</div></div><div class="tile"><div class="l">Days showed up</div><div class="stat">${Object.keys(S.days).length}</div></div><div class="tile"><div class="l">Seraphine visits</div><div class="stat">${S.hotCount}</div></div></div>`;
}
function openHat(id) { const g = GM[id], own = HATS.filter(h => S.owned["hat_" + h.id]);
  openModal(`<h2>${esc(g.name)}'s hat</h2><div style="display:flex;justify-content:center"><div style="width:140px">${gSVG(g)}</div></div><p class="muted" style="text-align:center">${esc(g.role)}</p>
  ${own.length ? `<div class="row" style="justify-content:center"><button class="btn white sm" data-hat="">Default look</button>${own.map(h => `<button class="btn ${S.hats[id] === h.id ? "lav" : "white"} sm" data-hat="${h.id}">${h.e} ${esc(h.n)}</button>`).join("")}</div>` : `<p style="text-align:center">No hats yet! Buy some in the 🛒 Snack Shop.</p>`}`);
  $$("[data-hat]").forEach(b => b.onclick = () => { S.hats[id] = b.dataset.hat; SFX.tap(); save(); openHat(id); renderDen(); renderScene(); }); }
function makeFic() { const n = S.name || "Kyla Bug", fd = (S.fandom || "").trim(), wk = Date.now() - 14 * 864e5;
  const recent = S.log.filter(l => l.at > wk && l.quest).map(l => l.t), steps = S.log.filter(l => l.at > wk && !l.quest && l.t).map(l => l.t);
  const things = [...new Set(recent.concat(steps))].slice(0, 3).map(t => t.replace(/^tiny: /, "a tiny piece of ").replace(/^card: /, "adding a College Card for ").replace(/\.$/, "").toLowerCase());
  const tags = [...new Set([pick(FIC.tags), pick(FIC.tags), pick(FIC.tags), pick(FIC.tags)])]; if (fd) tags.unshift(fd + " AU");
  const doneT = FIC.done.slice().sort(() => Math.random() - .5);
  const body = [pick(FIC.open)].concat(things.length ? things.map((t, i) => doneT[i % doneT.length].replace("{q}", `"${t}"`)) : [pick(FIC.none)]).concat([pick(FIC.close)]).join(" ").replace(/\{n\}/g, n);
  return {at:today(), title:pick(FIC.titles).replace(/\{n\}/g, n), tags, words:(Math.floor(Math.random() * 90) + 3) * 1000, body}; }
function renderFics() { $("#fics").innerHTML = S.fics.length ? S.fics.slice(0, 3).map(f => `<div class="fic"><h3>${esc(f.title)}</h3><div class="muted small" style="font-weight:800">by Sir_Crumbs_Official · Rated G · ${f.words.toLocaleString()} words · ${esc(f.at)}</div><div class="tags" style="margin:6px 0">${f.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div><p style="margin:0">${esc(f.body)}</p></div>`).join("") : `<p class="muted">No fics yet. Commission one!</p>`; }
$("#ficBtn").onclick = () => { S.fics.unshift(makeFic()); S.fics = S.fics.slice(0, 10); save(); renderFics(); SFX.done(); toast("📚 Sir Crumbs has posted a new chapter."); };

// ---------- tricks & confetti ----------
function miniHop() { if (S.calm) return; const el = $$("#scene .gr .bob")[Math.floor(Math.random() * 6)]; if (!el) return; el.animate([{transform:"translateY(0)"}, {transform:"translateY(-18px) rotate(-20deg)"}, {transform:"translateY(0)"}], {duration:500, iterations:2}); }
function doTrick(kind) {
  const owned = TRICKS.filter(t => S.owned[t.id]).map(t => t.id);
  if (!kind) kind = pick(owned); if (kind === "best") kind = owned.filter(k => !["hop", "spin"].includes(k)).pop() || "flip";
  const cap = pick(TRICK_CAPS[kind] || TRICK_CAPS.hop);
  if (S.calm || matchMedia("(prefers-reduced-motion: reduce)").matches) { toast("🎪 " + esc(cap)); return; }
  const st = $("#stage"); st.className = "on t-" + kind; let line = GREMS.map((g, i) => `<div class="gm" style="animation-delay:${kind === "hop" || kind === "flip" ? i * .09 : 0}s">${gSVG(g)}</div>`).join("");
  st.innerHTML = `<div class="line">${line}</div><div class="cap">${esc(cap)}</div>`;
  if (kind === "pyramid") { const P = [[0, 150], [62, 150], [124, 150], [31, 95], [93, 95], [62, 40]]; $$("#stage .gm").forEach((el, i) => { el.style.left = P[i][0] + "px"; el.style.top = P[i][1] + "px"; el.style.animationDelay = i * .1 + "s"; }); }
  if (kind === "kazoo") { SFX.kazoo(); const ln = $("#stage .line"); for (let i = 0; i < 10; i++) setTimeout(() => { const n = document.createElement("span"); n.className = "note"; n.textContent = pick(["♪", "♫", "🎵"]); n.style.left = Math.random() * 380 + "px"; n.style.bottom = "60px"; n.style.setProperty("--dx", (Math.random() * 60 - 30) + "px"); ln.appendChild(n); }, i * 220); }
  else if (kind === "cannon") { const g = $$("#stage .gm")[1]; setTimeout(() => { g.classList.add("fly"); st.insertAdjacentHTML("beforeend", '<div class="boom">💥</div>'); SFX.bonk(); }, 300); }
  else SFX.done();
  clearTimeout(doTrick.t); doTrick.t = setTimeout(() => { st.className = ""; st.innerHTML = ""; }, kind === "conga" ? 3000 : 3400);
}
const cv = $("#confetti"), cx = cv.getContext("2d"); let CP = [], cRun = false;
function confetti(n = 140) { if (S.calm || matchMedia("(prefers-reduced-motion: reduce)").matches) return; cv.width = innerWidth; cv.height = innerHeight;
  const cols = ["#ff8fb8", "#b8a1ff", "#7fd8be", "#ffe066", "#9fd4ff", "#ffc59e"];
  for (let i = 0; i < n; i++) CP.push({x:Math.random() * cv.width, y:-20 - Math.random() * cv.height * .5, vx:Math.random() * 2 - 1, vy:2 + Math.random() * 3, r:Math.random() * 6.28, vr:Math.random() * .2 - .1, c:pick(cols), s:5 + Math.random() * 6});
  if (!cRun) { cRun = true; requestAnimationFrame(cLoop); } }
function cLoop() { cx.clearRect(0, 0, cv.width, cv.height); CP.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore(); });
  CP = CP.filter(p => p.y < cv.height + 20); if (CP.length) requestAnimationFrame(cLoop); else { cRun = false; cx.clearRect(0, 0, cv.width, cv.height); } }

// ---------- Seraphine ----------
let hotT = null;
function maybeHot(chance, delay = 1500) { if (!S.seenIntro || S.hotMode === "never") return; const gap = S.hotMode === "lots" ? 4 * 36e5 : 18 * 36e5;
  if (Date.now() - (S.lastHot || 0) < gap) return; if (Math.random() < (S.hotMode === "lots" ? Math.min(1, chance * 2) : chance)) { clearTimeout(hotT); hotT = setTimeout(() => showHot(), delay); } }
function showHot(force, line) { const h = $("#hot"); if (h.classList.contains("on") || (!force && S.hotMode === "never")) return;
  if ($("#scrim").classList.contains("on") && !force) { hotT = setTimeout(() => showHot(force, line), 5000); return; }
  S.lastHot = Date.now(); S.hotCount = (S.hotCount || 0) + 1; save();
  const txt = (line || pick(HOT_LINES)).replace(/\{n\}/g, S.name || "Kyla Bug");
  h.innerHTML = `<span class="wind">〰️</span><div class="hb"><small>✦ Seraphine ✦</small>${esc(txt)}</div>${ladySVG()}`; h.className = "on"; SFX.hot();
  let gone = false; const leave = () => { if (gone) return; gone = true; h.insertAdjacentHTML("afterbegin", ""); $("#hot .hb").innerHTML = `<small>✦ Seraphine ✦</small><i>${esc(pick(HOT_EXITS))}</i>`;
    setTimeout(() => { h.className = "on out"; setTimeout(() => { h.className = ""; h.innerHTML = ""; const [gid, r] = pick(HOT_REACT); say(gid, r); toast(`<span style="display:inline-block;width:26px;vertical-align:middle">${face(gid)}</span> ${esc(GM[gid].name)}: "${esc(r)}"`); }, 650); }, 1400); };
  h.onclick = leave; setTimeout(leave, 5200); }

// ---------- focus timer (body doubling) ----------
let TM = null;
function focusPicker() { const t = tinyNow();
  openModal(`<h2>⏱️ Work with the gremlins</h2><div class="say"><div class="face">${face("gnorbert")}</div><div class="bub"><b class="who">Gnorbert</b>We'll all sit at our tiny desks and work too. It's called body doubling. It works. Pick a time.</div></div>
   <label class="f" for="fWhat">What are you working on? (optional)</label><input id="fWhat" value="${t ? esc(t.q.steps[t.i].replace(/^👪\s*/, "")) : ""}">
   <div class="row" style="margin-top:14px">${[5, 10, 15, 25].map(m => `<button class="btn ${m === 10 ? "mint" : "white"} big" data-fm="${m}" style="flex:1">${m} min</button>`).join("")}</div>`);
  $$("[data-fm]").forEach(b => b.onclick = () => startFocus(+b.dataset.fm, $("#fWhat").value)); }
function startFocus(mins, what) { if (TM) clearInterval(TM.iv); TM = {end:Date.now() + mins * 6e4, mins, what:what || ""}; closeModal(); SFX.step();
  TM.iv = setInterval(tick, 1000); tick(); focusView(); }
function tick() { if (!TM) return; const left = Math.max(0, TM.end - Date.now()), m = Math.floor(left / 6e4), s = Math.floor(left / 1000) % 60;
  const p = $("#pill"); p.classList.add("on"); p.textContent = `⏱️ ${m}:${pad(s)} · gremlins working`; const big = $("#fBig"); if (big) big.textContent = `${m}:${pad(s)}`;
  if (left <= 0) finishFocus(); }
function focusView() { if (!TM) return; const desk = g => `<div style="text-align:center;width:31%"><div style="width:64px;margin:0 auto">${gSVG(g, {sleepy:g.id === "moth"})}</div><div style="height:10px;background:#c98b5e;border:2px solid ${D};border-radius:3px;margin-top:-6px"></div><div class="small muted">${esc(pick(["typing furiously", "highlighting", "reading", "taking notes", "pretending", "very focused"]))}</div></div>`;
  openModal(`<h2>⏱️ Focus time</h2><p class="muted" style="margin-top:0">${TM.what ? "Working on: <b>" + esc(TM.what) + "</b>" : "Everyone's working. Shh."}</p>
   <div style="text-align:center;font-family:'Mochiy Pop One';font-size:56px" id="fBig"></div>
   <div class="row" style="justify-content:space-between">${GREMS.map(desk).join("")}</div>
   <div class="foot"><button class="btn white sm" id="fStop">Stop early (still counts)</button><button class="btn mint" data-close>Hide timer</button></div>`); tick();
  $("#fStop").onclick = () => finishFocus(true); }
$("#pill").onclick = () => focusView();
function finishFocus(early) { if (!TM) return; clearInterval(TM.iv); const mins = early ? Math.floor((TM.mins * 6e4 - Math.max(0, TM.end - Date.now())) / 6e4) : TM.mins; TM = null;
  $("#pill").classList.remove("on"); if ($("#fBig")) closeModal();
  if (mins < 1) { toast("⏱️ Stopped. Under a minute doesn't earn snacks, but trying counts. 💜"); return; }
  S.focusMin += mins; S.bx = (S.bx || 0) + mins * 2; S.snk += mins; S.snkEarned += mins; logDay("focus " + mins + " min");
  SFX.done(); toast(`⏱️ ${mins} focus minutes! +${mins * 2} XP · +${mins} 🍪`); if (!early) setTimeout(() => doTrick(), 300); changed(); maybeHot(.25, 4000); }

// ---------- settings ----------
$("#setBtn").onclick = () => {
  openModal(`<h2>⚙️ Settings</h2><div class="f2">
   <label class="f">Your name<input id="sName" value="${esc(S.name)}"></label>
   <label class="f">Your state<select id="sState"><option value="">Pick one</option>${STATES.map(s => `<option ${s === S.state ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
   <label class="f full">Favorite anime / fandom<input id="sFan" value="${esc(S.fandom)}" placeholder="the gremlins will reference it"></label>
   <label class="f">Seraphine visits<select id="sHot"><option value="some" ${S.hotMode === "some" ? "selected" : ""}>Sometimes</option><option value="lots" ${S.hotMode === "lots" ? "selected" : ""}>A LOT</option><option value="never" ${S.hotMode === "never" ? "selected" : ""}>Never (she'll be sad)</option></select></label>
   <label class="f">Sound<select id="sSnd"><option value="1" ${S.sound ? "selected" : ""}>On 🔊</option><option value="0" ${!S.sound ? "selected" : ""}>Off 🔇</option></select></label>
   <label class="f full" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="sCalm" style="width:auto" ${S.calm ? "checked" : ""}> Calm mode (fewer animations)</label></div>
   <div class="foot"><span></span><button class="btn mint" id="sSave">Save</button></div>
   <h3>💾 Backup</h3><p class="muted small" style="margin-top:0">Your progress saves on this device${cloud.ref ? " and to your Village account" : ""}. Download a backup once in a while, just in case.</p>
   <div class="row"><button class="btn white sm" id="bDl">⬇️ Download backup</button><label class="btn white sm" style="cursor:pointer">⬆️ Restore backup<input type="file" id="bUp" accept=".json,application/json" style="display:none"></label><button class="btn white sm" id="bIntro">👋 Replay intro</button></div>
   <p class="muted small">Want to keep progress if you switch phones? Log in to the <a href="../village/">Family Village</a> on this browser and it backs up automatically.</p>`);
  $("#sSave").onclick = () => { S.name = $("#sName").value.trim() || "Kyla Bug"; S.state = $("#sState").value; S.fandom = $("#sFan").value.trim(); S.hotMode = $("#sHot").value; S.sound = $("#sSnd").value === "1"; S.calm = $("#sCalm").checked;
    if (S.state && S.fandom) autoStep("q0a", 2); closeModal(); toast("Saved! ✨"); changed(); };
  $("#bDl").onclick = () => { const b = new Blob([JSON.stringify(S, null, 1)], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `gremlin-town-backup-${today()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $("#bUp").onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (!d || typeof d !== "object" || !d.q) throw 0; if (!confirm("Replace your current progress with this backup?")) return; S = Object.assign(fresh(), d); lastLv = levelInfo().lv; closeModal(); changed(); toast("Backup restored ✨"); } catch (x) { toast("That file isn't a Gremlin Town backup."); } }; r.readAsText(f); };
  $("#bIntro").onclick = () => intro(0);
};

// ---------- intro ----------
function intro(step) {
  if (step === 0) openModal(`<h2>👋 Ahem. Hello.</h2><div class="say"><div class="face">${face("gnorbert")}</div><div class="bub"><b class="who">Gnorbert</b>Are you ${esc(S.name || "Kyla Bug")}? Good. We are the <b>Gremlin Committee</b>. Bailey hired us to help you get ready for college, money, and adult stuff. We were paid in snacks. We are extremely professional.</div></div>
    <div class="row" style="justify-content:center;margin:14px 0">${GREMS.map(g => `<div style="width:56px">${gSVG(g)}</div>`).join("")}</div>
    <div class="say"><div class="face">${face("pickle")}</div><div class="bub"><b class="who">Pickle</b>hi!!!! I ate the welcome banner</div></div>
    <div class="foot"><span></span><button class="btn big" id="i1">…okay? 👀</button></div>`);
  if (step === 1) openModal(`<h2>✍️ Who are you?</h2><div class="say"><div class="face">${face("crumbs")}</div><div class="bub"><b class="who">Sir Crumbs</b>Every main character needs a profile. I'll be writing fanfic about you, so please be accurate.</div></div>
    <label class="f">What should we call you?<input id="iName" value="${esc(S.name || "Kyla Bug")}"></label>
    <label class="f">What state do you live in? (for state college money)<select id="iState"><option value="">Pick one</option>${STATES.map(s => `<option ${s === S.state ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
    <label class="f">Favorite anime / fandom?<input id="iFan" value="${esc(S.fandom)}" placeholder="be honest. we won't judge. (Pickle might.)"></label>
    <div class="foot"><span></span><button class="btn big" id="i2">That's me ✨</button></div>`);
  if (step === 2) openModal(`<h2>📜 The rules (there are only 3)</h2><div class="say"><div class="face">${face("pickle")}</div><div class="bub"><b class="who">Pickle</b>rules are lame so we only have three</div></div>
    <div class="tip" style="font-size:17px">1. <b>One tiny thing a day is enough.</b> The Home screen always shows you just one.</div>
    <div class="tip" style="font-size:17px">2. <b>If something needs a grown-up, we'll tell you</b> and give you the exact text to send them.</div>
    <div class="tip" style="font-size:17px">3. <b>Rest is allowed. Giving up isn't.</b> <span class="muted">(Gnorbert wrote that one in pen.)</span></div>
    <div class="say" style="margin-top:12px"><div class="face">${face("moth")}</div><div class="bub"><b class="who">Moth</b>and when you do good, we do tricks. they're dumb. you'll love them. 💜</div></div>
    <div class="foot"><span></span><button class="btn mint big" id="i3">LET'S GOOO 🚀</button></div>`);
  if ($("#i1")) $("#i1").onclick = () => intro(1);
  if ($("#i2")) $("#i2").onclick = () => { S.name = $("#iName").value.trim() || "Kyla Bug"; S.state = $("#iState").value; S.fandom = $("#iFan").value.trim(); if (S.state && S.fandom) autoStep("q0a", 2); save(); intro(2); };
  if ($("#i3")) $("#i3").onclick = () => { const first = !S.seenIntro; S.seenIntro = true; if (first) earn("intro", 10); closeModal(); changed(); setTimeout(() => doTrick("flip"), 250); setTimeout(() => toast("🍪 +10 starter snacks. Spend them in the Den!"), 3800);
    if (first) setTimeout(() => showHot(true, "Hi, sorry, I don't work here. I just heard you were new and wanted to say you look SO cute. Bye. 💋"), 22000); };
}

// ---------- boot ----------
function renderAll() { renderTop(); renderHome(); renderQuests(); renderColleges(); renderBank(); renderHelp(); renderDen(); }
lastLv = levelInfo().lv; S.met.tab_home = 1;
renderAll(); contextSay();
if (S.tab && S.tab !== "home") go(S.tab);
if (!S.seenIntro) setTimeout(() => intro(0), 500); else maybeHot(.3, 7000);
window.addEventListener("load", initCloud);
let _h = new Date().getHours(); setInterval(() => { const h = new Date().getHours(); if (h !== _h) { _h = h; renderScene(); } }, 60000);

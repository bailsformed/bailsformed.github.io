/* =====================================================================
   THE POT: shared money engine for Bailey & PB
   Used by /pot/ (the joint dashboard) and by each person's game.
   Needs supabase-js loaded first.
   ===================================================================== */
(function () {
'use strict';

const CFG = {
  url: 'https://xsihxxwqbguxpvmhpdqo.supabase.co',
  key: 'sb_publishable_mMfWPoSYDQUqkCM4rUaccA_6_n8u4XL', // publishable key: safe to be public
  storageKey: 'the-pot-auth',                             // separate from the village login
};

/* ---------- skins: same data, different voice ---------- */
const SKINS = {
  neutral: {
    name: 'The Pot', tiers: { 1: ['🧾', 'Must-pay'], 2: ['🏠', 'Needed, flexible'], 3: ['🎉', 'Fun money'] },
    importBtn: '📥 Import statements', importTitle: 'Import a statement',
    importIntro: 'Upload the CSV from your bank or card. I sort the obvious ones and only ask about the unclear ones. Duplicates are skipped.',
    done: n => `${n} entries added to the pot.`, ask: 'One question', over: 'Over budget', paid: 'Paid',
  },
  apothecary: {
    name: 'The Treasury', tiers: { 1: ['🕯️', 'Tributes to the Underworld'], 2: ['🔥', 'The Hearth'], 3: ['🍇', "Dionysus's Indulgences"] },
    importBtn: '📥 Import statements', importTitle: "📥 Charon's Ledger",
    importIntro: "Hand me the whole statement, little witch. I'll sort what's obvious and only ask about what's actually unclear. Duplicates get skipped.",
    done: n => `${n} entries recorded. Charon is satisfied.`, ask: 'One question from Hades', over: 'Dionysus got you', paid: 'Tribute paid',
  },
  dungeon: {
    name: 'Loot Ledger', tiers: { 1: ['💀', 'Mandatory Boss Fights'], 2: ['🎒', 'Party Supplies'], 3: ['🎁', 'Loot Box Impulses'] },
    importBtn: '📥 Upload bank scroll', importTitle: '📜 SYSTEM: Statement Upload',
    importIntro: "Hello, Crawler. Feed me your bank statement. I will sort it. I will only bother you about the purchases that confuse me, which, frankly, will be the embarrassing ones. Duplicates are ignored. You're welcome.",
    done: n => `NEW ACHIEVEMENT! Bookkeeper. ${n} entries logged. Reward: knowing where your money went. Rare!`, ask: 'SYSTEM QUERY', over: 'Your loot box habit has been noted', paid: 'Boss defeated',
  },
};

/* default categories (shared ids so both budgets roll up together) */
const DEFAULT_CATS = [
  ['rent', 'Rent', 1], ['renters', 'Renters insurance', 1], ['utilities', 'Electric & heat', 1], ['internet', 'Internet', 1],
  ['phone', 'Phone', 1], ['carins', 'Car insurance', 1], ['debt', 'Card & loan payments', 1], ['groceries', 'Groceries', 1],
  ['healthins', 'Health insurance', 1], ['medical', 'Medical & pharmacy', 1], ['tuition', 'Tuition & school fees', 1],
  ['gas', 'Gas', 2], ['carupkeep', 'Car upkeep & registration', 2], ['books', 'Books & course materials', 2],
  ['household', 'Household & personal supplies', 2], ['pets', 'Pets', 2],
  ['dining', 'Dining out, coffee & delivery', 3], ['selfcare', 'Personal care & fitness', 3], ['shopping', 'Shopping & Amazon', 3],
  ['subs', 'Subscriptions & apps', 3], ['smoke', 'Smoke shop / hemp', 3], ['fun', 'Entertainment & fun', 3], ['gifts', 'Gifts, travel & misc', 3],
];
/* Setup starters. This file is public, so it holds bill names only, never real amounts:
   everyone types their own numbers during setup and they're stored privately in the Pot. */
const PRESET_BUDGET = { apothecary: {}, dungeon: {} };
const STARTER_BILLS = [
  { name: 'Rent', amount: '', kind: 'bill', due_day: '', category: 'rent' },
  { name: 'Car insurance', amount: '', kind: 'bill', due_day: '', category: 'carins' },
  { name: 'Card payment', amount: '', kind: 'bill', due_day: '', category: 'debt' },
  { name: 'Phone', amount: '', kind: 'bill', due_day: '', category: 'phone' },
  { name: 'Internet', amount: '', kind: 'bill', due_day: '', category: 'internet' },
  { name: 'Electric & heat', amount: '', kind: 'bill', due_day: '', category: 'utilities' },
  { name: 'Tuition', amount: '', kind: 'oneoff', due_date: '', category: 'tuition' },
];
const PRESET_BILLS = { apothecary: STARTER_BILLS, dungeon: [] };

/* ---------- tiny helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => iso(new Date());
const monthKey = d => (d || today()).slice(0, 7);
const shiftMonth = (m, k) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
const monthLabel = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); };
const money = (n, cents) => { n = +n || 0; const a = Math.abs(n); return (n < 0 ? '-' : '') + '$' + a.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : (a % 1 ? 2 : 0), maximumFractionDigits: 2 }); };
const r2 = n => Math.round((+n || 0) * 100) / 100;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ---------- styles (hosts can override the --pot-* colors) ---------- */
const CSS = `
.pot{--pk:var(--pot-ink,#f4ead9);--pd:var(--pot-dim,#bba9c4);--pp:var(--pot-panel,#241a2e);--pp2:var(--pot-panel2,#1f1627);--pe:var(--pot-edge,#4a3757);--pa:var(--pot-accent,#e8c66a);--pr:var(--pot-red,#e05a6a);--pg:var(--pot-green,#8fd19a);--po:var(--pot-orange,#e8743b);--pf:var(--pot-font,inherit);--phf:var(--pot-head-font,inherit);color:var(--pk);font-family:var(--pf)}
.pot *{box-sizing:border-box}.pot h2,.pot h3{font-family:var(--phf);margin:4px 0 8px}.pot h3{color:var(--pa);font-size:19px}
.pot .pbtn{font:inherit;font-weight:800;font-size:14px;border:1px solid var(--pe);border-radius:999px;padding:7px 14px;cursor:pointer;background:var(--pp2);color:var(--pk)}
.pot .pbtn.main{background:var(--pa);color:#1a1320;border-color:var(--pa)}.pot .pbtn.sm{font-size:12px;padding:4px 10px}.pot .pbtn:disabled{opacity:.5;cursor:default}
.pot .pbtn[data-mv]{min-width:44px;min-height:44px;font-size:20px;padding:4px 10px}
.pot .pbtn:focus-visible,.pot [tabindex]:focus-visible{outline:2px solid var(--pa);outline-offset:2px}
.pot input,.pot select,.pot textarea{font:inherit;font-size:15px;background:var(--pp2);color:var(--pk);border:1px solid var(--pe);border-radius:10px;padding:8px 10px;width:100%}
.pot label.pl{display:block;font-weight:800;font-size:12px;letter-spacing:.8px;text-transform:uppercase;color:var(--pd);margin:10px 0 4px}
.pot .prow{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pot .psp{justify-content:space-between}
.pot .pmuted{color:var(--pd)}.pot .pok{color:var(--pg)}.pot .pbad{color:var(--pr)}.pot .pwarn{color:var(--po)}
.pot .pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.pot .ptile{background:var(--pp2);border:1px solid var(--pe);border-radius:14px;padding:12px;text-align:center}
.pot .ptile .big{font-family:var(--phf);font-size:30px;font-weight:700;line-height:1.1}.pot .ptile small{display:block;color:var(--pd);font-size:12px;line-height:1.35}
.pot .pjars{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
.pot .pjar{background:var(--pp2);border:1px solid var(--pe);border-radius:12px;padding:8px 10px;cursor:pointer}
.pot .pjar .nm{font-weight:700;font-size:13px;line-height:1.25;min-height:32px}.pot .pjar .amt{font-size:12px;color:var(--pd)}
.pot .pbar{height:10px;background:#0006;border-radius:9px;overflow:hidden;margin:4px 0}.pot .pbar i{display:block;height:100%}
.pot table{width:100%;border-collapse:collapse;font-size:14px}.pot th{text-align:left;color:var(--pa);font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid var(--pe);padding:6px;white-space:nowrap}
.pot td{border-bottom:1px dashed var(--pe);padding:6px;vertical-align:top}.pot .ptbl{overflow:auto;max-height:440px}
.pot .pnm{display:none;color:var(--pd);font-size:12px}
@media(max-width:560px){.pot table{font-size:13px}.pot th{letter-spacing:0;font-size:10px}.pot th,.pot td{padding:5px 3px}.pot td{overflow-wrap:anywhere}.pot td .pbtn.sm{padding:3px 7px}.pot .pnc{display:none}.pot .pnm{display:block}}
.pot .pseg{display:flex;gap:6px;flex-wrap:wrap}.pot .pseg button{font:inherit;background:var(--pp2);color:var(--pk);border:1px solid var(--pe);border-radius:999px;padding:6px 12px;font-weight:700;cursor:pointer;font-size:13px}
.pot .pseg button.on{background:var(--pa);color:#1a1320;border-color:var(--pa)}
.pot .pchip{display:inline-block;font-size:11px;font-weight:800;padding:2px 8px;border-radius:999px;border:1px solid var(--pe);background:var(--pp2)}
.pot .pcard{background:var(--pp);border:1px solid var(--pe);border-radius:16px;padding:14px}
.pot .pf2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 10px}.pot .pf2 .full{grid-column:1/-1}@media(max-width:560px){.pot .pf2{grid-template-columns:1fr}}
.pot-scrim{position:fixed;inset:0;background:#0b060ed9;display:none;align-items:flex-start;justify-content:center;z-index:200;padding:22px 12px;overflow:auto}
.pot-scrim.on{display:flex}.pot-modal{width:min(680px,100%);position:relative;background:var(--pp);border:1px solid var(--pe);border-radius:18px;padding:18px;box-shadow:0 20px 50px #000a}
.pot-modal .px{position:absolute;top:10px;right:12px}
.pot-toasts{position:fixed;right:12px;bottom:12px;display:flex;flex-direction:column;gap:6px;z-index:300;align-items:flex-end;max-width:92vw}
.pot-toast{background:#f6ead8;color:#2a1a24;border-radius:14px;padding:8px 14px;font-weight:700;box-shadow:0 6px 20px #000a;max-width:380px;font-family:system-ui,sans-serif}
`;
function injectCSS() { if ($('#pot-css')) return; const s = document.createElement('style'); s.id = 'pot-css'; s.textContent = CSS; document.head.appendChild(s); }

/* ---------- modal + toast (self-contained) ---------- */
let scrim, modalEl, toasts;
function ensureShell() {
  if (scrim) return; injectCSS();
  scrim = document.createElement('div'); scrim.className = 'pot pot-scrim';
  scrim.innerHTML = '<div class="pot-modal" role="dialog" aria-modal="true"></div>'; document.body.appendChild(scrim);
  modalEl = $('.pot-modal', scrim);
  scrim.addEventListener('click', e => { if (e.target === scrim && !scrim.dataset.lock) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && scrim.classList.contains('on') && !scrim.dataset.lock) close(); });
  toasts = document.createElement('div'); toasts.className = 'pot-toasts'; toasts.setAttribute('aria-live', 'polite'); document.body.appendChild(toasts);
}
function modal(html, lock) {
  ensureShell(); scrim.dataset.lock = lock ? '1' : '';
  const fresh = document.createElement('div'); fresh.className = 'pot-modal'; fresh.setAttribute('role', 'dialog'); fresh.setAttribute('aria-modal', 'true');
  modalEl.replaceWith(fresh); modalEl = fresh;   // fresh node = no leftover listeners from the last modal
  modalEl.innerHTML = (lock ? '' : '<button class="pbtn sm px" data-pclose aria-label="Close">✕</button>') + html;
  scrim.classList.add('on'); scrim.scrollTop = 0;
  $$('[data-pclose]', modalEl).forEach(b => b.addEventListener('click', close));
  const f = $('input,select,textarea', modalEl); if (f) setTimeout(() => f.focus(), 30);
  return modalEl;
}
function close() { if (scrim) { scrim.classList.remove('on'); scrim.dataset.lock = ''; } }
function toast(t) { ensureShell(); const e = document.createElement('div'); e.className = 'pot-toast'; e.textContent = t; toasts.appendChild(e); while (toasts.children.length > 3) toasts.firstChild.remove(); setTimeout(() => e.remove(), 4200); }

/* ---------- state ---------- */
const D = { user: null, me: null, house: null, members: [], accounts: [], cats: [], budgets: [], tx: [], bills: [], paid: [], rules: {}, settings: { income_monthly: 0 }, events: [] };
let sb = null, skinKey = 'neutral', listeners = [];
const skin = () => SKINS[skinKey] || SKINS.neutral;
const emit = () => listeners.forEach(f => { try { f(D); } catch (e) { console.error(e); } });

async function q(p) { const { data, error } = await p; if (error) throw error; return data; }

async function loadAll() {
  if (!D.me) return;
  const since = shiftMonth(monthKey(), -13) + '-01';
  const [house, members, accounts, cats, budgets, tx, bills, paid, rules, settings, events] = await Promise.all([
    q(sb.from('pot_households').select('*').single()),
    q(sb.from('pot_members').select('*')),
    q(sb.from('pot_accounts').select('*').order('created_at')),
    q(sb.from('pot_categories').select('*').order('tier').order('sort')),
    q(sb.from('pot_budgets').select('*')),
    q(sb.from('pot_tx').select('*').gte('date', since).order('date', { ascending: false }).limit(5000)),
    q(sb.from('pot_bills').select('*').order('created_at')),
    q(sb.from('pot_bill_paid').select('*').gte('month', shiftMonth(monthKey(), -3))),
    q(sb.from('pot_rules').select('*')),
    q(sb.from('pot_settings').select('*').maybeSingle()),
    q(sb.from('pot_events').select('*').gte('date', shiftMonth(monthKey(), -2) + '-01').order('date')),
  ]);
  Object.assign(D, { house, members, accounts, cats, budgets, tx, bills, paid, events, settings: settings || { income_monthly: 0 } });
  D.rules = {}; rules.filter(r => r.owner === D.user.id).forEach(r => D.rules[r.merchant] = r.value);
  if (!cats.length) { await seedCategories(); return loadAll(); }
  // does the database have the balance_set_at column yet? (pot/setup/02_pot_fixes.sql)
  if (D.hasSetAt === undefined) D.hasSetAt = accounts.length ? 'balance_set_at' in accounts[0] : !(await sb.from('pot_accounts').select('balance_set_at').limit(1)).error;
  emit();
  if (readyResolve) { const r = readyResolve; readyResolve = null; r(D); }
}
async function seedCategories() {
  await q(sb.from('pot_categories').upsert(DEFAULT_CATS.map(([id, name, tier], i) => ({ household_id: D.me.household_id, id, name, tier, sort: i * 10 })), { onConflict: 'household_id,id', ignoreDuplicates: true }));
}

/* ---------- computations ---------- */
const memberOf = uid => D.members.find(m => m.user_id === uid) || { display_name: '?', emoji: '•' };
const catOf = id => D.cats.find(c => c.id === id) || { id, name: id || 'Uncategorized', tier: 2 };
const isCredit = a => a && a.kind === 'credit';
// a balance counts everything up to the moment it was set; entries on that same day
// count only if they were added afterwards (so today's coffee still lowers today's balance)
function estBalance(a) {
  const setAt = a.balance_set_at ? Date.parse(a.balance_set_at) : null;
  const after = D.tx.filter(t => t.account_id === a.id &&
    (t.date > a.balance_date || (t.date === a.balance_date && setAt && Date.parse(t.created_at) > setAt)))
    .reduce((s, t) => s + (+t.out_amt), 0);
  return r2(isCredit(a) ? +a.balance + after : +a.balance - after);
}
const balanceStamp = rec => (D.hasSetAt ? Object.assign(rec, { balance_set_at: new Date().toISOString() }) : rec);
function potCash(owner) {
  let cash = 0, debt = 0;
  D.accounts.filter(a => !a.archived && (!owner || a.owner === owner)).forEach(a => { const b = estBalance(a); if (isCredit(a)) debt += b; else cash += b; });
  return { cash: r2(cash), debt: r2(debt), net: r2(cash - debt) };
}
const budgetOf = (cat, owner) => D.budgets.filter(b => b.category === cat && (!owner || b.owner === owner)).reduce((s, b) => s + (+b.amount), 0);
const totalBudget = owner => D.budgets.filter(b => !owner || b.owner === owner).reduce((s, b) => s + (+b.amount), 0);
const monthTx = (m, owner) => D.tx.filter(t => monthKey(t.date) === m && (!owner || t.owner === owner));
const spentIn = (m, cat, owner) => monthTx(m, owner).filter(t => t.type === 'expense' && t.category === cat).reduce((s, t) => s + (+t.out_amt), 0);
/* Which bills did this month's charges pay? Each charge can pay only one bill.
   1. charges whose description names the bill (part-payments add up)
   2. one charge of about the right amount in the bill's category
   3. split payments: the rest of that category adds up to the bill (rent paid half each) */
const BILL_STOP = new Set(['BILL', 'BILLS', 'PAYMENT', 'CARD', 'THE', 'AND', 'MONTHLY', 'FULL', 'SUBSCRIPTION', 'PLAN']);
const billWords = b => normDesc(b.name).replace(/[^A-Z0-9 ]/g, ' ').split(' ').filter(w => w.length >= 4 && !BILL_STOP.has(w));
let matchCache = { tx: null, bills: null, byMonth: {} };
function billMatches(m) {
  if (matchCache.tx !== D.tx || matchCache.bills !== D.bills) matchCache = { tx: D.tx, bills: D.bills, byMonth: {} };
  if (matchCache.byMonth[m]) return matchCache.byMonth[m];
  const map = {}, used = new Set(), near = (x, amt) => Math.abs(x - amt) <= Math.max(2, amt * .15);
  const T = monthTx(m).filter(t => t.type === 'expense' && +t.out_amt > 0);
  const free = b => T.filter(t => !used.has(t.id) && t.category === b.category);
  const bills = D.bills.filter(b => b.active && b.kind !== 'oneoff' && b.category && +b.amount > 0);
  bills.forEach(b => {
    const W = billWords(b); if (!W.length) return;
    const hits = free(b).filter(t => W.some(w => normDesc(t.note).includes(w)));
    if (hits.length && hits.reduce((s, t) => s + +t.out_amt, 0) >= +b.amount * .85) { hits.forEach(t => used.add(t.id)); map[b.id] = true; }
  });
  bills.filter(b => !map[b.id]).sort((x, y) => +y.amount - +x.amount).forEach(b => {
    const t = free(b).find(t => near(+t.out_amt, +b.amount)); if (t) { used.add(t.id); map[b.id] = true; }
  });
  bills.filter(b => !map[b.id]).forEach(b => {
    const rest = free(b); if (rest.length >= 2 && near(rest.reduce((s, t) => s + +t.out_amt, 0), +b.amount)) { rest.forEach(t => used.add(t.id)); map[b.id] = true; }
  });
  return (matchCache.byMonth[m] = map);
}
function billPaid(b, m) {
  if (D.paid.some(p => p.bill_id === b.id && p.month === m)) return 'marked';
  if (b.kind === 'oneoff') return false;
  return billMatches(m)[b.id] ? 'matched' : false;
}
function nextDue(b, from = new Date()) {
  if (b.kind === 'oneoff') return b.due_date ? new Date(b.due_date + 'T12:00') : null;
  if (!b.due_day) return null;
  const mk = d => { const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return new Date(d.getFullYear(), d.getMonth(), Math.min(b.due_day, last), 12); };
  let d = mk(from); const m = monthKey(iso(d)), born = (b.created_at || '').slice(0, 10);
  if (billPaid(b, m) || (born && iso(d) < born)) d = mk(new Date(from.getFullYear(), from.getMonth() + 1, 1));
  return d;
}
// bills ticked paid on this page stay in the list (ticked) so a second tap undoes it
const justMarked = new Set();
function dueIn(b, m) { const [y, mo] = m.split('-').map(Number), last = new Date(y, mo, 0).getDate(); return new Date(y, mo - 1, Math.min(b.due_day, last), 12); }
function upcoming(days = 35) {
  const now = new Date(), end = new Date(now.getTime() + days * 864e5), out = [];
  D.bills.filter(b => b.active && b.kind !== 'oneoff' && b.due_day).forEach(b => {
    [...justMarked].filter(k => k.startsWith(b.id + '|')).forEach(k => { const m = k.split('|')[1], paid = billPaid(b, m); if (paid) out.push({ b, d: dueIn(b, m), m, paid, late: false }); });
  });
  D.bills.filter(b => b.active).forEach(b => {
    const d = nextDue(b, now); if (!d) return;
    const m = monthKey(iso(d)); const paid = billPaid(b, m);
    if (b.kind === 'oneoff' && paid) return;
    if (d <= end || (d < now && !paid)) out.push({ b, d, m, paid, late: d < new Date(today() + 'T00:00') && !paid });
  });
  return out.sort((a, b) => a.d - b.d);
}
function runway() {
  const { net } = potCash(), burn = totalBudget(), inc = +D.settings.income_monthly || 0, per = burn - inc;
  const oneoffs = D.bills.filter(b => b.active && b.kind === 'oneoff' && b.due_date && !billPaid(b, monthKey(b.due_date)));
  const m0 = monthKey(), left0 = D.cats.reduce((s, c) => s + Math.max(0, budgetOf(c.id) - spentIn(m0, c.id)), 0);
  let c = net, months = 0, out = null; const now = new Date();
  for (let i = 0; i < 60; i++) {
    const m = monthKey(iso(new Date(now.getFullYear(), now.getMonth() + i, 1)));
    c -= oneoffs.filter(b => monthKey(b.due_date) === m).reduce((s, b) => s + (+b.amount), 0);
    c -= i === 0 ? Math.max(0, left0 - inc * (1 - now.getDate() / 31)) : per;
    if (c < 0) { out = m; break; }
    if (i > 0) months++;
    if (per <= 0 && i > 12) break;
  }
  return { net, burn, inc, months, out, oneoffs };
}
const normDesc = d => String(d || '').toUpperCase().replace(/\s+/g, ' ').trim();
const merchKey = d => normDesc(d).replace(/\d{3,}|#\S*|\*\S*|\b(POS|DEBIT|PURCHASE|CARD|RECURRING|PENDING|ACH|WEB|PPD|ID:?)\b/g, '').replace(/[^A-Z&' ]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ');
function subscriptionHints() {
  const g = {};
  D.tx.filter(t => t.type === 'expense' && t.note).forEach(t => { const k = merchKey(t.note); if (!k) return; (g[k] = g[k] || []).push(t); });
  const named = D.bills.map(b => normDesc(b.name));
  return Object.entries(g).map(([k, L]) => {
    const months = [...new Set(L.map(t => monthKey(t.date)))]; if (months.length < 2) return null;
    const amts = L.map(t => +t.out_amt), avg = amts.reduce((a, b) => a + b, 0) / amts.length;
    if (avg <= 0 || amts.some(a => Math.abs(a - avg) > Math.max(1.5, avg * .12))) return null;
    if (named.some(n => n.includes(k) || k.includes(n.split(' ')[0]))) return null;
    const day = Math.round(L.reduce((s, t) => s + +t.date.slice(8), 0) / L.length);
    return { key: k, avg: r2(avg), months: months.length, day, cat: L[0].category, owner: L[0].owner };
  }).filter(Boolean).sort((a, b) => b.months - a.months);
}

/* ---------- importer ---------- */
const AUTO_RULES = [
  [/WELLS ?FARGO.*(CARD|CRD|PMT|PAYMENT)/, 'debt'],
  [/AUTOPAY|AUTO PAY|PAYMENT THANK|THANK YOU|ONLINE PAYMENT|EPAYMENT|E-PAYMENT|CRCARDPMT|CREDIT CRD|CARD ?PMT|PAYMENT - |MOBILE PAYMENT|AMEX EPAY|AMERICAN EXPRESS ACH|CHASE CREDIT|ONLINE TRANSFER|TRANSFER TO|TRANSFER FROM|INTERNAL TRANSFER|DISCOVER E-PAYMENT|CAPITAL ONE.*PMT|CITI.*PAYMENT/, 'transfer'],
  [/PAYROLL|DIRECT DEP|DIR DEP|SALARY/, 'income:Paycheck'],
  [/SUNY|NEW PALTZ.*(REFUND|FIN AID)|FINANCIAL AID|DEPT OF ED|STUDENT AID/, 'income:Aid refund'],
  [/APARTMENT|PROPERTY MGMT|\bRENT\b|YARDI|APPFOLIO|RENTCAFE/, 'rent'],
  [/LEMONADE|RENTERS|ASSURANT/, 'renters'],
  [/CENTRAL HUDSON|CON ?ED|NYSEG|ELECTRIC|NATIONAL GRID|RELIANT|TXU|CENTERPOINT/, 'utilities'],
  [/SPECTRUM|OPTIMUM|XFINITY|COMCAST|VERIZON FIOS|FRONTIER|STARLINK/, 'internet'],
  [/T-MOBILE|TMOBILE|VERIZON WIRELESS|AT&T|ATT\*|MINT MOBILE|VISIBLE/, 'phone'],
  [/GEICO|PROGRESSIVE|STATE FARM|ALLSTATE|USAA|LIBERTY MUTUAL|INSURANCE PREM/, 'carins'],
  [/CVS|WALGREENS|RITE AID|PHARMACY|URGENT CARE|MEDICAL|CLINIC|HOSPITAL|DENTAL|LABCORP|QUEST DIAG|COPAY/, 'medical'],
  [/CHEWY|PETCO|PETSMART|VETERINAR|\bVET\b|BANFIELD/, 'pets'],
  [/HANNAFORD|SHOPRITE|STOP ?& ?SHOP|PRICE ?CHOPPER|ALDI|TRADER JOE|WHOLE FOODS|WEGMANS|H-?E-?B\b|KROGER|PUBLIX|INSTACART|GROCER|SUPERMARKET|MARKET BASKET|COSTCO WHSE|SAM'?S CLUB|FOOD LION/, 'groceries'],
  [/SHELL|EXXON|MOBIL|SUNOCO|CITGO|STEWART'?S|SPEEDWAY|CUMBERLAND|BP#|\bBP\b|CHEVRON|VALERO|BUC-?EE|GAS ?STATION|FUEL|MURPHY|QUIKTRIP|COSTCO GAS/, 'gas'],
  [/JIFFY|AUTOZONE|ADVANCE AUTO|O'?REILLY|FIRESTONE|MIDAS|DMV|INSPECTION|CAR WASH|TIRE/, 'carupkeep'],
  [/BOOKSTORE|CHEGG|PEARSON|MCGRAW|CENGAGE|TEXTBOOK|BARNES|VITALSOURCE|AAMC/, 'books'],
  [/TARGET|WALMART|WAL-MART|DOLLAR TREE|DOLLAR GENERAL|HOME DEPOT|LOWE'?S|IKEA|BJ'?S/, 'household'],
  [/STARBUCKS|DUNKIN|DOORDASH|UBER ?EATS|GRUBHUB|POSTMATES|MCDONALD|CHICK-?FIL|CHIPOTLE|TACO BELL|WENDY|SUBWAY|PANERA|RESTAURANT|CAFE|COFFEE|PIZZA|DINER|BAR & GRILL|TST\*|TOAST|SWEETGREEN|SONIC|WHATABURGER|KOLACHE|BAKERY|BRUNCH|GRILL|SUSHI|TAQUER/, 'dining'],
  [/YOGA|GYM|PLANET FITNESS|CLASSPASS|SALON|BARBER|NAIL|SPA\b|ULTA|SEPHORA|MINDBODY|PELOTON/, 'selfcare'],
  [/AMAZON|AMZN|ETSY|SHEIN|TJ ?MAXX|MARSHALLS|\bROSS\b|OLD NAVY|KOHL|NORDSTROM|EBAY|TEMU|BEST BUY|APPLE STORE/, 'shopping'],
  [/NETFLIX|SPOTIFY|HULU|DISNEY|MAX\.COM|HBO|YOUTUBE|APPLE\.COM\/BILL|ITUNES|AUDIBLE|PATREON|ADOBE|ICLOUD|GOOGLE \*|PRIME VIDEO|CRUNCHYROLL|PARAMOUNT|PEACOCK|OPENAI|ANTHROPIC|CLAUDE\.AI|DUOLINGO|NYTIMES|LIBRO/, 'subs'],
  [/SMOKE|VAPE|HEMP|CBD|DISPENSARY|TOBACCO|HEADSHOP|CANNABIS/, 'smoke'],
  [/AMC |REGAL|CINEMA|THEATER|THEATRE|TICKETMASTER|STEAM|PLAYSTATION|XBOX|NINTENDO|BOWL|EVENTBRITE|MUSEUM/, 'fun'],
  [/AIRLINE|DELTA AIR|UNITED AIR|AMERICAN AIR|SOUTHWEST|JETBLUE|AMTRAK|HOTEL|MARRIOTT|HILTON|AIRBNB|EXPEDIA|FLORIST|1-800-FLOWERS|HALLMARK/, 'gifts'],
];
const ALWAYS_ASK = /VENMO|ZELLE|CASH ?APP|PAYPAL|\bATM\b|WITHDRAWAL|CHECK ?#?\d|\bDEPOSIT\b|SQUARE CASH|APPLE CASH/;
function classify(desc, out) {
  const Dn = normDesc(desc), mk = merchKey(desc);
  if (D.rules[mk]) return { how: 'learned', v: D.rules[mk] };
  if (ALWAYS_ASK.test(Dn)) return null;
  for (const [re, v] of AUTO_RULES) if (re.test(Dn)) { if (v.startsWith('income:') && out > 0) return null; if (!v.startsWith('income:') && v !== 'transfer' && !D.cats.some(c => c.id === v)) return null; return { how: 'rule', v }; }
  return null;
}
function parseCSV(text) {
  const rows = []; let row = [], f = '', qt = false; text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (qt) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else qt = false; } else f += c; }
    else if (c === '"') qt = true; else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x.trim())) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(x => x.trim())) rows.push(row); return rows;
}
const numOf = s => { s = String(s || '').trim(); if (!s) return NaN; const neg = /^\(.*\)$/.test(s) || /^-/.test(s) || /-$/.test(s); const n = parseFloat(s.replace(/[^0-9.]/g, '')); return isNaN(n) ? NaN : neg ? -n : n; };
function toISO(s) {
  s = String(s || '').trim(); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${pad(+m[1])}-${pad(+m[2])}`; }
  return null;
}
function readStatement(text, acct) {
  const t = text.trim();
  if (t.startsWith('[')) {
    const a = JSON.parse(t);
    return { rows: a.map(x => ({ date: toISO(x.date), desc: x.desc || x.note || '', out: x.type === 'income' ? -Math.abs(+x.amt) : Math.abs(+x.amt) * (x.refund ? -1 : 1), pre: x.type === 'transfer' ? 'transfer' : x.type === 'income' ? 'income:' + (x.src || 'Other') : x.cat || null })), balance: null };
  }
  const R = parseCSV(text); if (!R.length) throw new Error('empty');
  const H = R[0].map(h => h.trim().toLowerCase()), hasHead = H.some(h => /date|description|amount|debit|credit|payee|details/.test(h));
  let iD, iDesc, iAmt = -1, iDeb = -1, iCred = -1, iBal = -1, body;
  if (hasHead) {
    body = R.slice(1); const f = re => H.findIndex(h => re.test(h));
    iD = f(/^(transaction date|trans\.? date|date|posting date|posted date)$/); if (iD < 0) iD = f(/date/);
    iDesc = f(/^description$/); if (iDesc < 0) iDesc = f(/^(payee|merchant|name|memo)$/); if (iDesc < 0) iDesc = f(/desc|payee|merchant|name/);
    iAmt = f(/^amount$|^amount \(usd\)$|^transaction amount$/); iDeb = f(/debit|withdrawal|charges?$/); iCred = f(/credit|deposit|payments?$/); if (iAmt < 0 && iDeb < 0) iAmt = f(/amount/);
    iBal = f(/^(balance|running balance|available balance)$/);
  } else {
    body = R; const w = R[0]; iD = w.findIndex(x => toISO(x));
    iAmt = w.findIndex((x, i) => i !== iD && !isNaN(numOf(x)) && /\d/.test(x));
    let best = -1, bl = 0; w.forEach((x, i) => { if (i !== iD && i !== iAmt && x.length > bl && /[a-z]/i.test(x)) { best = i; bl = x.length; } }); iDesc = best;
  }
  if (iD < 0 || iDesc < 0 || (iAmt < 0 && iDeb < 0)) throw new Error('columns');
  const bals = [];
  const rows = body.map(r => {
    let amt; if (iAmt >= 0) amt = numOf(r[iAmt]); else { const d = numOf(r[iDeb]), c = numOf(r[iCred]); amt = !isNaN(d) && d !== 0 ? -Math.abs(d) : !isNaN(c) ? Math.abs(c) : NaN; }
    const row = { date: toISO(r[iD]), desc: (r[iDesc] || '').trim(), raw: amt };
    if (iBal >= 0 && row.date) { const b = numOf(r[iBal]); if (!isNaN(b)) bals.push({ date: row.date, amt: b }); }
    return row;
  }).filter(r => r.date && !isNaN(r.raw) && r.raw !== 0);
  // the account's balance = the running balance after the LAST entry of the latest day.
  // Banks list newest-first or oldest-first, so on that day take the top row or the bottom row to match.
  let balance = null;
  if (bals.length) {
    const newestFirst = bals[0].date > bals[bals.length - 1].date, latest = bals.reduce((m, b) => b.date > m ? b.date : m, bals[0].date);
    const onLatest = bals.filter(b => b.date === latest);
    balance = newestFirst ? onLatest[0] : onLatest[onLatest.length - 1];
  }
  let flip = false;
  if (iAmt >= 0 && isCredit(acct)) {
    const nonpay = rows.filter(r => !/PAYMENT|THANK YOU|AUTOPAY/.test(normDesc(r.desc)));
    flip = nonpay.filter(r => r.raw > 0).length > nonpay.filter(r => r.raw < 0).length;
  }
  rows.forEach(r => { r.out = r2(flip ? r.raw : -r.raw); });
  return { rows, balance };
}
const fpOf = (acctId, date, out, desc) => `${acctId}|${date}|${(+out).toFixed(2)}|${normDesc(desc).slice(0, 40)}`;
const labelOf = v => !v ? '?' : v === 'skip' ? 'Ignore' : v === 'transfer' ? 'Transfer (not spending)' : v.startsWith('income:') ? 'Came in: ' + v.slice(7) : catOf(v).name;
const INCOME_SRC = ['Paycheck', 'Contract work', 'Aid refund', 'Loan disbursement', 'Gift / family', 'Partner paid me back', 'Other'];

function catButtons() {
  return [1, 2, 3].map(t => `<div class="pmuted" style="font-size:12px;margin-top:8px">${skin().tiers[t][0]} ${esc(skin().tiers[t][1])}</div><div class="pseg">${D.cats.filter(c => c.tier === t).map(c => `<button data-a="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>`).join('');
}
function openImport(opts = {}) {
  const mine = D.accounts.filter(a => a.owner === D.user.id && !a.archived);
  if (!mine.length) { toast('Add your accounts first so I know where the money lives.'); return openAccounts(true); }
  const m = modal(`<h2>${esc(skin().importTitle)}</h2><p class="pmuted" style="margin-top:0">${esc(skin().importIntro)}</p>
   <label class="pl" for="pia">Which account is this file from?</label><select id="pia">${mine.map(a => `<option value="${a.id}" ${a.id === opts.account ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select>
   <label class="pl" for="pif">Statement file (CSV, or a file Claude made for you)</label><input type="file" id="pif" accept=".csv,.txt,.json,text/csv,application/json" multiple>
   <label class="pl" for="pip">Or paste it</label><textarea id="pip" rows="3" placeholder="Date,Description,Amount…"></textarea>
   <details style="margin-top:8px"><summary class="pmuted" style="cursor:pointer">Where do I get the CSV?</summary><div class="pmuted" style="font-size:13px;line-height:1.55;margin-top:6px">
   <b>Amex:</b> Statements & Activity → choose dates → Download → CSV.<br><b>Chase:</b> open the account → the ⬇ download icon → CSV.<br><b>Wells Fargo:</b> Account activity → Download → Comma delimited.<br><b>Other banks:</b> look for "Download" or "Export" on the activity page.<br>One account per upload so everything gets tagged right.</div></details>
   <div class="prow psp" style="margin-top:14px"><span></span><button class="pbtn main" id="pigo">Read it</button></div>`);
  $('#pigo', m).addEventListener('click', async () => {
    const acct = D.accounts.find(a => a.id === $('#pia', m).value), files = [...$('#pif', m).files], texts = [];
    for (const f of files) texts.push(await f.text()); if ($('#pip', m).value.trim()) texts.push($('#pip', m).value);
    if (!texts.length) return toast('Pick a file or paste one first.');
    let rows = [], balance = null;
    try { texts.forEach((t, fi) => { const r = readStatement(t, acct); r.rows.forEach(x => { x.file = fi; }); rows.push(...r.rows); if (r.balance && (!balance || r.balance.date >= balance.date)) balance = r.balance; }); }
    catch (e) { return toast("I couldn't read that file. Try the CSV download, or send it to Claude in chat."); }
    stage(rows, acct, balance);
  });
}
let IMP = null;
function stage(rows, acct, balance) {
  // two real $4.75 coffees on one day look identical, so number repeats within a file:
  // the 2nd one becomes "...#2". Re-importing the same file gives the same numbers, so it's still skipped.
  const seen = new Set(D.tx.map(t => t.fp).filter(Boolean)), repeats = {}, taken = new Set(); let dup = 0; const items = [];
  rows.forEach(r => {
    const base = fpOf(acct.id, r.date, r.out, r.desc), n = (repeats[(r.file || 0) + '|' + base] = (repeats[(r.file || 0) + '|' + base] || 0) + 1);
    const k = n === 1 ? base : `${base}#${n}`;
    if (seen.has(k) || taken.has(k)) { dup++; return; } taken.add(k);
    let c = r.pre ? { how: 'claude', v: r.pre } : classify(r.desc, r.out);
    if (c && r.out < 0 && !c.v.startsWith('income:') && c.v !== 'transfer') c = isCredit(acct) ? Object.assign(c, { refund: true }) : null;
    items.push(Object.assign({}, r, { fp: k, c, ans: c ? c.v : null }));
  });
  IMP = { items, dup, acct, balance };
  summary();
}
function summary() {
  const { items, dup, acct, balance } = IMP, ask = items.filter(x => !x.ans), auto = items.filter(x => x.ans);
  const m = modal(`<h2>📜 Read: ${esc(acct.name)}</h2><div class="pgrid" style="margin-top:8px">
    <div class="ptile"><div class="big pok">${auto.length}</div><small>sorted on their own</small></div>
    <div class="ptile"><div class="big ${ask.length ? 'pwarn' : 'pok'}">${ask.length}</div><small>need you</small></div>
    <div class="ptile"><div class="big pmuted">${dup}</div><small>already in the pot (skipped)</small></div></div>
    ${balance ? `<label class="prow" style="margin-top:12px;font-weight:700"><input type="checkbox" id="pbal" style="width:auto" checked> Also set ${esc(acct.name)}'s balance to ${money(balance.amt, 1)} (from the file, as of ${esc(balance.date)})</label>` : ''}
    ${auto.length ? `<details style="margin-top:10px"><summary class="pmuted" style="cursor:pointer">Peek at what I sorted (tap one to change it)</summary><div class="ptbl" style="max-height:260px">${auto.map(x => `<div class="prow psp" style="padding:5px 0;border-bottom:1px dashed var(--pe);cursor:pointer" data-fix="${esc(x.fp)}" tabindex="0"><span style="flex:1;min-width:150px;font-size:13px">${esc(x.date.slice(5))} · ${esc(x.desc.slice(0, 34))}</span><b style="font-size:13px">${money(Math.abs(x.out), 1)}</b><span class="pchip">${x.c && x.c.refund ? 'Refund · ' : ''}${esc(labelOf(x.ans))}</span></div>`).join('')}</div></details>` : ''}
    <div class="prow psp" style="margin-top:14px"><button class="pbtn" data-pclose>Cancel</button>${ask.length ? `<button class="pbtn main" id="piq">Answer ${ask.length} question${ask.length > 1 ? 's' : ''}</button>` : `<button class="pbtn main" id="pisave">Save ${items.length} entr${items.length === 1 ? 'y' : 'ies'}</button>`}</div>`);
  const qb = $('#piq', m); if (qb) qb.addEventListener('click', () => askNext());
  const sv = $('#pisave', m); if (sv) sv.addEventListener('click', () => commit(sv));
  const bal = $('#pbal', m); if (bal) bal.addEventListener('change', () => { IMP.useBalance = bal.checked; }); IMP.useBalance = !!balance;
  $$('[data-fix]', m).forEach(d => { const go = () => { const it = IMP.items.find(x => x.fp === d.dataset.fix); it.ans = null; it.c = null; askOne(it, summary); }; d.addEventListener('click', go); d.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
}
function askNext() { const left = IMP.items.filter(x => !x.ans); if (!left.length) return summary(); askOne(left[0], askNext, left.length); }
function askOne(it, then, nLeft) {
  const out = it.out > 0, mk = merchKey(it.desc), risky = ALWAYS_ASK.test(normDesc(it.desc));
  const m = modal(`<div class="prow psp" style="padding-right:44px"><h2 style="margin:0">${esc(skin().ask)}</h2>${nLeft ? `<span class="pchip">${nLeft} left</span>` : ''}</div>
   <div class="ptile" style="margin-top:10px;text-align:left"><div class="pmuted" style="font-size:13px">${esc(it.date)} · ${esc(IMP.acct.name)}</div><div style="font-weight:800;font-size:17px;word-break:break-word">${esc(it.desc)}</div>
   <div class="big ${out ? '' : 'pok'}">${out ? '' : '+'}${money(Math.abs(it.out), 1)}</div><small>${out ? 'money went out' : 'money came in'}</small></div>
   <div style="margin-top:8px">${out ? catButtons() + `<div class="pseg" style="margin-top:10px"><button data-a="transfer">↔ Transfer / card payment</button><button data-a="skip">Ignore it</button></div>`
     : `<div class="pseg">${INCOME_SRC.map(s => `<button data-a="income:${esc(s)}">${esc(s)}</button>`).join('')}</div><div class="pmuted" style="font-size:12px;margin-top:8px">Or it was a refund in a category:</div>${catButtons()}<div class="pseg" style="margin-top:10px"><button data-a="transfer">↔ Transfer between our accounts</button><button data-a="skip">Ignore it</button></div>`}</div>
   <label class="prow" style="margin-top:12px;font-weight:700"><input type="checkbox" id="plearn" style="width:auto" ${risky ? '' : 'checked'}> Always sort “${esc(mk || it.desc.slice(0, 20))}” this way</label>
   <div class="pmuted" style="font-size:12px">Leave this off for Venmo/Zelle-type things that change every time.</div>`);
  $$('[data-a]', m).forEach(b => b.addEventListener('click', async () => {
    const v = b.dataset.a; it.ans = v; it.c = { how: 'you', v, refund: !out && !v.startsWith('income:') && v !== 'transfer' && v !== 'skip' };
    if ($('#plearn', m).checked && mk && v !== 'skip') { D.rules[mk] = v; sb.from('pot_rules').upsert({ household_id: D.me.household_id, owner: D.user.id, merchant: mk, value: v }).then(() => {}); }
    then();
  }));
}
async function commit(btn) {
  btn.disabled = true; btn.textContent = 'Saving…';
  const { items, acct } = IMP; const rows = [];
  items.forEach(x => {
    const v = x.ans; if (!v || v === 'skip') return;
    const t = { household_id: D.me.household_id, owner: D.user.id, account_id: acct.id, date: x.date, out_amt: r2(x.out), note: x.desc.slice(0, 120), fp: x.fp };
    if (v === 'transfer') t.type = 'transfer'; else if (v.startsWith('income:')) { t.type = 'income'; t.source = v.slice(7); } else { t.type = 'expense'; t.category = v; }
    rows.push(t);
  });
  try {
    for (let i = 0; i < rows.length; i += 400) await q(sb.from('pot_tx').upsert(rows.slice(i, i + 400), { onConflict: 'household_id,fp', ignoreDuplicates: true }));
    if (IMP.useBalance && IMP.balance) await q(sb.from('pot_accounts').update(balanceStamp({ balance: r2(isCredit(acct) ? Math.abs(IMP.balance.amt) : IMP.balance.amt), balance_date: IMP.balance.date })).eq('id', acct.id));
  } catch (e) { btn.disabled = false; btn.textContent = 'Try again'; return toast('Saving failed: ' + e.message); }
  const n = rows.length; IMP = null; close(); toast(skin().done(n)); await loadAll();
  listeners.forEach(f => f.imported && f.imported(n));
}

/* ---------- manual entry ---------- */
/* out_amt = money that LEFT the account. On a credit card a charge is + and a payment is −
   (that's how card imports store it, and how estBalance counts it). A transfer has two
   sides, so it asks "from" and "to" and records one entry for each account picked. */
function transferRows(a, fromId, toId, base) {
  const rows = [];
  if (fromId) rows.push(Object.assign({}, base, { account_id: fromId, out_amt: r2(a) }));
  if (toId) rows.push(Object.assign({}, base, { account_id: toId, out_amt: r2(-a) }));
  if (!rows.length) rows.push(Object.assign({}, base, { account_id: null, out_amt: r2(a) }));
  return rows;
}
function openAddTx(preset = {}) {
  const mine = D.accounts.filter(a => a.owner === D.user.id && !a.archived); let type = preset.type || 'expense';
  const opts = (sel, none) => `<option value="">${none}</option>${mine.map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)}${isCredit(a) ? ' (card)' : ''}</option>`).join('')}`;
  const draw = () => {
    const cash = mine.find(a => !isCredit(a)), card = mine.find(isCredit);
    const m = modal(`<h2>🪙 Log money</h2><div class="pseg" id="ptt">${[['expense', 'Spent'], ['income', 'Came in'], ['transfer', 'Transfer / card payment']].map(([k, l]) => `<button data-t="${k}" class="${type === k ? 'on' : ''}">${l}</button>`).join('')}</div>
     <div class="pf2"><label class="pl">Amount ($)<input id="pamt" type="number" step=".01" min="0" inputmode="decimal" placeholder="0.00"></label><label class="pl">Date<input id="pdate" type="date" value="${today()}"></label>
     ${type === 'expense' ? `<label class="pl full">Category<select id="pcat">${[1, 2, 3].map(t => `<optgroup label="${esc(skin().tiers[t][1])}">${D.cats.filter(c => c.tier === t).map(c => `<option value="${esc(c.id)}" ${c.id === preset.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>`
       : type === 'income' ? `<label class="pl full">Source<select id="psrc">${INCOME_SRC.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>` : ''}
     ${type === 'transfer' ? `<label class="pl">From (where the money left)<select id="pfrom">${opts(cash && cash.id, '(outside / not tracked)')}</select></label><label class="pl">To (where it went, or the card you paid)<select id="pto">${opts(card && card.id, '(outside / not tracked)')}</select></label>
       <div class="full pmuted" style="font-size:13px;margin-top:8px">Paying a card from checking? From = checking, To = the card. Checking goes down and what you owe goes down. Transfers never count as spending.</div>`
       : `<label class="pl">Account<select id="pacct">${opts('', '(none / cash)')}</select></label>`}<label class="pl ${type === 'transfer' ? 'full' : ''}">Note<input id="pnote" placeholder="Hannaford, rent…"></label></div>
     <div class="prow psp" style="margin-top:14px"><span></span><button class="pbtn main" id="psv">Record it</button></div>`);
    $$('#ptt button', m).forEach(b => b.addEventListener('click', () => { type = b.dataset.t; draw(); }));
    const sv = $('#psv', m);
    sv.addEventListener('click', async () => {
      if (sv.disabled) return;
      const a = +$('#pamt', m).value; if (!(a > 0)) return toast('Enter an amount.');
      const base = { household_id: D.me.household_id, owner: D.user.id, date: $('#pdate', m).value, type, note: $('#pnote', m).value.trim() };
      let rows;
      if (type === 'transfer') {
        const from = $('#pfrom', m).value, to = $('#pto', m).value;
        if (from && from === to) return toast('From and To are the same account.');
        rows = transferRows(a, from, to, base);
      } else {
        const t = Object.assign(base, { account_id: $('#pacct', m).value || null, out_amt: r2(type === 'income' ? -a : a) });
        if (type === 'expense') t.category = $('#pcat', m).value; if (type === 'income') t.source = $('#psrc', m).value;
        rows = [t];
      }
      sv.disabled = true; sv.textContent = 'Saving…';   // locked while saving, so a double-tap can't save it twice
      try { await q(sb.from('pot_tx').insert(rows)); close(); toast(`Recorded ${money(a, 1)}`); loadAll(); }
      catch (e) { sv.disabled = false; sv.textContent = 'Try again'; toast('Saving failed: ' + e.message); }
    });
  }; draw();
}

/* ---------- accounts ---------- */
const KINDS = [['checking', 'Checking'], ['savings', 'Savings'], ['credit', 'Credit card'], ['cash', 'Cash']];
function openAccounts(fromSetup, after) {
  const mine = D.accounts.filter(a => a.owner === D.user.id && !a.archived), theirs = D.accounts.filter(a => a.owner !== D.user.id && !a.archived);
  const m = modal(`<h2>🏦 ${fromSetup ? 'Your accounts & balances' : 'Accounts & balances'}</h2>
   <p class="pmuted" style="margin-top:0">Your starting point. Type each account's <b>current</b> balance. For credit cards, type what you <b>owe</b>. After this, imports keep them estimated, and importing a checking CSV with a balance column updates it automatically.</p>
   <div id="paccl">${mine.map(a => acctRow(a)).join('')}</div>
   <button class="pbtn sm" id="padd" style="margin-top:6px">+ Add account</button>
   ${theirs.length ? `<h3 style="margin-top:16px">${esc(memberOf(theirs[0].owner).emoji)} ${esc(memberOf(theirs[0].owner).display_name)}'s accounts</h3>${theirs.map(a => `<div class="prow psp" style="padding:4px 0"><span>${esc(a.name)} <span class="pmuted" style="font-size:12px">${esc(kindName(a.kind))}</span></span><b>${money(estBalance(a), 1)}</b></div>`).join('')}` : ''}
   <div class="prow psp" style="margin-top:14px"><span class="pmuted" style="font-size:12px">Only you two can see these.</span><button class="pbtn main" id="pasave">${fromSetup ? 'Next' : 'Save'}</button></div>`);
  const blank = () => ({ id: '', name: '', kind: 'checking', balance: '' });
  if (!mine.length) $('#paccl', m).innerHTML = [{ ...blank(), name: 'Checking' }, { ...blank(), name: 'Credit card', kind: 'credit' }].map(acctRow).join('');
  $('#padd', m).addEventListener('click', () => $('#paccl', m).insertAdjacentHTML('beforeend', acctRow(blank())));
  m.addEventListener('click', e => { const x = e.target.closest('[data-arch]'); if (x) x.closest('[data-acc]').dataset.del = '1', x.closest('[data-acc]').style.opacity = .35; });
  $('#pasave', m).addEventListener('click', async e => {
    const btn = e.target; btn.disabled = true;
    try {
      for (const row of $$('[data-acc]', m)) {
        const id = row.dataset.acc, name = $('[name=n]', row).value.trim(), kind = $('[name=k]', row).value, bal = $('[name=b]', row).value;
        if (row.dataset.del) { if (id) await q(sb.from('pot_accounts').update({ archived: true }).eq('id', id)); continue; }
        if (!name) continue;
        const prev = D.accounts.find(a => a.id === id); const rec = { name, kind };
        if (bal !== '' && (!prev || +bal !== estBalance(prev) || prev.kind !== kind)) { rec.balance = r2(Math.abs(+bal) * (kind === 'credit' ? 1 : Math.sign(+bal) || 1)); rec.balance_date = today(); balanceStamp(rec); }
        if (id) await q(sb.from('pot_accounts').update(rec).eq('id', id));
        else await q(sb.from('pot_accounts').insert(balanceStamp(Object.assign({ household_id: D.me.household_id, owner: D.user.id, balance: 0, balance_date: today() }, rec))));
      }
      await loadAll(); close(); toast('Balances saved'); if (after) after();
    } catch (err) { btn.disabled = false; toast('Saving failed: ' + err.message); }
  });
}
const kindName = k => (KINDS.find(x => x[0] === k) || [k, k])[1];
function acctRow(a) {
  return `<div data-acc="${esc(a.id)}" class="pf2" style="background:var(--pp2);border:1px solid var(--pe);border-radius:12px;padding:4px 10px 10px;margin-bottom:8px">
   <label class="pl">Name<input name="n" value="${esc(a.name)}" placeholder="Chase checking, Amex Gold…"></label>
   <label class="pl">Type<select name="k">${KINDS.map(([k, l]) => `<option value="${k}" ${a.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label class="pl">${a.kind === 'credit' ? 'Amount owed now' : 'Balance now'} ($)<input name="b" type="number" step=".01" inputmode="decimal" value="${a.id ? esc(estBalance(a)) : ''}" placeholder="0.00"></label>
   <div class="prow" style="align-items:flex-end;justify-content:flex-end">${a.id ? `<span class="pmuted" style="font-size:11px;flex:1">Last set ${esc(a.balance_date)}</span>` : ''}<button class="pbtn sm" data-arch type="button">Remove</button></div></div>`;
}

/* ---------- budgets & categories ---------- */
function openBudgets(fromSetup, after) {
  const mine = id => { const b = D.budgets.find(x => x.owner === D.user.id && x.category === id); return b ? +b.amount : (fromSetup && PRESET_BUDGET[D.me.theme] ? PRESET_BUDGET[D.me.theme][id] || 0 : 0); };
  const other = D.members.find(x => x.user_id !== D.user.id);
  const m = modal(`<h2>🧾 ${fromSetup ? 'Your monthly budget' : 'Budgets'}</h2>
   <p class="pmuted" style="margin-top:0">What <b>you</b> plan to spend each month in each category. ${other ? `${esc(other.display_name)} has their own numbers; the dashboard adds both together.` : 'Your partner will add their own numbers; the dashboard adds both together.'}</p>
   ${[1, 2, 3].map(t => `<h3>${skin().tiers[t][0]} ${esc(skin().tiers[t][1])}</h3><div class="pf2">${D.cats.filter(c => c.tier === t).map(c => `<label class="pl">${esc(c.name)}${other ? ` <span style="text-transform:none;letter-spacing:0;font-weight:600">(${esc(other.display_name)}: ${money(budgetOf(c.id, other.user_id))})</span>` : ''}<input type="number" min="0" step="1" data-bud="${esc(c.id)}" value="${mine(c.id)}"></label>`).join('')}</div>`).join('')}
   <div class="pcard" style="margin-top:12px"><b>Add a category</b><div class="pf2"><label class="pl">Name<input id="pnc" placeholder="Quincy, Date nights…"></label><label class="pl">Group<select id="pnt">${[1, 2, 3].map(t => `<option value="${t}" ${t === 2 ? 'selected' : ''}>${esc(skin().tiers[t][1])}</option>`).join('')}</select></label></div><button class="pbtn sm" id="pncadd" style="margin-top:8px">Add it</button></div>
   <div class="prow psp" style="margin-top:14px"><span class="pmuted">Your total: <b id="ptot"></b>/month</span><button class="pbtn main" id="pbsave">${fromSetup ? 'Next' : 'Save'}</button></div>`);
  const tot = () => { $('#ptot', m).textContent = money($$('[data-bud]', m).reduce((s, i) => s + (+i.value || 0), 0)); }; tot();
  m.addEventListener('input', tot);
  $('#pncadd', m).addEventListener('click', async () => {
    const name = $('#pnc', m).value.trim(); if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'cat' + Date.now() % 1e5;
    try { await saveBudgetInputs(m); await q(sb.from('pot_categories').insert({ household_id: D.me.household_id, id, name, tier: +$('#pnt', m).value, sort: 900 })); await loadAll(); openBudgets(fromSetup, after); } catch (e) { toast('Could not add: ' + e.message); }
  });
  $('#pbsave', m).addEventListener('click', async e => { e.target.disabled = true; try { await saveBudgetInputs(m); await loadAll(); close(); toast('Budget saved'); if (after) after(); } catch (err) { e.target.disabled = false; toast('Saving failed: ' + err.message); } });
}
async function saveBudgetInputs(m) {
  const rows = $$('[data-bud]', m).map(i => ({ household_id: D.me.household_id, owner: D.user.id, category: i.dataset.bud, amount: r2(Math.max(0, +i.value || 0)) }));
  if (rows.length) await q(sb.from('pot_budgets').upsert(rows, { onConflict: 'owner,category' }));
}

/* ---------- bills & subscriptions ---------- */
function openBills(fromSetup, after) {
  const preset = fromSetup && !D.bills.length ? (PRESET_BILLS[D.me.theme] || []) : [];
  const list = [...D.bills.filter(b => b.active), ...preset.map(p => Object.assign({ id: '', preset: 1 }, p))];
  const hints = fromSetup ? [] : subscriptionHints();
  const m = modal(`<h2>📅 Bills & subscriptions</h2>
   <p class="pmuted" style="margin-top:0">Everything that repeats, for both of you. Monthly ones need a due day. One-time big ones (like tuition) get a date. A bill turns "paid" when you tap it, or by itself when an imported charge in its category matches the amount.</p>
   ${hints.length ? `<div class="pcard" style="margin-bottom:10px"><b>🔎 Looks like subscriptions I found in your charges</b>${hints.slice(0, 6).map((h, i) => `<div class="prow psp" style="padding:4px 0"><span style="font-size:14px">${esc(h.key)} · ~${money(h.avg, 1)} · ${h.months} months</span><button class="pbtn sm" data-hint="${i}">+ Add</button></div>`).join('')}</div>` : ''}
   <div id="pbl">${list.map(billRow).join('')}</div>
   <div class="prow"><button class="pbtn sm" data-newb="bill">+ Bill</button><button class="pbtn sm" data-newb="subscription">+ Subscription</button><button class="pbtn sm" data-newb="oneoff">+ One-time</button></div>
   <div class="prow psp" style="margin-top:14px"><span></span><button class="pbtn main" id="pbsv">${fromSetup ? 'Finish' : 'Save'}</button></div>`);
  $$('[data-newb]', m).forEach(b => b.addEventListener('click', () => $('#pbl', m).insertAdjacentHTML('beforeend', billRow({ id: '', name: '', amount: '', kind: b.dataset.newb, due_day: '', due_date: '', category: b.dataset.newb === 'subscription' ? 'subs' : '' }))));
  $$('[data-hint]', m).forEach(b => b.addEventListener('click', () => { const h = hints[+b.dataset.hint]; $('#pbl', m).insertAdjacentHTML('beforeend', billRow({ id: '', name: h.key, amount: h.avg, kind: 'subscription', due_day: h.day, category: h.cat || 'subs' })); b.disabled = true; }));
  m.addEventListener('click', e => { const x = e.target.closest('[data-delb]'); if (x) { const r = x.closest('[data-bill]'); r.dataset.del = '1'; r.style.opacity = .35; } });
  $('#pbsv', m).addEventListener('click', async e => {
    e.target.disabled = true;
    try {
      // a kept bill with no amount would save as a $0 bill: ask first, before saving anything
      for (const r of $$('[data-bill]', m)) {
        const g = n => $(`[name=${n}]`, r), name = g('n').value.trim();
        if (r.dataset.del || !name || (r.dataset.preset && !g('keep').checked)) continue;
        const or = r.dataset.preset ? ', or untick it' : ', or tap Remove';
        if (!(+g('a').value > 0)) { e.target.disabled = false; g('a').focus(); return toast(`How much is ${name}? Type an amount${or}.`); }
        if (!g('d').value) { e.target.disabled = false; g('d').focus(); return toast(r.dataset.kind === 'oneoff' ? `What date is ${name} due? Pick one${or}.` : `What day of the month is ${name} due? Type it${or}.`); }
      }
      for (const r of $$('[data-bill]', m)) {
        const id = r.dataset.bill, g = n => $(`[name=${n}]`, r), name = g('n').value.trim();
        if (r.dataset.del) { if (id) await q(sb.from('pot_bills').update({ active: false }).eq('id', id)); continue; }
        if (!name || (r.dataset.preset && !g('keep').checked)) continue;
        const kind = r.dataset.kind, rec = { name, amount: r2(+g('a').value || 0), kind, category: g('c').value || null, autopay: g('ap').checked,
          due_day: kind === 'oneoff' ? null : (+g('d').value || null), due_date: kind === 'oneoff' ? (g('d').value || null) : null };
        if (id) await q(sb.from('pot_bills').update(rec).eq('id', id));
        else await q(sb.from('pot_bills').insert(Object.assign({ household_id: D.me.household_id, owner: D.user.id }, rec)));
      }
      await loadAll(); close(); toast('Bills saved'); if (after) after();
    } catch (err) { e.target.disabled = false; toast('Saving failed: ' + err.message); }
  });
}
function billRow(b) {
  const one = b.kind === 'oneoff';
  return `<div data-bill="${esc(b.id)}" data-kind="${esc(b.kind)}" ${b.preset ? 'data-preset="1"' : ''} class="pf2" style="background:var(--pp2);border:1px solid var(--pe);border-radius:12px;padding:4px 10px 10px;margin-bottom:8px">
   <label class="pl full">${b.preset ? `<input type="checkbox" name="keep" checked style="width:auto"> ` : ''}${one ? 'One-time' : b.kind === 'subscription' ? 'Subscription' : 'Bill'}<input name="n" value="${esc(b.name)}" placeholder="${one ? 'Tuition' : b.kind === 'subscription' ? 'Netflix' : 'Rent'}"></label>
   <label class="pl">Amount ($)<input name="a" type="number" step=".01" value="${esc(b.amount)}"></label>
   <label class="pl">${one ? 'Date' : 'Due day of month'}${one ? `<input name="d" type="date" value="${esc(b.due_date || '')}">` : `<input name="d" type="number" min="1" max="31" value="${esc(b.due_day || '')}">`}</label>
   <label class="pl">Category<select name="c"><option value="">(none)</option>${D.cats.map(c => `<option value="${esc(c.id)}" ${c.id === b.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
   <div class="prow" style="align-items:flex-end;justify-content:space-between"><label class="prow" style="font-size:13px;font-weight:700"><input type="checkbox" name="ap" style="width:auto" ${b.autopay ? 'checked' : ''}> Autopay</label>${b.id ? `<span class="pmuted" style="font-size:11px">${esc(memberOf(b.owner).emoji)}</span>` : ''}<button class="pbtn sm" data-delb type="button">Remove</button></div></div>`;
}
async function togglePaid(billId, m) {
  const b = D.bills.find(x => x.id === billId); if (!b) return;
  if (D.paid.some(p => p.bill_id === billId && p.month === m)) { await q(sb.from('pot_bill_paid').delete().eq('bill_id', billId).eq('month', m)); justMarked.delete(billId + '|' + m); }
  else { await q(sb.from('pot_bill_paid').insert({ bill_id: billId, month: m, household_id: D.me.household_id, paid_by: D.user.id })); justMarked.add(billId + '|' + m); }
  await loadAll();
}

/* ---------- settings bits ---------- */
async function setIncome(v) { await q(sb.from('pot_settings').upsert({ household_id: D.me.household_id, income_monthly: r2(v), updated_at: new Date().toISOString() })); await loadAll(); }
async function updateHouse(rec) { await q(sb.from('pot_households').update(rec).eq('id', D.me.household_id)); await loadAll(); }
async function deleteTx(id) { await q(sb.from('pot_tx').delete().eq('id', id)); await loadAll(); }
async function removeRule(k) { await q(sb.from('pot_rules').delete().eq('owner', D.user.id).eq('merchant', k)); delete D.rules[k]; emit(); }

/* full backup: Supabase free plan has no automatic backups, so this is the safety net */
async function exportAll() {
  const tables = ['pot_households', 'pot_members', 'pot_accounts', 'pot_categories', 'pot_budgets', 'pot_tx', 'pot_bills', 'pot_bill_paid', 'pot_rules', 'pot_settings', 'pot_events'], out = { exported_at: new Date().toISOString() };
  for (const t of tables) out[t] = await q(sb.from(t).select('*').limit(20000));
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `the-pot-backup-${today()}.json`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  localStorage.setItem('pot-last-backup', String(Date.now())); toast('💾 Backup downloaded');
}
function exportCSV() {
  const ce = v => `"${String(v ?? '').replace(/"/g, '""')}"`, acc = id => (D.accounts.find(a => a.id === id) || {}).name || '';
  const rows = [['Date', 'Who', 'Account', 'Type', 'Category / Source', 'Amount out', 'Note'], ...[...D.tx].sort((a, b) => a.date.localeCompare(b.date)).map(t => [t.date, memberOf(t.owner).display_name, acc(t.account_id), t.type, t.type === 'expense' ? catOf(t.category).name : t.source || '', (+t.out_amt).toFixed(2), t.note])];
  const blob = new Blob(['﻿' + rows.map(r => r.map(ce).join(',')).join('\r\n')], { type: 'text/csv' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `the-pot-transactions-${today()}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

/* ---------- auth + onboarding ---------- */
function openAuth(msg) {
  const m = modal(`<h2>🔐 Sign in to the Pot</h2><p class="pmuted" style="margin-top:0">${esc(msg || 'This is just for the two of you, so it uses a real email and password (not a village PIN).')}</p>
   <div class="pseg" id="pam"><button data-m="in" class="on">Sign in</button><button data-m="up">First time? Create login</button></div>
   <label class="pl" for="pem">Email</label><input id="pem" type="email" autocomplete="email">
   <label class="pl" for="ppw">Password (8+ characters)</label><input id="ppw" type="password" autocomplete="current-password">
   <div class="prow psp" style="margin-top:14px"><button class="pbtn sm" id="pforgot" type="button">Forgot password</button><button class="pbtn main" id="pgo">Sign in</button></div><div id="pamsg" class="pmuted" style="margin-top:8px;font-size:14px"></div>`, true);
  let mode = 'in';
  $$('#pam button', m).forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; $$('#pam button', m).forEach(x => x.classList.toggle('on', x === b)); $('#pgo', m).textContent = mode === 'in' ? 'Sign in' : 'Create login'; $('#ppw', m).autocomplete = mode === 'in' ? 'current-password' : 'new-password'; }));
  const say = t => $('#pamsg', m).textContent = t;
  $('#pgo', m).addEventListener('click', async () => {
    const email = $('#pem', m).value.trim(), password = $('#ppw', m).value; if (!email || password.length < 8) return say('Email and an 8+ character password, please.');
    $('#pgo', m).disabled = true;
    const res = mode === 'in' ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    $('#pgo', m).disabled = false;
    if (res.error) return say(res.error.message);
    if (mode === 'up' && !res.data.session) return say('Check your email for a confirmation link, then come back and sign in.');
    close(); await afterLogin();
  });
  $('#pforgot', m).addEventListener('click', async () => { const email = $('#pem', m).value.trim(); if (!email) return say('Type your email first.'); const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); say(error ? error.message : 'Reset link sent. Check your email.'); });
}
function openNewPassword() {
  const m = modal(`<h2>New password</h2><label class="pl" for="pnp">New password (8+ characters)</label><input id="pnp" type="password" autocomplete="new-password"><div class="prow psp" style="margin-top:14px"><span></span><button class="pbtn main" id="pnpgo">Save</button></div>`, true);
  $('#pnpgo', m).addEventListener('click', async () => { const p = $('#pnp', m).value; if (p.length < 8) return toast('8+ characters'); const { error } = await sb.auth.updateUser({ password: p }); if (error) return toast(error.message); close(); toast('Password updated'); afterLogin(); });
}
function openJoin(defTheme) {
  const m = modal(`<h2>Welcome to the Pot</h2><p class="pmuted" style="margin-top:0">One money pot, two games. First, who are you?</p>
   <div class="pf2"><label class="pl">Your name<input id="pjn" maxlength="30" placeholder="Bailey / PB"></label><label class="pl">Emoji<input id="pje" maxlength="4" value="${defTheme === 'dungeon' ? '⚔️' : '🌙'}"></label>
   <label class="pl full">Your game<select id="pjt"><option value="apothecary" ${defTheme !== 'dungeon' ? 'selected' : ''}>🌙 The Underworld Apothecary (Bailey)</option><option value="dungeon" ${defTheme === 'dungeon' ? 'selected' : ''}>⚔️ Med School Dungeon (PB)</option></select></label></div>
   <h3 style="margin-top:14px">Start the pot, or join one?</h3>
   <div class="pseg" id="pjm"><button data-m="new" class="on">Start our pot (first person)</button><button data-m="join">Join with a code (second person)</button></div>
   <div id="pjcode" style="display:none"><label class="pl" for="pjc">Invite code</label><input id="pjc" maxlength="12" style="text-transform:uppercase;letter-spacing:3px" placeholder="ABCD2345"></div>
   <div class="prow psp" style="margin-top:14px"><button class="pbtn sm" id="pjout" type="button">Sign out</button><button class="pbtn main" id="pjgo">Continue</button></div><div id="pjmsg" class="pbad" style="margin-top:8px"></div>`, true);
  let mode = 'new';
  $$('#pjm button', m).forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; $$('#pjm button', m).forEach(x => x.classList.toggle('on', x === b)); $('#pjcode', m).style.display = mode === 'join' ? '' : 'none'; }));
  $('#pjout', m).addEventListener('click', () => signOut());
  $('#pjgo', m).addEventListener('click', async () => {
    const name = $('#pjn', m).value.trim(), emoji = $('#pje', m).value.trim() || '🙂', theme = $('#pjt', m).value; if (!name) return $('#pjmsg', m).textContent = 'Name, please.';
    $('#pjgo', m).disabled = true;
    try {
      if (mode === 'new') {
        const code = await q(sb.rpc('pot_create', { p_name: 'The Pot', p_display: name, p_theme: theme, p_emoji: emoji }));
        await refreshMe(); await seedCategories(); await loadAll();
        const mm = modal(`<h2>✨ Your pot exists</h2><p>Give PB this invite code. It's shown <b>only once</b> (you can make a new one later in Settings):</p><div class="ptile"><div class="big" style="letter-spacing:6px">${esc(code)}</div></div><p class="pmuted">Only two people can ever join, and wrong guesses lock the code.</p><div class="prow psp" style="margin-top:12px"><span></span><button class="pbtn main" id="pnext">Next: balances</button></div>`, true);
        $('#pnext', mm).addEventListener('click', () => runSetup());
      } else {
        const h = await q(sb.rpc('pot_join', { p_code: $('#pjc', m).value, p_display: name, p_theme: theme, p_emoji: emoji }));
        if (!h) { $('#pjgo', m).disabled = false; return $('#pjmsg', m).textContent = 'That code did not match.'; }
        await refreshMe(); await loadAll(); runSetup();
      }
    } catch (e) { $('#pjgo', m).disabled = false; $('#pjmsg', m).textContent = e.message; }
  });
}
function runSetup() { openAccounts(true, () => openBudgets(true, () => openBills(true, () => { toast("You're all set up!"); emit(); }))); }
async function refreshMe() { D.me = (await q(sb.from('pot_members').select('*').eq('user_id', D.user.id).maybeSingle())) || null; if (D.me && !forcedSkin) skinKey = D.me.theme; }
let forcedSkin = null, readyResolve, defaultTheme = 'apothecary';
async function afterLogin() {
  const { data: { user } } = await sb.auth.getUser(); D.user = user;
  if (!user) return openAuth();
  await refreshMe();
  if (!D.me) return openJoin(defaultTheme);
  await loadAll(); if (readyResolve) { readyResolve(D); readyResolve = null; }
}
async function signOut() { await sb.auth.signOut(); Object.assign(D, { user: null, me: null }); close(); emit(); location.reload(); }

/* ---------- the reusable ledger panel (used in each game) ---------- */
function renderLedger(el, opts = {}) {
  injectCSS(); el.classList.add('pot');
  let view = opts.month || monthKey(), who = opts.owner === 'all' ? 'all' : 'me';
  const draw = () => {
    if (!D.me) { el.innerHTML = `<div class="pcard"><h3 style="margin-top:0">${esc(skin().name)}</h3><p class="pmuted">Sign in to connect to the shared money pot.</p><button class="pbtn main" data-act="login">Sign in</button></div>`; $('[data-act=login]', el).addEventListener('click', () => start({ prompt: true })); return; }
    const owner = who === 'me' ? D.user.id : null, pc = potCash(owner), all = potCash(), T = monthTx(view, owner);
    const spent = T.filter(t => t.type === 'expense').reduce((s, t) => s + +t.out_amt, 0), bud = totalBudget(owner);
    const accts = D.accounts.filter(a => !a.archived && (!owner || a.owner === owner));
    el.innerHTML = `<div class="prow psp"><div class="pseg"><button data-who="me" class="${who === 'me' ? 'on' : ''}">Just me</button><button data-who="all" class="${who === 'all' ? 'on' : ''}">Both of us</button></div>
      <div class="prow"><button class="pbtn sm" data-mv="-1" aria-label="Previous month">‹</button><b style="font-family:var(--phf);font-size:18px">${esc(monthLabel(view))}</b><button class="pbtn sm" data-mv="1" aria-label="Next month">›</button></div></div>
     <div class="pgrid" style="margin-top:10px">
      <div class="ptile"><div class="big ${all.net < 0 ? 'pbad' : ''}">${money(all.net)}</div><small>in the pot right now (both of you, cash minus card debt)</small></div>
      <div class="ptile"><div class="big">${money(pc.cash)}</div><small>${who === 'me' ? 'your' : 'our'} cash${pc.debt ? ` · ${money(pc.debt)} on cards` : ''}</small></div>
      <div class="ptile"><div class="pbar" style="height:14px"><i style="width:${bud ? Math.min(100, spent / bud * 100) : 0}%;background:${spent > bud ? 'var(--pr)' : spent > bud * .85 ? 'var(--po)' : 'var(--pg)'}"></i></div><div class="big">${money(spent)}</div><small>spent of ${money(bud)} ${who === 'me' ? 'your' : 'our'} budget</small></div></div>
     <div class="prow" style="margin-top:12px"><button class="pbtn main" data-act="import">${esc(skin().importBtn)}</button><button class="pbtn" data-act="add">+ Log money</button><button class="pbtn sm" data-act="accts">🏦 Balances</button><button class="pbtn sm" data-act="bud">🧾 Budget</button><button class="pbtn sm" data-act="bills">📅 Bills</button></div>
     ${accts.length ? `<div class="pgrid" style="margin-top:10px">${accts.map(a => `<div class="ptile" style="text-align:left;padding:8px 10px"><small>${esc(memberOf(a.owner).emoji)} ${esc(a.name)}</small><b class="${isCredit(a) ? 'pwarn' : ''}">${isCredit(a) ? 'owe ' : ''}${money(estBalance(a), 1)}</b></div>`).join('')}</div>` : ''}
     ${[1, 2, 3].map(t => { const cs = D.cats.filter(c => c.tier === t && (budgetOf(c.id, owner) > 0 || spentIn(view, c.id, owner) !== 0)); if (!cs.length) return ''; const ts = cs.reduce((s, c) => s + spentIn(view, c.id, owner), 0), tb = cs.reduce((s, c) => s + budgetOf(c.id, owner), 0);
       return `<h3>${skin().tiers[t][0]} ${esc(skin().tiers[t][1])} <span class="pmuted" style="font-size:13px;font-family:var(--pf)">${money(ts)} of ${money(tb)}</span></h3><div class="pjars">${cs.map(c => { const s = spentIn(view, c.id, owner), b = budgetOf(c.id, owner), p = b ? s / b : (s > 0 ? 2 : 0);
         return `<div class="pjar" data-cat="${esc(c.id)}" tabindex="0"><div class="nm">${esc(c.name)}</div><div class="pbar"><i style="width:${Math.min(100, p * 100)}%;background:${p > 1 ? 'var(--pr)' : p > .85 ? 'var(--po)' : t === 1 ? 'var(--pa)' : 'var(--pg)'}"></i></div><div class="amt">${money(s)} of ${money(b)}${p > 1 ? ` · <span class="pbad">over ${money(s - b)}</span>` : b - s > 0 ? ` · ${money(b - s)} left` : ''}</div></div>`; }).join('')}</div>`; }).join('')}
     <h3>Entries <span class="pmuted" style="font-size:13px;font-family:var(--pf)">${T.length}</span></h3>
     ${T.length ? `<div class="ptbl"><table><tr><th>Date</th><th>Amount</th><th>What</th><th class="pnc">Note</th><th>Who</th><th></th></tr>${T.map(t => `<tr><td>${esc(t.date.slice(5))}</td><td class="${t.type === 'income' ? 'pok' : ''}">${t.type === 'transfer' ? '↔ ' : t.type === 'income' ? '+' : ''}${money(Math.abs(+t.out_amt), 1)}${t.type === 'expense' && +t.out_amt < 0 ? ' refund' : ''}${t.type === 'transfer' ? `<small class="pmuted" style="display:block">${+t.out_amt < 0 ? 'in' : 'out'}</small>` : ''}</td><td>${esc(t.type === 'expense' ? catOf(t.category).name : t.type === 'income' ? t.source : 'Transfer')}${t.note ? `<small class="pnm">${esc(t.note)}</small>` : ''}</td><td class="pnc">${esc(t.note || '')}</td><td>${esc(memberOf(t.owner).emoji)}</td><td>${t.owner === D.user.id ? `<button class="pbtn sm" data-del="${t.id}" aria-label="Delete">✕</button>` : ''}</td></tr>`).join('')}</table></div>` : `<p class="pmuted">Nothing for this month yet. Import a statement to fill it in.</p>`}`;
    $$('[data-who]', el).forEach(b => b.addEventListener('click', () => { who = b.dataset.who; draw(); }));
    $$('[data-mv]', el).forEach(b => b.addEventListener('click', () => { view = shiftMonth(view, +b.dataset.mv); draw(); }));
    const act = { import: () => openImport(), add: () => openAddTx(), accts: () => openAccounts(), bud: () => openBudgets(), bills: () => openBills() };
    $$('[data-act]', el).forEach(b => b.addEventListener('click', () => act[b.dataset.act]()));
    $$('[data-cat]', el).forEach(j => { const go = () => openAddTx({ category: j.dataset.cat }); j.addEventListener('click', go); j.addEventListener('keydown', e => { if (e.key === 'Enter') go(); }); });
    $$('[data-del]', el).forEach(b => b.addEventListener('click', async () => { if (!b.dataset.c) { b.dataset.c = 1; b.textContent = 'Sure?'; return; } try { await deleteTx(b.dataset.del); } catch (e) { toast(e.message); } }));
  };
  const f = () => draw(); listeners.push(f); draw();
  return { redraw: draw, setMonth: m => { view = m; draw(); } };
}

/* ---------- boot ---------- */
let started = false, readyP = null;
function start(opts = {}) {
  if (opts.skin) { forcedSkin = opts.skin; skinKey = opts.skin; } if (opts.theme) defaultTheme = opts.theme;
  if (!readyP) readyP = new Promise(r => { readyResolve = r; });
  if (!sb) {
    if (!window.supabase) { console.error('supabase-js missing'); return readyP; }
    sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: CFG.storageKey, detectSessionInUrl: true } });
    sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') openNewPassword(); });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && D.me) loadAll().catch(() => {}); });
  }
  if (!started || opts.prompt) { started = true; ensureShell(); sb.auth.getSession().then(({ data }) => { if (data.session || opts.prompt) afterLogin().catch(e => toast(e.message)); }); }
  return readyP;
}

window.Pot = {
  start, D, on: f => { listeners.push(f); return f; }, loadAll, signOut, client: () => sb, skin: () => skin(), setSkin: k => { skinKey = k; forcedSkin = k; emit(); },
  // ui
  openAuth, openImport, openAddTx, openAccounts, openBudgets, openBills, renderLedger, modal, close, toast, exportAll, exportCSV,
  // data
  potCash, estBalance, totalBudget, budgetOf, spentIn, monthTx, upcoming, runway, billPaid, togglePaid, subscriptionHints, setIncome, updateHouse, removeRule, memberOf, catOf, labelOf,
  // utils
  esc, money, today, monthKey, shiftMonth, monthLabel, iso, pad, r2, q: p => q(p),
  // exposed for tests
  _parse: { parseCSV, readStatement, classify, merchKey },
};
})();

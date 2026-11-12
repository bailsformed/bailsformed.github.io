/* =====================================================================
   THE FAMILY VILLAGE
   Built for a family that shows love by roasting each other.
   ===================================================================== */
'use strict';

const CFG = {
  url: 'https://xsihxxwqbguxpvmhpdqo.supabase.co',
  key: 'sb_publishable_mMfWPoSYDQUqkCM4rUaccA_6_n8u4XL',   // publishable key: safe to be public
  name: 'The Family Village',
  tz: 'America/Chicago',
};

const sb = window.supabase.createClient(CFG.url, CFG.key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'family-village-auth' },
});

/* ---------- constants ---------- */
const AVATARS = ['🙂','😎','🤓','🥸','🤠','😈','👻','🤡','👑','🦊','🐻','🐼','🐨','🐯','🦁','🐸',
  '🐵','🦄','🐝','🦋','🐢','🦖','🐙','🦀','🐶','🐱','🐰','🦦','🦔','🍯','🌸','🌻',
  '🍀','🔥','⚡','🌙','⭐','🍕','🧁','🍤','🦞','🎸','🏈','⚜️','🩺','⚖️','📚','🧪'];
const COLORS = ['#e07a5f','#f29bb5','#f6c453','#8a6fd1','#5fa8d3','#4caf7a','#c9955c','#3b2f4a'];
const REACTS = ['🙄','🤡','👑','🧢','💀','🫡','who asked'];
const TABS = [
  ['home', '🏡', 'Village'], ['ws', '💪', 'Ws'], ['daily', '🎲', 'Daily'],
  ['quotes', '💬', 'Quotes'], ['kitchen', '🍽️', 'Kitchen'], ['awards', '🏆', 'Awards'],
];
const RESERVED = { '👑': 'is_admin', '🍯': 'is_honey' };
const canWear = (face, m) => !RESERVED[face] || !!(m && m[RESERVED[face]]);
const OLD_FOLKS_BONUS = 1.25;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* what Honey sees instead of Not-Safe-For-Honey content */
const DECOY = {
  win: [n => `${n} has been working so hard! So proud of this family 🥰`, n => `Another great day for ${n} 🌷`,
        n => `${n} is doing amazing things. Love y'all 💕`, n => `${n} remembered to drink water today 💧`,
        n => `${n} says thank you Honey for always believing in us 🙏`],
  comment: ['So proud of you! 🥰', "You're doing great, sweetie 💕", 'Love this!! 🌸', 'Keep it up ✨',
            'Proud of you 🙏', 'This family is so smart 🧠💕'],
  quote: ['Family is everything.', 'Drink some water and call your grandmother.', 'I love this family so much.',
          'Honey is always right.', "Y'all are my favorite people."],
  kitchen: ['Hope everyone is having a blessed day 🌞', "Love y'all!! 💕", 'Did everyone eat? 🍽️',
            "Thinking of y'all today 🌸", 'Call your grandmother 📞💕'],
};

/* the village's own commentary */
const VILLAGER = {
  checkin: ['Checked in. The bar was on the floor and they stepped over it.', 'Attendance noted. Participation trophy pending.',
            'Showing up is half the battle. The other half is still waiting.', 'A check-in. Riveting.'],
  short: ['{m} minutes? Cute.', '{m} whole minutes. Somebody call the newspaper.', 'A {m}-minute grind. Legends speak of it.'],
  long: ['{h} hours?? Okay nerd 🤓', 'Touch grass after this, {n}.', '{h} hours. Who are you trying to impress?'],
  work: ['{h} hours on the clock. The old heads are watching.', 'Clocked in. Clocked out. Clocked everyone.', '{h} hours of work. Somebody tell the youngins.'],
  win: ['Okay and? 🙄', "We'll see if it lasts.", 'Screenshot taken. For evidence.', 'Noted. Grudgingly.',
        'Bold of you to post this.', 'The bar has been raised. Slightly.'],
};

/* ---------- state ---------- */
const S = {
  uid: null, myId: null, me: null,
  members: [], byId: {}, streaks: {}, memes: [], memeById: {},
  tab: 'home', data: {}, picks: {}, draft: { kind: 'win', nsfh: false },
  prevSeen: null, results: {}, trophies: null, categories: [],
  kitchenLastId: 0, timers: [],
};

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
const pick = (arr, seed) => arr[hash(seed) % arr.length];
const chiDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: CFG.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const today = () => chiDate();
const monthKey = (d = today()) => d.slice(0, 7);
const yearKey = (d = today()) => d.slice(0, 4);
const monthName = pk => `${MONTHS[+pk.slice(5, 7) - 1]} ${pk.slice(0, 4)}`;
const nextMonth = pk => { let [y, m] = pk.split('-').map(Number); m++; if (m > 12) { m = 1; y++; } return `${y}-${String(m).padStart(2, '0')}`; };
const prevMonth = pk => { let [y, m] = pk.split('-').map(Number); m--; if (m < 1) { m = 12; y--; } return `${y}-${String(m).padStart(2, '0')}`; };
const range = pk => pk.length === 7 ? [`${pk}-01`, `${nextMonth(pk)}-01`] : [`${pk}-01-01`, `${+pk + 1}-01-01`];
const imgUrl = path => `${CFG.url}/storage/v1/object/public/reactions/${path}`;
const hrs = m => Math.round((m || 0) / 6) / 10;
const isHoney = () => !!(S.me && S.me.is_honey);
const hideIt = item => isHoney() && item && item.nsfh;
const nameOf = id => (S.byId[id] && S.byId[id].display_name) || 'Someone';
const avOf = id => (S.byId[id] && S.byId[id].avatar) || '👤';
const decoy = (kind, id, name) => { const x = pick(DECOY[kind], kind + id); return typeof x === 'function' ? x(name) : x; };

function ago(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function confetti(n = 24, set = ['🎉', '✨', '🌸', '⭐', '💪']) {
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti'; c.textContent = set[i % set.length];
    c.style.left = Math.random() * 100 + 'vw';
    c.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3200);
  }
}

async function q(promise, quiet) {
  const { data, error, count } = await promise;
  if (error) { if (!quiet) toast('😬 ' + (error.message || 'Something went wrong')); throw error; }
  return count !== undefined && count !== null && data === null ? count : data;
}

function modal(html) {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="modal panel"><button class="x" data-a="closeModal" aria-label="Close">×</button>${html}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }

function speak(text) {
  if (!('speechSynthesis' in window)) return toast('Read-aloud is not supported on this device');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text); u.rate = 0.95;
  speechSynthesis.speak(u);
}

/* =====================================================================
   BOOT & SIGN-IN
   ===================================================================== */
async function boot() {
  try {
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) throw error;
      session = data.session;
    }
    S.uid = session.user.id;
    const inv = location.hash.match(/^#invite=([0-9a-f]+)/);
    if (inv) {
      const { data: res } = await sb.rpc('redeem_invite', { p_token: inv[1] });
      history.replaceState(null, '', location.pathname);
      if (res !== 'ok') {
        S.form = { avatar: '🙂' };
        return renderWelcome('pick', { used: 'That invite link was already used. Ask for a fresh one!', expired: 'That invite link expired. Ask for a fresh one!' }[res] || "That invite link didn't work. Ask for a fresh one!");
      }
      S.justInvited = true;
    }
    const { data: dev, error } = await sb.from('member_devices').select('member_id').maybeSingle();
    if (error) throw error;
    if (!dev) return renderWelcome('pick');
    await enter(dev.member_id);
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = `<div class="wrap"><div class="panel pad center stack"><h2 class="px">🚧 The village gates are stuck</h2>
      <p class="muted">${esc(e.message || e)}</p><button class="btn" onclick="location.reload()">Try again</button></div></div>`;
  }
}

function avatarGrid(action, current, member) {
  return `<div class="avgrid">${AVATARS.map(a => {
    const ok = canWear(a, member);
    return `<button data-a="${action}" data-v="${a}" class="${current === a ? 'on' : ''}" ${ok ? '' : 'disabled title="Reserved"'}>${a}</button>`;
  }).join('')}</div>`;
}

function renderWelcome(mode, err = '') {
  const f = S.form || (S.form = { avatar: '🙂' });
  let body = '';
  if (mode === 'pick') {
    body = `<div class="center stack">
      <div style="font-size:64px">🏡</div>
      <h1 class="px">${esc(CFG.name)}</h1>
      <p class="muted">Where this family brags, roasts, and secretly cheers each other on.</p>
      <button class="btn big" data-a="welcome" data-m="join">🔑 I'm new here</button>
      <button class="btn big plain" data-a="welcome" data-m="login">👋 I've been here before</button>
      ${err ? `<p class="err">${esc(err)}</p>` : ''}
    </div>`;
  } else if (mode === 'join') {
    body = `<h2 class="px">🔑 Move into the village</h2>
      <label class="lbl">Family code</label><input id="f-code" autocomplete="off" placeholder="the secret phrase">
      <label class="lbl">Your name (what the family calls you)</label><input id="f-name" maxlength="30" autocomplete="off">
      <label class="lbl">Pick your face</label>
      ${avatarGrid('avPick', f.avatar, null)}
      <label class="lbl">Make a 4-digit PIN</label><input id="f-pin" class="pinbox" inputmode="numeric" maxlength="4" type="password" autocomplete="off">
      <label class="lbl">Type it again</label><input id="f-pin2" class="pinbox" inputmode="numeric" maxlength="4" type="password" autocomplete="off">
      <p class="err" id="f-err">${esc(err)}</p>
      <button class="btn big" data-a="join">Move in 🏡</button>
      <p class="center"><button class="more" data-a="welcome" data-m="pick">← back</button></p>`;
  } else {
    body = `<h2 class="px">👋 Welcome back</h2>
      <p class="muted tiny">New phone or cleared your browser? No problem.</p>
      <label class="lbl">Family code</label><input id="f-code" autocomplete="off">
      <label class="lbl">Your name</label><input id="f-name" autocomplete="off">
      <label class="lbl">Your PIN</label><input id="f-pin" class="pinbox" inputmode="numeric" maxlength="4" type="password" autocomplete="off">
      <p class="err" id="f-err">${esc(err)}</p>
      <button class="btn big" data-a="login">Let me in</button>
      <p class="center"><button class="more" data-a="welcome" data-m="pick">← back</button></p>`;
  }
  $('#app').innerHTML = `<div class="wrap" style="padding-top:30px"><div class="panel pad">${body}</div></div>`;
  S.welcomeMode = mode;
}

const keepForm = () => { ['code', 'name'].forEach(k => { const el = $('#f-' + k); if (el) S.form[k] = el.value; }); };
const restoreForm = () => { ['code', 'name'].forEach(k => { const el = $('#f-' + k); if (el && S.form[k]) el.value = S.form[k]; }); };

async function doJoin() {
  const code = $('#f-code').value.trim(), name = $('#f-name').value.trim();
  const pin = $('#f-pin').value.trim(), pin2 = $('#f-pin2').value.trim();
  const err = m => { $('#f-err').textContent = m; };
  if (!code || !name) return err('Fill in the family code and your name.');
  if (!/^\d{4}$/.test(pin)) return err('Your PIN needs exactly 4 numbers.');
  if (pin !== pin2) return err("The PINs don't match.");
  const { data, error } = await sb.rpc('join_village', { p_code: code, p_name: name, p_pin: pin, p_avatar: S.form.avatar });
  if (error) return err(error.message);
  confetti();
  await enter(data);
}

async function doLogin() {
  const code = $('#f-code').value.trim(), name = $('#f-name').value.trim(), pin = $('#f-pin').value.trim();
  const err = m => { $('#f-err').textContent = m; };
  const { data, error } = await sb.rpc('login_village', { p_code: code, p_name: name, p_pin: pin });
  if (error) return err(error.message);
  const msg = {
    bad_code: "That's not the family code.", no_member: "Nobody by that name lives here yet. Check spelling, or move in as new.",
    bad_pin: 'Wrong PIN. (5 wrong tries locks it for 15 minutes.)', locked: 'Too many wrong PINs. Try again in 15 minutes, or ask an admin to reset it.',
    not_signed_in: 'Something hiccuped. Refresh and try again.',
  };
  if (data !== 'ok') return err(msg[data] || data);
  const { data: dev } = await sb.from('member_devices').select('member_id').maybeSingle();
  await enter(dev.member_id);
}

async function enter(memberId) {
  S.myId = memberId;
  S.prevSeen = localStorage.getItem('village-last-seen') || new Date(Date.now() - 86400000).toISOString();
  localStorage.setItem('village-last-seen', new Date().toISOString());
  await loadCore();
  S.me = S.byId[memberId];
  renderShell();
  go(location.hash.replace('#', '') || 'home');
  startTimers();
  if (S.justInvited) { S.justInvited = false; confetti(); toast(`Welcome home, ${S.me.display_name} ${S.me.avatar}`, 4000); }
}

async function loadCore() {
  const [members, streaks, memes, cats] = await Promise.all([
    q(sb.from('members').select('*').order('display_name')),
    q(sb.rpc('member_streaks')),
    q(sb.from('reaction_images').select('*').order('created_at', { ascending: false })),
    q(sb.from('award_categories').select('*').order('id')),
  ]);
  S.members = members; S.byId = Object.fromEntries(members.map(m => [m.id, m]));
  S.streaks = Object.fromEntries((streaks || []).map(s => [s.member_id, s]));
  S.memes = memes; S.memeById = Object.fromEntries(memes.map(m => [m.id, m]));
  S.categories = cats;
  S.me = S.byId[S.myId];
}

/* =====================================================================
   SHELL & NAVIGATION
   ===================================================================== */
function renderShell() {
  $('#app').innerHTML = `
  <div class="wrap">
    <div class="panel top">
      <span style="font-size:26px">🏡</span>
      <h1 class="px">${esc(CFG.name)}</h1>
      <button class="me-btn" data-a="profile" title="You">${esc(S.me.avatar)}</button>
    </div>
    <div id="main"></div>
  </div>
  <nav class="tabs">${TABS.map(([k, ic, lb]) => `<button data-a="tab" data-t="${k}" id="tab-${k}"><span>${ic}</span>${lb}</button>`).join('')}</nav>
  <button class="secret-love" data-a="loveMenu" title="psst">🫶</button>`;
}

async function go(tab, silent) {
  if (!TABS.some(t => t[0] === tab)) tab = 'home';
  S.tab = tab;
  if (location.hash !== '#' + tab) history.replaceState(null, '', '#' + tab);
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
  if (!silent) $('#main').innerHTML = `<div class="loading">…</div>`;
  try {
    if (!silent) { await loadCore(); sb.rpc('log_visit', { p_tab: tab }).then(() => {}, () => {}); }
    await VIEWS[tab].load();
    if (S.tab === tab) $('#main').innerHTML = VIEWS[tab].render();
    if (VIEWS[tab].after) VIEWS[tab].after();
  } catch (e) { console.error(e); if (!silent) $('#main').innerHTML = `<div class="panel pad">😬 ${esc(e.message || e)}</div>`; }
  if (!silent) window.scrollTo(0, 0);
}

function busyTyping() {
  if ($('#modal')) return true;
  const a = document.activeElement;
  if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return true;
  return [...document.querySelectorAll('#main input, #main textarea')].some(el => el.value && el.type !== 'file');
}

function startTimers() {
  S.timers.forEach(clearInterval);
  S.timers = [
    setInterval(() => { if (!document.hidden && S.tab === 'kitchen') pollKitchen(); }, 6000),
    setInterval(async () => {
      if (document.hidden || S.tab === 'kitchen' || busyTyping()) return;
      try { await loadCore(); } catch (e) { return; }
      go(S.tab, true);
    }, 30000),
  ];
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) localStorage.setItem('village-last-seen', new Date().toISOString());
  });
}

/* =====================================================================
   SHARED RENDER BITS
   ===================================================================== */
function memeImg(id) {
  const m = S.memeById[id];
  if (!m) return '';
  if (hideIt(m)) return `<div class="flowerimg" style="width:120px;border:2px solid var(--ink);border-radius:4px;margin-top:4px">🌸</div>`;
  return `<img src="${esc(imgUrl(m.path))}" alt="${esc(m.name)}" loading="lazy">`;
}

function nsfhToggle(id) {
  if (isHoney()) return '';
  return `<button class="iconbtn" id="${id}" data-a="toggleNsfh" title="Not Safe For Honey">🍯</button>`;
}

function composer(target, placeholder) {
  return `<div class="composer">
      <input id="in-${target}" placeholder="${esc(placeholder)}" maxlength="300" data-enter="send-${target}">
      <button class="iconbtn" data-a="memePicker" data-target="${target}" title="Photo reaction">🖼️</button>
      ${nsfhToggle('ns-' + target)}
      <button class="iconbtn" data-a="send" data-target="${target}" id="send-${target}">➤</button>
    </div><div id="pk-${target}"></div>`;
}

function readComposer(target) {
  const input = $('#in-' + target);
  const body = input.value.trim();
  const ns = $('#ns-' + target);
  return { body: body || null, nsfh: !!(ns && ns.classList.contains('on')), reaction_image_id: S.picks[target] || null };
}
function clearComposer(target) {
  const input = $('#in-' + target); if (input) input.value = '';
  const ns = $('#ns-' + target); if (ns) ns.classList.remove('on');
  delete S.picks[target]; const pk = $('#pk-' + target); if (pk) pk.innerHTML = '';
}

function villagerLine(w) {
  const n = nameOf(w.member_id), seed = 'v' + w.id;
  let t;
  if (w.kind === 'checkin') t = pick(VILLAGER.checkin, seed);
  else if (w.minutes && w.minutes < 30) t = pick(VILLAGER.short, seed);
  else if (w.minutes && w.minutes >= 180) t = pick(w.hours_type === 'work' ? VILLAGER.work : VILLAGER.long, seed);
  else t = pick(VILLAGER.win, seed);
  return t.replace('{m}', w.minutes).replace('{h}', Math.round((w.minutes || 0) / 6) / 10).replace('{n}', n);
}

/* =====================================================================
   VIEW: HOME / THE STREET
   ===================================================================== */
const Home = {
  async load() {
    const since = S.prevSeen;
    const myWins = await q(sb.from('wins').select('id').eq('member_id', S.myId));
    const ids = myWins.map(w => w.id);
    const [roasts, newWins, kitchen, love, trivia, stats] = await Promise.all([
      ids.length ? q(sb.from('comments').select('id', { count: 'exact', head: true }).in('win_id', ids).neq('member_id', S.myId).gt('created_at', since)) : 0,
      q(sb.from('wins').select('id', { count: 'exact', head: true }).neq('member_id', S.myId).gt('created_at', since)),
      q(sb.from('kitchen_messages').select('id', { count: 'exact', head: true }).neq('member_id', S.myId).gt('created_at', since)),
      q(sb.from('secret_love').select('id').eq('seen', false)),
      q(sb.rpc('todays_trivia'), true).catch(() => null),
      q(sb.rpc('period_stats', { p_from: range(monthKey())[0], p_to: range(monthKey())[1] })),
    ]);
    S.data.home = { roasts, newWins, kitchen, love, trivia, stats };
    if (!S.trophies) computeTrophies().then(() => { if (S.tab === 'home' && !busyTyping()) $('#main').innerHTML = Home.render(); }).catch(console.error);
  },
  render() {
    const d = S.data.home, mk = monthKey();
    const pool = S.members.filter(m => !m.is_honey).sort((a, b) => a.id.localeCompare(b.id));
    const hot = pool.length ? pool[hash(today()) % pool.length] : null;
    const lines = [];
    if (d.roasts) lines.push(`🔥 Your Ws got roasted <b>${d.roasts}</b> time${d.roasts > 1 ? 's' : ''} since you left`);
    if (d.newWins) lines.push(`💪 <b>${d.newWins}</b> new W${d.newWins > 1 ? 's' : ''} to judge`);
    if (d.kitchen) lines.push(`🍽️ <b>${d.kitchen}</b> new message${d.kitchen > 1 ? 's' : ''} at the Kitchen Table`);
    const triviaDone = d.trivia && d.trivia.my_choice !== null && d.trivia.my_choice !== undefined;
    const dayOfMonth = +today().slice(8, 10);
    const top = [...(d.stats || [])].sort((a, b) => b.wins - a.wins).filter(s => s.wins > 0).slice(0, 3);
    return `<div class="stack">
      ${d.love && d.love.length ? `<div class="banner love" data-a="seenLove">🫶 Someone in the family is lowkey proud of you${d.love.length > 1 ? ` (×${d.love.length})` : ''}. We'll never tell who. <span class="tiny muted">tap to tuck it away</span></div>` : ''}
      ${dayOfMonth <= 7 && pastMonths().includes(prevMonth(mk)) ? `<div class="banner" data-a="tab" data-t="awards">🎉 ${MONTHS[+prevMonth(mk).slice(5) - 1]} results are in! See who won →</div>` : ''}
      ${lines.length ? `<div class="panel pad">${lines.map(l => `<div>${l}</div>`).join('')}</div>` : ''}
      ${hot ? `<div class="panel pad row"><span style="font-size:34px">🪑</span><div class="grow"><div class="px">TODAY'S HOT SEAT</div>
         <b style="font-size:20px">${esc(hot.avatar)} ${esc(hot.display_name)}</b><div class="tiny muted">Roast responsibly. Or don't.</div></div></div>` : ''}
      <div class="row">
        <button class="btn grow" data-a="tab" data-t="daily">${triviaDone ? '✅ Trivia done' : '🧠 Today\'s trivia'}</button>
        <button class="btn pink grow" data-a="tab" data-t="ws">💪 Post a W</button>
      </div>
      <h2 class="title px">🏘️ The Street</h2>
      <div class="street">${S.members.map(house).join('')}</div>
      <h2 class="title px">📈 ${MONTHS[+mk.slice(5) - 1]} so far <small>most Ws</small></h2>
      <div class="panel pad">${top.length ? top.map((s, i) => `<div class="rank">${['🥇', '🥈', '🥉'][i]} ${esc(avOf(s.member_id))} <b>${esc(nameOf(s.member_id))}</b> <span class="muted">· ${s.wins} W${s.wins > 1 ? 's' : ''}</span></div>`).join('') : '<span class="muted">Nobody has posted a W this month. Embarrassing for everyone.</span>'}</div>
      <div class="row"><button class="btn plain grow" data-a="memeVault">🖼️ Meme Vault (${S.memes.length})</button></div>
    </div>`;
  },
};

function house(m) {
  const st = S.streaks[m.id] || {};
  const lit = st.last_active && st.last_active >= chiDate(new Date(Date.now() - 86400000));
  const tro = S.trophies ? (S.trophies[m.id] || []).length : 0;
  return `<button class="house" data-a="member" data-id="${m.id}" style="--hc:${esc(m.color)}">
    <div class="roof"></div><span class="lantern ${lit ? 'lit' : ''}">🏮</span>
    <div class="av">${esc(m.avatar)}</div><div class="nm">${esc(m.display_name)}</div>
    <div class="tags">${m.is_scholar ? '<span title="Scholar">🎓</span>' : ''}${m.is_elder ? '<span title="Old Head">🧓</span>' : ''}</div>
    <div class="badges">${st.current_streak ? `🔥${st.current_streak}` : ''} ${tro ? `🏆${tro}` : ''}</div>
  </button>`;
}

async function showMember(id) {
  const m = S.byId[id]; if (!m) return;
  const st = S.streaks[id] || {};
  const [from, to] = range(monthKey());
  const [wins, stats] = await Promise.all([
    q(sb.from('wins').select('*').eq('member_id', id).order('created_at', { ascending: false }).limit(5)),
    q(sb.rpc('period_stats', { p_from: from, p_to: to })),
  ]);
  const s = (stats || []).find(x => x.member_id === id) || {};
  const tro = (S.trophies && S.trophies[id]) || [];
  modal(`<div class="center"><div style="font-size:64px">${esc(m.avatar)}</div>
    <h2 class="px">${esc(m.display_name)}</h2>
    ${m.journey ? `<div class="muted">${esc(m.journey)}</div>` : ''}
    <div class="row" style="justify-content:center;margin-top:4px">${m.is_scholar ? '<span class="scholar-tag">🎓 SCHOLAR</span>' : ''}${m.is_elder ? '<span class="scholar-tag">🧓 OLD HEAD</span>' : ''}${m.is_admin ? '<span class="scholar-tag">👑 ADMIN</span>' : ''}</div></div>
    <div class="panel pad" style="margin-top:12px">
      <div>🔥 Streak: <b>${st.current_streak || 0}</b> days <span class="muted">(best ${st.best_streak || 0})</span></div>
      <div>💪 This month: <b>${s.wins || 0}</b> Ws · ${s.checkins || 0} check-ins</div>
      <div>📚 Study: <b>${hrs(s.study_minutes)}</b> hrs · 💼 Work: <b>${hrs(s.work_minutes)}</b> hrs</div>
      <div>🗡️ Roasts given: <b>${s.roasts_given || 0}</b> · 🎯 times roasted: <b>${s.times_roasted || 0}</b></div>
      <div>🧠 Trivia right: <b>${s.trivia_correct || 0}</b>/${s.trivia_played || 0}${s.wordle_avg ? ` · 🟩 Wordle avg ${s.wordle_avg}` : ''}</div>
    </div>
    <h3 class="px" style="margin-top:14px">🏆 Trophy shelf</h3>
    <div>${tro.length ? tro.map(t => `<div class="rank">${esc(t.emoji)} ${esc(t.name)} <span class="muted tiny">· ${esc(t.period.length === 7 ? monthName(t.period) : t.period)}</span></div>`).join('') : '<span class="muted">Empty. For now.</span>'}</div>
    <h3 class="px" style="margin-top:14px">💪 Recent Ws</h3>
    ${wins.length ? wins.map(w => `<div class="rank">• ${esc(hideIt(w) ? decoy('win', w.id, m.display_name) : w.body)} <span class="muted tiny">${ago(w.created_at)}</span></div>`).join('') : '<span class="muted">Nothing yet. Suspicious.</span>'}
    ${id === S.myId ? '<button class="btn" style="margin-top:14px;width:100%" data-a="profile">✏️ Edit my house</button>' : ''}`);
}

/* =====================================================================
   VIEW: Ws & ROASTS
   ===================================================================== */
const htype = () => S.draft.htype || (S.me && S.me.is_scholar ? 'study' : 'work');
const Ws = {
  async load() {
    const wins = await q(sb.from('wins').select('*').order('created_at', { ascending: false }).limit(60));
    const ids = wins.map(w => w.id);
    const [comments, emojis] = ids.length ? await Promise.all([
      q(sb.from('comments').select('*').in('win_id', ids).order('created_at')),
      q(sb.from('win_emojis').select('*').in('win_id', ids)),
    ]) : [[], []];
    S.data.ws = { wins, comments, emojis };
  },
  render() {
    const { wins, comments, emojis } = S.data.ws;
    const d = S.draft;
    return `<div class="stack">
      <div class="panel pad">
        <div class="row">
          <button class="chip ${d.kind === 'win' ? 'on' : ''}" data-a="wkind" data-k="win">💪 W</button>
          <button class="chip ${d.kind === 'checkin' ? 'on' : ''}" data-a="wkind" data-k="checkin">✅ Check-in</button>
        </div>
        <textarea id="w-body" maxlength="500" style="margin-top:8px" placeholder="${d.kind === 'win' ? 'What did you do? Brag. Go ahead.' : 'What did you work on today?'}"></textarea>
        <div class="row" style="margin-top:8px">⏱️ hours were
          <button class="chip ${htype() === 'study' ? 'on' : ''}" data-a="htype" data-h="study">📚 Study</button>
          <button class="chip ${htype() === 'work' ? 'on' : ''}" data-a="htype" data-h="work">💼 Work</button>
        </div>
        <div class="row" style="margin-top:6px">
          ${[15, 30, 60, 120, 240, 480].map(m => `<button class="chip" data-a="wmin" data-m="${m}">${m < 60 ? m + 'm' : m / 60 + 'h'}</button>`).join('')}
          <input id="w-min" type="number" min="0" max="1440" placeholder="min" style="width:80px;padding:6px">
        </div>
        <div class="row" style="margin-top:10px">${nsfhToggle('ns-win')}<span class="grow"></span><button class="btn" data-a="postWin">Post it</button></div>
      </div>
      ${wins.length ? wins.map(w => winCard(w, comments.filter(c => c.win_id === w.id), emojis.filter(e => e.win_id === w.id))).join('')
        : '<div class="panel pad center muted">No Ws yet. Somebody has to go first. (It should be you.)</div>'}
    </div>`;
  },
};

function winCard(w, cmts, ems) {
  const n = nameOf(w.member_id);
  const hiddenPost = hideIt(w);
  return `<div class="panel post" id="win-${w.id}">
    <div class="head"><div class="av">${esc(avOf(w.member_id))}</div>
      <div><div class="who">${esc(n)}</div><div class="when">${ago(w.created_at)}</div></div>
      <span class="kind chip">${w.kind === 'win' ? '💪 W' : '✅ check-in'}${w.minutes ? ` · ${w.hours_type === 'work' ? '💼' : '📚'} ${w.minutes >= 60 ? hrs(w.minutes) + 'h' : w.minutes + 'm'}` : ''}</span>
      <button class="more" data-a="itemMenu" data-kind="win" data-id="${w.id}" data-owner="${w.member_id}">⋯</button>
    </div>
    <div class="body">${esc(hiddenPost ? decoy('win', w.id, n) : w.body)}</div>
    ${hiddenPost ? '' : `<div class="villager">🏘️ the village says: ${esc(villagerLine(w))}</div>`}
    <div class="emojis">${REACTS.map(r => {
      const list = ems.filter(e => e.emoji === r);
      const mine = list.some(e => e.member_id === S.myId);
      return `<button class="${mine ? 'mine' : ''}" data-a="react" data-id="${w.id}" data-e="${esc(r)}" title="${esc(list.map(e => nameOf(e.member_id)).join(', '))}">${esc(r)}${list.length ? ' ' + list.length : ''}</button>`;
    }).join('')}</div>
    <div class="comments">
      ${cmts.map(c => commentRow(c, hiddenPost)).join('')}
      ${composer('w' + w.id, w.member_id === S.myId ? 'Defend yourself…' : 'Roast them…')}
    </div>
  </div>`;
}

function commentRow(c, forceHide) {
  const n = nameOf(c.member_id);
  const hidden = hideIt(c) || (isHoney() && forceHide);
  const memeHidden = c.reaction_image_id && S.memeById[c.reaction_image_id] && hideIt(S.memeById[c.reaction_image_id]);
  return `<div class="cmt"><div class="av">${esc(avOf(c.member_id))}</div><div class="txt">
    <b>${esc(n)}</b> <span class="when">${ago(c.created_at)}</span>
    ${hidden ? `<div>${esc(decoy('comment', c.id))}</div>` : `${c.body ? `<div>${esc(c.body)}</div>` : ''}${c.reaction_image_id ? (memeHidden ? '<div class="flowerimg" style="width:120px;border:2px solid var(--ink);border-radius:4px">🌸</div>' : memeImg(c.reaction_image_id)) : ''}`}
    </div><button class="more" data-a="itemMenu" data-kind="comment" data-id="${c.id}" data-owner="${c.member_id}">⋯</button></div>`;
}

/* =====================================================================
   VIEW: DAILY (trivia + word games)
   ===================================================================== */
const GAME_INFO = {
  wordle: { em: '🟩', name: 'Wordle', fmt: s => s >= 7 ? 'X/6' : `${s}/6` },
  connections: { em: '🟪', name: 'Connections', fmt: s => s >= 4 ? 'failed 💀' : `${s} mistake${s == 1 ? '' : 's'}` },
  strands: { em: '🔵', name: 'Strands', fmt: s => `${s} hint${s == 1 ? '' : 's'} 💡` },
  mini: { em: '⬛', name: 'The Mini', fmt: s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` },
};

function parseGame(raw) {
  const t = raw.trim();
  let m = t.match(/Wordle\s+([\d][\d,.\s]*?)\s+([1-6X])\/6/i);
  if (m) return { game: 'wordle', puzzle: m[1].replace(/[^\d]/g, ''), score: m[2].toUpperCase() === 'X' ? 7 : +m[2] };
  m = t.match(/Connections[\s\S]*?Puzzle\s*#\s*([\d,]+)/i);
  if (m) {
    const rows = t.split(/\n/).map(l => Array.from(l.replace(/\s/g, ''))).filter(r => r.length === 4 && r.every(ch => '🟨🟩🟦🟪'.includes(ch)));
    const solved = rows.filter(r => r.every(ch => ch === r[0])).length;
    const mistakes = rows.length - solved;
    return { game: 'connections', puzzle: m[1].replace(/,/g, ''), score: solved >= 4 ? Math.min(mistakes, 3) : 4 };
  }
  m = t.match(/Strands\s*#\s*([\d,]+)/i);
  if (m) return { game: 'strands', puzzle: m[1].replace(/,/g, ''), score: (t.match(/💡/gu) || []).length };
  m = t.match(/Mini[\s\S]*?(\d{1,2}):(\d{2})/i);
  if (m) {
    const dm = t.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    return { game: 'mini', puzzle: dm ? dm[1] : today(), score: (+m[1]) * 60 + (+m[2]) };
  }
  return null;
}

const Daily = {
  async load() {
    const trivia = await q(sb.rpc('todays_trivia'));
    let answers = [];
    if (trivia && trivia.my_choice !== null && trivia.my_choice !== undefined) {
      answers = await q(sb.from('trivia_answers').select('*').eq('question_id', trivia.id));
    }
    const scores = await q(sb.from('game_scores').select('*').eq('played_on', today()).order('score'));
    S.data.daily = { trivia, answers, scores };
  },
  render() {
    const { trivia: t, answers, scores } = S.data.daily;
    let tri;
    if (!t) {
      tri = `<div class="panel pad center"><div style="font-size:40px">🫙</div><b>The trivia vault is empty!</b><p class="muted">Add some family lore below and it'll show up on a future day.</p></div>`;
    } else {
      const answered = t.my_choice !== null && t.my_choice !== undefined;
      const mine = t.submitted_by === S.myId && !answered;
      const choices = t.choices.map((c, i) => {
        let cls = '';
        if (answered) cls = i === t.answer_index ? 'right' : (i === t.my_choice ? 'wrong' : '');
        return `<button class="choice ${cls}" ${answered || mine ? 'disabled' : `data-a="answer" data-q="${t.id}" data-i="${i}"`}>${'ABCD'[i]}. ${esc(c)}</button>`;
      }).join('');
      tri = `<div class="panel pad">
        <div class="row"><span class="chip">${t.category === 'family' ? '🏠 family lore' : t.category === 'science' ? '🧪 science' : '🌎 general'}</span>
          ${t.submitted_by ? `<span class="tiny muted">from ${esc(nameOf(t.submitted_by))}</span>` : ''}<span class="grow"></span>
          <button class="iconbtn" data-a="readAloud" title="Read it to me">🔊</button></div>
        <p class="big-q" style="margin:10px 0 4px">${esc(t.question)}</p>
        ${mine ? '<p class="banner">You wrote this one, so you sit this round out 😏</p>' : ''}
        ${choices}
        ${answered ? `<p style="margin-top:12px;font-weight:800">${t.my_choice === t.answer_index ? '✅ Correct! Insufferable behavior incoming.' : '❌ Wrong. The family will remember this.'}</p>
          <div class="tiny muted" style="margin-top:6px">Today's results:</div>
          ${answers.map(a => `<div class="rank">${a.correct ? '✅' : '❌'} ${esc(avOf(a.member_id))} ${esc(nameOf(a.member_id))}</div>`).join('')}` : ''}
      </div>`;
    }
    const byGame = {};
    scores.forEach(s => (byGame[s.game] = byGame[s.game] || []).push(s));
    const boards = Object.keys(GAME_INFO).filter(g => byGame[g]).map(g => {
      const list = byGame[g].sort((a, b) => a.score - b.score);
      const gi = GAME_INFO[g];
      const worst = list[list.length - 1];
      let roast = '';
      if (list.length > 1 && worst.score > list[0].score) roast = `${nameOf(list[0].member_id)} did it in ${gi.fmt(list[0].score)}. ${nameOf(worst.member_id)}: ${gi.fmt(worst.score)}. Just saying.`;
      if (g === 'wordle' && worst.score >= 7) roast = `${nameOf(worst.member_id)} failed today's Wordle. We will never forget.`;
      return `<div class="panel pad"><b class="px">${gi.em} ${gi.name}</b>
        <table class="lb">${list.map((s, i) => `<tr><td>${i === 0 ? '👑' : ''}</td><td>${esc(avOf(s.member_id))} ${esc(nameOf(s.member_id))}</td><td style="text-align:right"><b>${gi.fmt(s.score)}</b></td></tr>`).join('')}</table>
        ${roast ? `<div class="villager" style="margin-top:6px">🏘️ ${esc(roast)}</div>` : ''}</div>`;
    }).join('');
    return `<div class="stack">
      <h2 class="title px">🧠 Daily Trivia <small>${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</small></h2>
      ${tri}
      <button class="btn plain" style="width:100%" data-a="addTrivia">➕ Add a trivia question (family lore welcome)</button>
      <h2 class="title px">🟩 Word Games <small>paste your share text</small></h2>
      <div class="panel pad">
        <textarea id="g-raw" placeholder="Paste your Wordle, Connections, Strands, or Mini result here"></textarea>
        <button class="btn" style="margin-top:8px;width:100%" data-a="postScore">Post my score</button>
      </div>
      ${boards || '<div class="panel pad center muted">No scores posted today. Cowards.</div>'}
    </div>`;
  },
};

/* =====================================================================
   VIEW: QUOTES WALL
   ===================================================================== */
const Quotes = {
  async load() {
    const quotes = await q(sb.from('quotes').select('*').order('said_on', { ascending: false }).order('created_at', { ascending: false }).limit(300));
    const qom = S.categories.find(c => c.name === 'Quote of the Month');
    const myVote = qom ? await q(sb.from('award_votes').select('*').eq('category_id', qom.id).eq('period_key', monthKey()).maybeSingle()) : null;
    if (!S.trophies) await computeTrophies().catch(console.error);
    S.data.quotes = { quotes, qom, myVote };
  },
  render() {
    const { quotes, qom, myVote } = S.data.quotes;
    const mk = monthKey();
    const hof = (S.hallOfFame || []).slice(0, 12);
    let lastMonth = '';
    const cards = quotes.map(x => {
      const pk = x.said_on.slice(0, 7);
      const header = pk !== lastMonth ? `<h2 class="title px">${esc(monthName(pk))}</h2>` : '';
      lastMonth = pk;
      const hidden = hideIt(x);
      const voted = myVote && myVote.nominee_id === String(x.id);
      return `${header}<div class="panel quote">
        <button class="more" style="position:absolute;right:8px;top:6px" data-a="itemMenu" data-kind="quote" data-id="${x.id}" data-owner="${x.submitted_by}">⋯</button>
        <div class="q">${esc(hidden ? decoy('quote', x.id) : x.body)}</div>
        <div class="by">— ${esc(x.said_by)}</div>
        ${x.context && !hidden ? `<div class="ctx">${esc(x.context)}</div>` : ''}
        ${pk === mk && qom ? `<div style="margin-top:8px"><button class="chip ${voted ? 'on' : ''}" data-a="voteQuote" data-id="${x.id}">${voted ? '✅ your Quote of the Month vote' : '🗳️ vote Quote of the Month'}</button></div>` : ''}
      </div>`;
    }).join('');
    return `<div class="stack">
      <button class="btn big" data-a="addQuote">➕ Add a quote</button>
      ${hof.length ? `<h2 class="title px">👑 Hall of Fame</h2><div class="panel pad">${hof.map(h => `<div class="rank">${esc(h.emoji)} <b>${esc(h.period.length === 7 ? monthName(h.period) : h.period)}:</b> "${esc(h.label)}"</div>`).join('')}</div>` : ''}
      ${cards || '<div class="panel pad center muted">The wall is empty. Somebody in this family has said something unhinged this week. Write it down.</div>'}
    </div>`;
  },
};

/* =====================================================================
   VIEW: KITCHEN TABLE
   ===================================================================== */
const Kitchen = {
  async load() {
    const msgs = await q(sb.from('kitchen_messages').select('*').order('id', { ascending: false }).limit(120));
    S.data.kitchen = msgs.reverse();
    S.kitchenLastId = S.data.kitchen.length ? S.data.kitchen[S.data.kitchen.length - 1].id : 0;
  },
  render() {
    return `<div class="stack">
      <h2 class="title px">🍽️ The Kitchen Table <small>pull up a chair</small></h2>
      <div class="panel"><div class="kitchen" id="kbox">${S.data.kitchen.map(kmsg).join('') || '<p class="muted center">Quiet in here. Too quiet.</p>'}</div>
      <div class="pad" style="padding-top:0">${composer('k', 'Say something…')}</div></div>
    </div>`;
  },
  after() { const b = $('#kbox'); if (b) b.scrollTop = b.scrollHeight; },
};

function kmsg(k) {
  const mine = k.member_id === S.myId;
  const hidden = hideIt(k);
  return `<div class="kmsg ${mine ? 'mine' : ''}"><div class="av" style="font-size:22px">${esc(avOf(k.member_id))}</div><div>
    ${mine ? '' : `<div class="nm">${esc(nameOf(k.member_id))}</div>`}
    <div class="bub" data-a="itemMenu" data-kind="kitchen" data-id="${k.id}" data-owner="${k.member_id}">${hidden ? esc(decoy('kitchen', k.id)) : `${k.body ? esc(k.body) : ''}${k.reaction_image_id ? memeImg(k.reaction_image_id) : ''}`}</div>
    <div class="tiny muted">${ago(k.created_at)}</div></div></div>`;
}

async function pollKitchen() {
  if (S.tab !== 'kitchen') return;
  const { data } = await sb.from('kitchen_messages').select('*').gt('id', S.kitchenLastId).order('id');
  if (!data || !data.length) return;
  if (data.some(k => (k.reaction_image_id && !S.memeById[k.reaction_image_id]) || !S.byId[k.member_id])) await loadCore();
  const box = $('#kbox'); if (!box) return;
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  if (!S.data.kitchen.length) box.innerHTML = '';
  data.forEach(k => { S.data.kitchen.push(k); box.insertAdjacentHTML('beforeend', kmsg(k)); });
  S.kitchenLastId = data[data.length - 1].id;
  if (nearBottom) box.scrollTop = box.scrollHeight;
}

/* =====================================================================
   AWARDS ENGINE
   ===================================================================== */
const METRIC = {
  wins: { label: 'Ws', fmt: v => v },
  best_streak: { label: 'day streak', fmt: v => v },
  minutes: { label: 'hrs', fmt: v => Math.round(v / 6) / 10 },
  trivia_correct: { label: 'right', fmt: v => v },
  wordle_avg: { label: 'avg', fmt: v => v, low: true, min: 'wordle_played', minN: 5 },
  roasts_given: { label: 'roasts', fmt: v => v },
  times_roasted: { label: 'times', fmt: v => v },
  reactions_received: { label: 'reactions', fmt: v => v },
  study_minutes: { label: 'study hrs', fmt: v => hrs(v) },
  work_minutes: { label: 'work hrs', fmt: v => hrs(v) },
  study_streak: { label: 'day study streak', fmt: v => v },
  work_streak: { label: 'day work streak', fmt: v => v },
  science_correct: { label: 'science right', fmt: v => v },
};

// 🧓 Old Heads vs 🐣 Youngins: average logged hours per active person; old heads get the bonus
function showdown(stats) {
  const team = elder => {
    const rows = (stats || []).filter(s => S.byId[s.member_id] && !!S.byId[s.member_id].is_elder === elder && (s.study_minutes + s.work_minutes) > 0);
    const total = rows.reduce((a, s) => a + s.study_minutes + s.work_minutes, 0);
    const avg = rows.length ? total / rows.length : 0;
    return { n: rows.length, raw: avg, score: elder ? avg * OLD_FOLKS_BONUS : avg, members: rows.map(r => r.member_id) };
  };
  const old = team(true), young = team(false);
  const winner = !old.n && !young.n ? null : old.score === young.score ? null : (old.score > young.score ? 'old' : 'young');
  return { old, young, winner };
}

function rankAuto(cat, stats, official) {
  const M = METRIC[cat.metric]; if (!M) return [];
  let rows = (stats || []).filter(s => s[cat.metric] !== null && s[cat.metric] !== undefined && +s[cat.metric] > 0);
  if (cat.league === 'scholar') rows = rows.filter(s => S.byId[s.member_id] && S.byId[s.member_id].is_scholar);
  if (M.min) rows = rows.filter(s => s[M.min] >= (official ? M.minN : 1));
  rows.sort((a, b) => M.low ? a[cat.metric] - b[cat.metric] : b[cat.metric] - a[cat.metric]);
  return rows.map(s => ({ member_id: s.member_id, value: +s[cat.metric] }));
}

const catsFor = period => S.categories.filter(c => c.approved && c.period === period);

async function lookupItems(type, ids) {
  ids = [...new Set(ids)].filter(Boolean);
  if (!ids.length) return {};
  const table = { quote: 'quotes', meme: 'reaction_images', comment: 'comments', win: 'wins' }[type];
  if (!table) return {};
  const rows = await q(sb.from(table).select('*').in('id', ids.map(Number)), true).catch(() => []);
  return Object.fromEntries(rows.map(r => [String(r.id), r]));
}

function nomineeLabel(type, id, items) {
  if (type === 'member') return nameOf(id);
  const it = items[String(id)];
  if (!it) return '(deleted)';
  if (type === 'quote') return hideIt(it) ? decoy('quote', it.id) : `${it.body} — ${it.said_by}`;
  if (type === 'meme') return hideIt(it) ? 'flowers 🌸' : it.name;
  if (type === 'comment') return hideIt(it) ? decoy('comment', it.id) : `${nameOf(it.member_id)}: ${it.body || '(photo reaction)'}`;
  if (type === 'win') return hideIt(it) ? decoy('win', it.id, nameOf(it.member_id)) : `${nameOf(it.member_id)}: ${it.body}`;
  return String(id);
}
function nomineeOwner(type, id, items) {
  if (type === 'member') return id;
  const it = items[String(id)]; if (!it) return null;
  if (type === 'quote') return it.said_by_member;
  return it.member_id;
}

async function periodResults(pk) {
  if (S.results[pk]) return S.results[pk];
  const [from, to] = range(pk);
  const period = pk.length === 7 ? 'month' : 'year';
  const [stats, tally] = await Promise.all([
    q(sb.rpc('period_stats', { p_from: from, p_to: to })),
    q(sb.rpc('award_tally', { p_period: pk }), true).catch(() => []),
  ]);
  const out = [];
  for (const cat of catsFor(period)) {
    if (cat.kind === 'auto') {
      const ranked = rankAuto(cat, stats, true);
      const best = ranked.length ? ranked[0].value : null;
      out.push({ cat, winners: ranked.filter(r => r.value === best).map(r => ({ owner: r.member_id, label: nameOf(r.member_id), value: r.value })) });
    } else {
      const rows = (tally || []).filter(t => t.category_id === cat.id);
      const max = Math.max(0, ...rows.map(r => r.votes));
      const top = rows.filter(r => r.votes === max && max > 0);
      const items = await lookupItems(cat.nominee_type, top.map(r => r.nominee_id));
      out.push({ cat, winners: top.map(r => ({ owner: nomineeOwner(cat.nominee_type, r.nominee_id, items), label: nomineeLabel(cat.nominee_type, r.nominee_id, items), value: r.votes, id: r.nominee_id })) });
    }
  }
  if (period === 'month') {
    const sd = showdown(stats);
    if (sd.winner) out.push({ cat: { id: 'showdown', emoji: sd.winner === 'old' ? '🧓' : '🐣', name: sd.winner === 'old' ? 'Old Heads Showdown' : 'Youngins Showdown', kind: 'team' },
      winners: sd[sd.winner].members.map(id => ({ owner: id, label: nameOf(id), value: 0 })) });
  }
  return (S.results[pk] = out);
}

function launchMonth() {
  const first = S.members.map(m => m.created_at).sort()[0];
  return first ? chiDate(new Date(first)).slice(0, 7) : monthKey();
}
function pastMonths() {
  const out = []; let pk = launchMonth(); const now = monthKey();
  while (pk < now) { out.push(pk); pk = nextMonth(pk); }
  return out.reverse();
}
function pastYears() {
  const out = []; let y = +launchMonth().slice(0, 4); const now = +yearKey();
  while (y < now) { out.push(String(y)); y++; }
  return out.reverse();
}

async function computeTrophies() {
  const t = {}, hof = [];
  for (const pk of [...pastYears(), ...pastMonths()]) {
    const res = await periodResults(pk);
    res.forEach(({ cat, winners }) => winners.forEach(w => {
      if (w.owner) (t[w.owner] = t[w.owner] || []).push({ emoji: cat.emoji, name: cat.name, period: pk });
      if (cat.nominee_type === 'quote') hof.push({ emoji: cat.emoji, period: pk, label: w.label, id: w.id });
    }));
  }
  S.trophies = t;
  S.hallOfFame = hof;
}

/* =====================================================================
   VIEW: AWARDS
   ===================================================================== */
const Awards = {
  async load() {
    const mk = monthKey(), yk = yearKey();
    const [mf, mt] = range(mk), [yf, yt] = range(yk);
    const [monthStats, yearStats, myVotes, seconds] = await Promise.all([
      q(sb.rpc('period_stats', { p_from: mf, p_to: mt })),
      q(sb.rpc('period_stats', { p_from: yf, p_to: yt })),
      q(sb.from('award_votes').select('*').in('period_key', [mk, yk])),
      q(sb.from('category_seconds').select('*')),
    ]);
    if (!S.trophies) await computeTrophies().catch(console.error);
    const months = pastMonths();
    if (!S.resultsView || (S.resultsView !== 'none' && ![...months, ...pastYears()].includes(S.resultsView))) S.resultsView = months[0] || 'none';
    const past = S.resultsView !== 'none' ? await periodResults(S.resultsView) : [];
    // labels for my current votes
    const labels = {};
    for (const type of ['quote', 'meme', 'comment', 'win']) {
      const mine = myVotes.filter(v => (S.categories.find(c => c.id === v.category_id) || {}).nominee_type === type);
      const items = await lookupItems(type, mine.map(v => v.nominee_id));
      mine.forEach(v => { labels[v.category_id + v.period_key] = nomineeLabel(type, v.nominee_id, items); });
    }
    myVotes.filter(v => (S.categories.find(c => c.id === v.category_id) || {}).nominee_type === 'member')
      .forEach(v => { labels[v.category_id + v.period_key] = nameOf(v.nominee_id); });
    S.data.awards = { monthStats, yearStats, myVotes, labels, seconds, past };
  },
  render() {
    const { monthStats, yearStats, myVotes, labels, seconds, past } = S.data.awards;
    const mk = monthKey(), yk = yearKey();
    const isDec = mk.endsWith('-12');
    const live = (cat, stats) => {
      const ranked = rankAuto(cat, stats, false).slice(0, 3);
      const M = METRIC[cat.metric];
      return `<div class="panel award"><div class="ah"><span class="em">${esc(cat.emoji)}</span>${esc(cat.name)}</div>
        ${ranked.length ? ranked.map((r, i) => `<div class="rank">${['🥇', '🥈', '🥉'][i]} ${esc(avOf(r.member_id))} ${esc(nameOf(r.member_id))} <span class="muted">· ${M.fmt(r.value)} ${M.label}</span></div>`).join('')
          : '<div class="muted tiny">Wide open. Somebody take it.</div>'}
        ${M.min ? `<div class="tiny muted">Needs ${M.minN}+ games to officially win.</div>` : ''}</div>`;
    };
    const voteCard = (cat, pk) => {
      const v = myVotes.find(x => x.category_id === cat.id && x.period_key === pk);
      return `<div class="panel award"><div class="ah"><span class="em">${esc(cat.emoji)}</span>${esc(cat.name)}</div>
        <div class="muted tiny" style="margin:4px 0">${v ? `Your secret vote: <b>${esc(labels[cat.id + pk] || '…')}</b>` : 'You have not voted yet.'}</div>
        <button class="chip" data-a="vote" data-c="${cat.id}" data-p="${pk}">🗳️ ${v ? 'change vote' : 'vote'}</button></div>`;
    };
    const proposals = S.categories.filter(c => !c.approved);
    const main = (period, kind) => catsFor(period).filter(c => c.kind === kind && !c.league);
    const league = (lg, period) => catsFor(period).filter(c => c.league === lg);
    const sd = showdown(monthStats);
    const sdRow = (t, label, emoji) => `<div class="rank">${emoji} <b>${label}</b> <span class="muted">· ${t.n ? `${hrs(t.raw)} hrs/person${t === sd.old ? ` × ${OLD_FOLKS_BONUS} bonus = <b>${hrs(t.score)}</b>` : ''}` : 'nobody logged hours yet'}</span></div>`;
    const showdownCard = `<div class="panel award"><div class="ah"><span class="em">⚔️</span>Old Heads vs Youngins</div>
      ${sdRow(sd.old, 'Old Heads', '🧓')}${sdRow(sd.young, 'Youngins', '🐣')}
      <div style="margin-top:6px;font-weight:800">${sd.winner ? (sd.winner === 'old' ? '🧓 The Old Heads are winning. Respect your elders.' : '🐣 The Youngins are winning. The old heads are FURIOUS.') : 'Dead even. Somebody log some hours.'}</div>
      <div class="tiny muted">Average study + work hours per person who logged any. Old Heads get the ${Math.round((OLD_FOLKS_BONUS - 1) * 100)}% Old Folks Bonus. Winning team takes a trophy each.</div></div>`;
    const pastOptions = [...pastMonths().map(p => [p, monthName(p)]), ...pastYears().map(y => [y, `${y} (year)`])];
    return `<div class="stack">
      <h2 class="title px">⚔️ The Showdown <small>${MONTHS[+mk.slice(5) - 1]}</small></h2>
      ${showdownCard}
      <h2 class="title px">📊 ${MONTHS[+mk.slice(5) - 1]} standings <small>live · everyone</small></h2>
      ${main('month', 'auto').map(c => live(c, monthStats)).join('')}
      <h2 class="title px">📚 Scholar League <small>scholars only</small></h2>
      ${league('scholar', 'month').map(c => live(c, monthStats)).join('')}
      <h2 class="title px">💼 Workhorse League <small>log 💼 work hours</small></h2>
      ${league('work', 'month').map(c => live(c, monthStats)).join('')}
      <h2 class="title px">🗳️ ${MONTHS[+mk.slice(5) - 1]} votes <small>secret ballot · results on the 1st</small></h2>
      ${catsFor('month').filter(c => c.kind === 'vote').map(c => voteCard(c, mk)).join('')}
      <h2 class="title px">👑 ${yk} Yearly Awards</h2>
      ${catsFor('year').filter(c => c.kind === 'auto').map(c => live(c, yearStats)).join('')}
      ${isDec ? catsFor('year').filter(c => c.kind === 'vote').map(c => voteCard(c, yk)).join('')
        : `<div class="panel pad muted">Yearly voting (${catsFor('year').filter(c => c.kind === 'vote').map(c => esc(c.emoji + ' ' + c.name)).join(', ')}) opens in December. Quote of the Year is chosen from the monthly Quote of the Month winners.</div>`}
      <h2 class="title px">📜 Past results</h2>
      ${pastOptions.length ? `<select id="res-pick" data-change="resultsPick">${pastOptions.map(([v, l]) => `<option value="${v}" ${v === S.resultsView ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        ${past.map(({ cat, winners }) => `<div class="panel award"><div class="ah"><span class="em">${esc(cat.emoji)}</span>${esc(cat.name)}</div>
          ${winners.length ? winners.map(w => `<div class="rank">🏆 <b>${esc(w.label)}</b>${cat.kind === 'auto' ? ` <span class="muted">· ${METRIC[cat.metric].fmt(w.value)} ${METRIC[cat.metric].label}</span>` : cat.kind === 'vote' ? ` <span class="muted">· ${w.value} vote${w.value > 1 ? 's' : ''}</span>` : ''}</div>`).join('') : '<div class="muted tiny">No winner. Shameful.</div>'}</div>`).join('')}`
        : '<div class="panel pad muted">The first results unlock when this month ends. The tension is unbearable.</div>'}
      <h2 class="title px">💡 Proposed categories <small>3 seconds = official</small></h2>
      ${proposals.map(c => {
        const n = seconds.filter(s => s.category_id === c.id).length;
        const mine = seconds.some(s => s.category_id === c.id && s.member_id === S.myId);
        return `<div class="panel award row"><span class="em" style="font-size:24px">${esc(c.emoji)}</span><div class="grow"><b>${esc(c.name)}</b>
          <div class="tiny muted">proposed by ${esc(nameOf(c.proposed_by))} · ${n}/3</div></div>
          <button class="chip ${mine ? 'on' : ''}" ${mine ? 'disabled' : `data-a="second" data-id="${c.id}"`}>${mine ? 'seconded' : '✋ second it'}</button></div>`;
      }).join('') || '<div class="muted" style="color:#b9aacc">No proposals right now.</div>'}
      <button class="btn plain" style="width:100%" data-a="proposeCat">➕ Propose a new award</button>
    </div>`;
  },
};

async function openVote(catId, pk) {
  const cat = S.categories.find(c => c.id === catId); if (!cat) return;
  const [from, to] = range(pk);
  const inRange = ts => { const d = chiDate(new Date(ts)); return d >= from && d < to; };
  let options = [];
  if (cat.nominee_type === 'member') {
    options = S.members.filter(m => m.id !== S.myId).map(m => [m.id, `${m.avatar} ${m.display_name}`]);
  } else if (cat.nominee_type === 'quote') {
    if (pk.length === 4) {
      if (!S.trophies) await computeTrophies();
      const winners = (S.hallOfFame || []).filter(h => h.period.startsWith(pk) && h.period.length === 7 && h.id);
      if (winners.length) options = winners.map(h => [String(h.id), `${monthName(h.period)}: "${h.label}"`]);
    }
    if (!options.length) {
      const rows = await q(sb.from('quotes').select('*').gte('said_on', from).lt('said_on', to).order('said_on', { ascending: false }));
      options = rows.map(x => [String(x.id), hideIt(x) ? decoy('quote', x.id) : `"${x.body}" — ${x.said_by}`]);
    }
  } else if (cat.nominee_type === 'meme') {
    options = S.memes.filter(m => inRange(m.created_at) && m.member_id !== S.myId && !hideIt(m)).map(m => [String(m.id), m.name, m]);
  } else if (cat.nominee_type === 'comment') {
    const rows = await q(sb.from('comments').select('*').gte('created_at', new Date(from + 'T04:00:00Z').toISOString()).neq('member_id', S.myId).order('created_at', { ascending: false }).limit(200));
    options = rows.filter(c => inRange(c.created_at) && !hideIt(c)).map(c => [String(c.id), `${nameOf(c.member_id)}: ${c.body || '(photo reaction)'}`, c.reaction_image_id ? S.memeById[c.reaction_image_id] : null]);
  } else if (cat.nominee_type === 'win') {
    const rows = await q(sb.from('wins').select('*').eq('kind', 'win').gte('created_at', new Date(from + 'T04:00:00Z').toISOString()).neq('member_id', S.myId).order('created_at', { ascending: false }).limit(200));
    options = rows.filter(w => inRange(w.created_at) && !hideIt(w)).map(w => [String(w.id), `${nameOf(w.member_id)}: ${w.body}`]);
  }
  modal(`<h2 class="px">${esc(cat.emoji)} ${esc(cat.name)}</h2><p class="muted tiny">Secret ballot. You can change your vote until the ${pk.length === 7 ? 'month' : 'year'} ends.</p>
    ${options.length ? options.map(([id, label, meme]) => `<button class="choice" data-a="castVote" data-c="${cat.id}" data-p="${pk}" data-n="${esc(id)}">
      ${meme && meme.path ? `<img src="${esc(imgUrl(meme.path))}" style="width:56px;height:56px;object-fit:cover;border:2px solid var(--ink);border-radius:3px;vertical-align:middle;margin-right:8px">` : ''}${esc(label)}</button>`).join('')
      : '<p class="muted">Nothing to vote for yet this period.</p>'}`);
}

/* =====================================================================
   MEME VAULT & PICKER
   ===================================================================== */
function memeGrid(target) {
  const list = S.memes.filter(m => !(isHoney() && m.nsfh));
  return `<div class="memegrid">${list.map(m => `<button class="meme" data-a="${target ? 'pickMeme' : 'memeMenu'}" data-id="${m.id}" ${target ? `data-target="${target}"` : ''}>
      <img src="${esc(imgUrl(m.path))}" alt="" loading="lazy"><div class="cap">${esc(m.name)}</div></button>`).join('')}</div>
    ${list.length ? '' : '<p class="muted center">No memes yet. This family is sitting on a goldmine of photos. Upload one.</p>'}`;
}

async function openMemeVault(target) {
  const fresh = await q(sb.from('reaction_images').select('*').order('created_at', { ascending: false }), true).catch(() => null);
  if (fresh) { S.memes = fresh; S.memeById = Object.fromEntries(fresh.map(m => [m.id, m])); }
  modal(`<h2 class="px">🖼️ ${target ? 'Pick a reaction' : 'The Meme Vault'}</h2>
    <p class="muted tiny">Family photos only. The more unflattering, the better.</p>
    <button class="btn" style="width:100%;margin:8px 0" data-a="uploadMeme" data-target="${target || ''}">📸 Upload a new one</button>
    ${memeGrid(target)}`);
}

function openUpload(target) {
  modal(`<h2 class="px">📸 Add to the Meme Vault</h2>
    <label class="lbl">Photo</label><input type="file" id="m-file" accept="image/*">
    <label class="lbl">Name it (so people can find it)</label><input id="m-name" maxlength="40" placeholder="e.g. dad disappointed">
    ${isHoney() ? '' : '<label class="row" style="margin-top:10px"><input type="checkbox" id="m-nsfh" style="width:auto"> 🍯 Not Safe For Honey</label>'}
    <p class="err" id="m-err"></p>
    <button class="btn big" data-a="doUpload" data-target="${target || ''}">Upload</button>`);
}

async function shrinkImage(file) {
  if (file.type === 'image/gif' && file.size < 2e6) return { blob: file, ext: 'gif', type: 'image/gif' };
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 640 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
  return { blob, ext: 'jpg', type: 'image/jpeg' };
}

async function doUpload(target) {
  const file = $('#m-file').files[0], name = $('#m-name').value.trim();
  const nsfh = !!($('#m-nsfh') && $('#m-nsfh').checked);
  const err = m => { $('#m-err').textContent = m; };
  if (!file) return err('Pick a photo first.');
  if (!name) return err('Give it a name.');
  err('Uploading…');
  try {
    const { blob, ext, type } = await shrinkImage(file);
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from('reactions').upload(path, blob, { contentType: type });
    if (error) throw error;
    const row = await q(sb.from('reaction_images').insert({ name, path, nsfh, member_id: S.myId }).select().single());
    S.memes.unshift(row); S.memeById[row.id] = row;
    if (target) { setPick(target, row.id); closeModal(); } else openMemeVault();
    toast('Added to the vault 🖼️');
  } catch (e) { err('Upload failed: ' + (e.message || e)); }
}

function setPick(target, id) {
  S.picks[target] = id;
  const m = S.memeById[id], el = $('#pk-' + target);
  if (el && m) el.innerHTML = `<div class="pickedimg"><img src="${esc(imgUrl(m.path))}"> ${esc(m.name)} <button class="more" data-a="unpick" data-target="${target}">✕</button></div>`;
}

/* =====================================================================
   PROFILE & ADMIN
   ===================================================================== */
function openProfile() {
  const m = S.me;
  S.form = { avatar: m.avatar, color: m.color };
  modal(`<h2 class="px">${esc(m.avatar)} ${esc(m.display_name)}'s house</h2>
    <div class="row" style="margin:6px 0">${m.is_admin ? '<span class="scholar-tag">👑 ADMIN</span>' : ''}${m.is_scholar ? '<span class="scholar-tag">🎓 SCHOLAR</span>' : ''}${m.is_elder ? '<span class="scholar-tag">🧓 OLD HEAD</span>' : ''}</div>
    <label class="lbl">Your face</label>
    ${avatarGrid('profAv', m.avatar, m)}
    <p class="tiny muted">👑 and 🍯 are reserved for the admin and Honey.</p>
    <label class="lbl">Roof color</label>
    <div class="row">${COLORS.map(c => `<button data-a="profColor" data-v="${c}" class="iconbtn ${m.color === c ? 'on' : ''}" style="background:${c};width:36px;height:36px"></button>`).join('')}</div>
    <label class="lbl">Your journey (shows on your house)</label><input id="p-journey" maxlength="80" value="${esc(m.journey || '')}" placeholder="e.g. Pre-med @ SUNY New Paltz">
    <button class="btn big" style="margin-top:12px" data-a="saveProfile">Save my house</button>
    <div id="pin-box"></div>
    <h3 class="px" style="margin-top:18px">📲 Make it an app</h3>
    <p class="muted tiny">iPhone: tap Share → "Add to Home Screen". Android: tap ⋮ → "Add to Home screen".</p>
    ${m.is_admin ? `<button class="btn purple big" style="margin-top:18px" data-a="stats" data-days="30">📊 Village Stats</button>
      <h3 class="px" style="margin-top:18px">👑 Admin: the residents</h3>
      <button class="btn pink big" style="margin-top:6px" data-a="newResident">➕ Add a resident (sends an invite link)</button>
      ${S.members.map(x => `<div class="panel pad" style="margin-top:8px">
        <b>${esc(x.avatar)} ${esc(x.display_name)}</b>
        <div class="row" style="margin-top:6px">
          <button class="chip ${x.is_honey ? 'on' : ''}" data-a="adminSet" data-id="${x.id}" data-f="honey">🍯 Honey filter</button>
          <button class="chip ${x.is_scholar ? 'on' : ''}" data-a="adminSet" data-id="${x.id}" data-f="scholar">🎓 Scholar</button>
          <button class="chip ${x.is_elder ? 'on' : ''}" data-a="adminSet" data-id="${x.id}" data-f="elder">🧓 Old Head</button>
          <button class="chip ${x.is_admin ? 'on' : ''}" data-a="adminSet" data-id="${x.id}" data-f="admin">👑 Admin</button>
          <button class="chip" data-a="adminPin" data-id="${x.id}">🔢 Reset PIN</button>
          <button class="chip" data-a="invite" data-id="${x.id}">📨 Invite link</button>
        </div></div>`).join('')}` : ''}
    <button class="btn plain" style="margin-top:18px;width:100%" data-a="logout">🚪 Log out on this device</button>`);
  sb.rpc('my_pin_is_set').then(({ data }) => {
    const box = $('#pin-box'); if (!box) return;
    box.innerHTML = data === false
      ? `<h3 class="px" style="margin-top:18px">🔢 Set a PIN</h3><p class="tiny muted">You came in with an invite link. Set a PIN so you can log in on another phone later.</p>
         <div class="row"><input id="p-new" class="grow" type="password" inputmode="numeric" maxlength="4" placeholder="4 numbers" style="width:50%"><button class="btn plain" data-a="changePin">Set PIN</button></div>`
      : `<h3 class="px" style="margin-top:18px">🔢 Change PIN</h3>
         <div class="row"><input id="p-old" class="grow" type="password" inputmode="numeric" maxlength="4" placeholder="old" style="width:30%">
         <input id="p-new" class="grow" type="password" inputmode="numeric" maxlength="4" placeholder="new" style="width:30%">
         <button class="btn plain" data-a="changePin">Change</button></div>`;
  });
}

function openNewResident() {
  S.form = { avatar: '🙂', honey: false, scholar: false, elder: false };
  modal(`<h2 class="px">➕ Add a resident</h2>
    <p class="muted tiny">Build their house, then text them the invite link. They tap it and they're home: no code, no PIN.</p>
    <label class="lbl">Their name</label><input id="r-name" maxlength="30" placeholder="Honey">
    <label class="lbl">Status</label>
    <div class="row">
      <button class="chip" data-a="resFlag" data-f="honey">🍯 Honey filter</button>
      <button class="chip" data-a="resFlag" data-f="scholar">🎓 Scholar</button>
      <button class="chip" data-a="resFlag" data-f="elder">🧓 Old Head</button>
    </div>
    <label class="lbl">Their face</label><div id="r-faces">${avatarGrid('resAv', '🙂', { is_honey: false })}</div>
    <p class="err" id="r-err"></p>
    <button class="btn big" data-a="createResident">Build the house + get the link</button>`);
}

async function showInvite(memberId) {
  const token = await q(sb.rpc('admin_make_invite', { p_member: memberId }));
  const m = S.byId[memberId];
  const link = `${location.origin}${location.pathname}#invite=${token}`;
  S.inviteLink = link; S.inviteName = m ? m.display_name : '';
  modal(`<h2 class="px">📨 Invite for ${esc(S.inviteName)}</h2>
    <p class="muted">Send this to ${esc(S.inviteName)}. Tapping it opens the village already logged in as them.</p>
    <div class="panel pad tiny" style="word-break:break-all;margin:10px 0">${esc(link)}</div>
    <div class="row">
      ${navigator.share ? '<button class="btn grow" data-a="shareInvite">📤 Share</button>' : ''}
      <button class="btn plain grow" data-a="copyInvite">📋 Copy</button>
    </div>
    <p class="tiny muted" style="margin-top:10px">Works once and expires in 14 days. Making a new link cancels the old one. Lost phone? Just send a fresh link.</p>`);
}

/* =====================================================================
   VILLAGE STATS (admin only)
   ===================================================================== */
const TAB_LABEL = Object.fromEntries(TABS.map(([k, ic, lb]) => [k, `${ic} ${lb}`]));
const hourLabel = h => `${(h % 12) || 12}${h < 12 ? 'a' : 'p'}`;

async function openStats(days) {
  const { data, error } = await sb.rpc('admin_traffic', { p_days: days });
  if (error) {
    return modal(`<h2 class="px">📊 Village Stats</h2><p class="muted">${/admin_traffic|function|schema cache/i.test(error.message)
      ? 'Almost there: run <b>village/setup/03_village_stats.sql</b> in Supabase to switch stats on.' : esc(error.message)}</p>`);
  }
  const d = data;
  const maxDay = Math.max(1, ...d.daily.map(x => x.people));
  const tabs = Object.entries(d.tabs || {}).sort((a, b) => b[1] - a[1]);
  const maxTab = Math.max(1, ...tabs.map(t => t[1]));
  const maxHr = Math.max(1, ...d.hours);
  const peak = d.hours.indexOf(Math.max(...d.hours));
  const people = [...d.members].sort((a, b) => (b.last_seen || '').localeCompare(a.last_seen || ''));
  const short = iso => new Date(iso + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  modal(`<h2 class="px">📊 Village Stats</h2>
    <div class="row" style="margin:8px 0">${[7, 30, 90].map(n => `<button class="chip ${n === days ? 'on' : ''}" data-a="stats" data-days="${n}">${n} days</button>`).join('')}</div>
    <div class="tiles">
      <div class="tile"><div class="tv">${d.today}</div><div class="tl">here today</div></div>
      <div class="tile"><div class="tv">${d.week}</div><div class="tl">this week</div></div>
      <div class="tile"><div class="tv">${d.residents}</div><div class="tl">residents</div></div>
      <div class="tile"><div class="tv">${d.visits}</div><div class="tl">visits · ${days}d</div></div>
    </div>
    <h3 class="px stat-h">Family members visiting per day</h3>
    <div class="bars" data-chart="daily">${d.daily.map(x => `<button class="bar" style="height:${Math.max(2, x.people / maxDay * 100)}%" data-a="tip" data-tip="${esc(short(x.d))}: ${x.people} ${x.people === 1 ? 'person' : 'people'}, ${x.visits} visits"></button>`).join('')}</div>
    <div class="axis"><span>${esc(short(d.from))}</span><span>today</span></div>
    <p class="readout tiny muted" data-for="daily">Tap a bar for details.</p>
    <h3 class="px stat-h">Who's showing up</h3>
    <table class="lb">${people.map(p => `<tr>
      <td>${esc(avOf(p.id))} <b>${esc(nameOf(p.id))}</b>${p.fav ? `<div class="tiny muted">mostly ${esc(TAB_LABEL[p.fav] || p.fav)}</div>` : ''}</td>
      <td class="tiny">${p.last_seen ? ago(p.last_seen) : '<span class="muted">never</span>'}</td>
      <td class="tiny" style="text-align:right">${p.days}/${days} days${p.streak > 1 ? ` · 🔥${p.streak}` : ''}</td></tr>`).join('')}</table>
    <h3 class="px stat-h">Most-used spots</h3>
    ${tabs.length ? tabs.map(([t, n]) => `<div class="hrow"><span class="hl">${esc(TAB_LABEL[t] || t)}</span>
      <span class="htrack"><span class="hfill" style="width:${n / maxTab * 100}%"></span></span><span class="hv">${n}</span></div>`).join('') : '<p class="muted tiny">No visits yet.</p>'}
    <h3 class="px stat-h">When the family shows up</h3>
    <div class="bars short" data-chart="hours">${d.hours.map((n, h) => `<button class="bar" style="height:${Math.max(2, n / maxHr * 100)}%" data-a="tip" data-tip="${hourLabel(h)}–${hourLabel((h + 1) % 24)}: ${n} visits"></button>`).join('')}</div>
    <div class="axis"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></div>
    <p class="readout tiny muted" data-for="hours">${d.visits ? `Peak: around ${hourLabel(peak)} (Central). Tap a bar for details.` : 'Tap a bar for details.'}</p>
    <p class="tiny muted" style="margin-top:14px">Only admins can see this. It counts visits, never what anyone types.</p>`);
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
const A = {
  closeModal,
  stats: b => openStats(+b.dataset.days),
  tip(b) {
    const chart = b.parentElement; chart.querySelectorAll('.bar').forEach(x => x.classList.toggle('sel', x === b));
    const r = document.querySelector(`.readout[data-for="${chart.dataset.chart}"]`); if (r) r.textContent = b.dataset.tip;
  },
  tab: b => { closeModal(); go(b.dataset.t); },
  welcome: b => { keepForm(); renderWelcome(b.dataset.m); restoreForm(); },
  avPick: b => { S.form.avatar = b.dataset.v; document.querySelectorAll('.avgrid button').forEach(x => x.classList.toggle('on', x === b)); },
  join: doJoin,
  login: doLogin,
  member: b => showMember(b.dataset.id),
  profile: () => openProfile(),
  profAv: b => { S.form.avatar = b.dataset.v; document.querySelectorAll('.avgrid button').forEach(x => x.classList.toggle('on', x === b)); },
  profColor: b => { S.form.color = b.dataset.v; b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); },
  async saveProfile() {
    await q(sb.from('members').update({ avatar: S.form.avatar, color: S.form.color, journey: $('#p-journey').value.trim() || null }).eq('id', S.myId));
    await loadCore(); closeModal(); renderShell(); go(S.tab); toast('House updated 🏡');
  },
  async changePin() {
    const old = $('#p-old');
    const ok = await q(sb.rpc('change_my_pin', { p_old: old ? old.value : null, p_new: $('#p-new').value }));
    toast(ok ? 'PIN saved 🔢' : "Didn't work. The PIN needs exactly 4 numbers (and your old one has to match).");
    if (ok) openProfile();
  },
  newResident: () => openNewResident(),
  resFlag(b) {
    const f = b.dataset.f; S.form[f] = !S.form[f]; b.classList.toggle('on', S.form[f]);
    if (f === 'honey') { if (S.form.honey) S.form.avatar = '🍯'; else if (S.form.avatar === '🍯') S.form.avatar = '🙂';
      $('#r-faces').innerHTML = avatarGrid('resAv', S.form.avatar, { is_honey: S.form.honey }); }
  },
  resAv: b => { S.form.avatar = b.dataset.v; document.querySelectorAll('#r-faces button').forEach(x => x.classList.toggle('on', x === b)); },
  async createResident() {
    const name = $('#r-name').value.trim();
    if (!name) return ($('#r-err').textContent = 'Give them a name.');
    const { data, error } = await sb.rpc('admin_create_resident', { p_name: name, p_avatar: S.form.avatar, p_is_honey: S.form.honey, p_is_scholar: S.form.scholar, p_is_elder: S.form.elder });
    if (error) return ($('#r-err').textContent = error.message);
    await loadCore(); confetti(16, ['🏡', '✨']); await showInvite(data);
  },
  invite: b => showInvite(b.dataset.id),
  async copyInvite() {
    try { await navigator.clipboard.writeText(S.inviteLink); toast('📋 Copied! Paste it in a text.'); }
    catch (e) { toast('Copy blocked here. Press and hold the link to copy it.'); }
  },
  shareInvite() { navigator.share({ title: 'The Family Village', text: `${S.inviteName}, tap this to move into the family village 🏡`, url: S.inviteLink }).catch(() => {}); },
  async adminSet(b) {
    const x = S.byId[b.dataset.id], f = b.dataset.f;
    if (f === 'admin' && x.id === S.myId) return toast("You can't un-crown yourself. The village needs its mayor 👑");
    const args = { p_member: x.id, p_is_honey: null, p_is_scholar: null, p_is_admin: null, p_is_elder: null };
    const val = !x['is_' + f];
    args['p_is_' + f] = val;
    const box = $('#modal .modal'), scroll = box ? box.scrollTop : 0;
    await q(sb.rpc('admin_set_member', args));
    await loadCore(); openProfile();
    const nb = $('#modal .modal'); if (nb) nb.scrollTop = scroll;
    const label = { honey: '🍯 Honey filter', scholar: '🎓 Scholar', admin: '👑 Admin', elder: '🧓 Old Head' }[f];
    toast(`${label} ${val ? 'ON' : 'OFF'} for ${x.display_name}`);
    if (x.id === S.myId) { renderShell(); go(S.tab, true); openProfile(); const nb2 = $('#modal .modal'); if (nb2) nb2.scrollTop = scroll; }
  },
  async adminPin(b) {
    const pin = prompt(`New 4-digit PIN for ${nameOf(b.dataset.id)}:`);
    if (!pin) return;
    await q(sb.rpc('admin_reset_pin', { p_member: b.dataset.id, p_new: pin }));
    toast('PIN reset. Tell them the new one 🤫');
  },
  async logout() {
    if (!confirm('Log out on this device? You can log back in with your name + PIN.')) return;
    await sb.rpc('logout_village'); await sb.auth.signOut();
    localStorage.removeItem('village-last-seen'); location.hash = ''; location.reload();
  },
  // Ws
  wkind: b => { S.draft.kind = b.dataset.k; b.parentElement.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b));
    $('#w-body').placeholder = S.draft.kind === 'win' ? 'What did you do? Brag. Go ahead.' : 'What did you work on today?'; },
  wmin: b => { $('#w-min').value = b.dataset.m; },
  htype: b => { S.draft.htype = b.dataset.h; b.parentElement.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); },
  toggleNsfh: b => { b.classList.toggle('on'); if (b.classList.contains('on')) toast('🍯 Marked Not Safe For Honey. Grandma will see something sweet instead.'); },
  async postWin() {
    const body = $('#w-body').value.trim();
    if (!body) return toast('Type something first. Even a small W counts.');
    const min = parseInt($('#w-min').value, 10);
    const ns = $('#ns-win');
    const minutes = isNaN(min) ? null : min;
    await q(sb.from('wins').insert({ kind: S.draft.kind, body, minutes, hours_type: minutes || S.draft.kind === 'checkin' ? htype() : null, nsfh: !!(ns && ns.classList.contains('on')), member_id: S.myId }));
    confetti(); $('#w-body').value = ''; $('#w-min').value = '';
    await loadCore(); go('ws', true);
  },
  async react(b) {
    const id = +b.dataset.id, e = b.dataset.e;
    if (b.classList.contains('mine')) await q(sb.from('win_emojis').delete().match({ win_id: id, member_id: S.myId, emoji: e }));
    else await q(sb.from('win_emojis').insert({ win_id: id, emoji: e, member_id: S.myId }));
    go('ws', true);
  },
  async send(b) {
    const t = b.dataset.target, c = readComposer(t);
    if (!c.body && !c.reaction_image_id) return toast('Say something (or pick a photo) first.');
    if (t === 'k') {
      await q(sb.from('kitchen_messages').insert({ ...c, member_id: S.myId }));
      clearComposer(t); pollKitchen();
    } else {
      await q(sb.from('comments').insert({ ...c, win_id: +t.slice(1), member_id: S.myId }));
      clearComposer(t); go('ws', true);
    }
  },
  memePicker: b => openMemeVault(b.dataset.target),
  memeVault: () => openMemeVault(),
  pickMeme: b => { setPick(b.dataset.target, +b.dataset.id); closeModal(); },
  unpick: b => { delete S.picks[b.dataset.target]; $('#pk-' + b.dataset.target).innerHTML = ''; },
  uploadMeme: b => openUpload(b.dataset.target),
  doUpload: b => doUpload(b.dataset.target),
  memeMenu(b) {
    const m = S.memeById[b.dataset.id];
    modal(`<img src="${esc(imgUrl(m.path))}" style="width:100%;border:3px solid var(--ink);border-radius:4px">
      <h2 class="px" style="margin-top:8px">${esc(m.name)}</h2><p class="muted tiny">added by ${esc(nameOf(m.member_id))} · ${ago(m.created_at)}</p>
      <div class="row">${!isHoney() && !m.nsfh ? `<button class="btn plain" data-a="honeyProof" data-kind="meme" data-id="${m.id}">🍯 Honey-proof this</button>` : ''}
      ${m.member_id === S.myId || S.me.is_admin ? `<button class="btn plain" data-a="del" data-kind="meme" data-id="${m.id}">🗑️ Delete</button>` : ''}</div>`);
  },
  itemMenu(b) {
    const { kind, id, owner } = b.dataset;
    const can = owner === S.myId || S.me.is_admin;
    const opts = [];
    if (kind === 'comment') opts.push(`<button class="choice" data-a="promote" data-id="${id}">💬 Put this on the Quotes Wall</button>`);
    if (!isHoney()) opts.push(`<button class="choice" data-a="honeyProof" data-kind="${kind}" data-id="${id}">🍯 Honey-proof this</button>`);
    if (can) opts.push(`<button class="choice" data-a="del" data-kind="${kind}" data-id="${id}">🗑️ Delete</button>`);
    if (!opts.length) return;
    modal(`<h3 class="px">What do you want to do?</h3>${opts.join('')}`);
  },
  async honeyProof(b) {
    await q(sb.rpc('honey_proof', { p_kind: b.dataset.kind, p_id: +b.dataset.id }));
    closeModal(); toast('🍯 Honey-proofed. Grandma is safe.'); await loadCore(); go(S.tab, true);
  },
  async del(b) {
    if (!confirm('Delete this forever?')) return;
    const table = { win: 'wins', comment: 'comments', quote: 'quotes', kitchen: 'kitchen_messages', meme: 'reaction_images' }[b.dataset.kind];
    if (b.dataset.kind === 'meme') { const m = S.memeById[b.dataset.id]; if (m) await sb.storage.from('reactions').remove([m.path]); }
    await q(sb.from(table).delete().eq('id', +b.dataset.id));
    closeModal(); await loadCore(); go(S.tab, true);
  },
  async promote(b) {
    const c = await q(sb.from('comments').select('*').eq('id', +b.dataset.id).single());
    if (!c.body) return toast("Photo-only roasts can't go on the wall (yet).");
    const w = await q(sb.from('wins').select('nsfh').eq('id', c.win_id).maybeSingle());
    await q(sb.from('quotes').insert({ body: c.body, said_by: nameOf(c.member_id), said_by_member: c.member_id, source_comment_id: c.id, nsfh: c.nsfh || !!(w && w.nsfh), submitted_by: S.myId }));
    closeModal(); toast('💬 Immortalized on the Quotes Wall');
  },
  // daily
  readAloud: () => { const t = S.data.daily.trivia; speak(`${t.question}. ${t.choices.map((c, i) => `${'ABCD'[i]}: ${c}`).join('. ')}`); },
  async answer(b) {
    const res = await q(sb.rpc('answer_trivia', { p_question: +b.dataset.q, p_choice: +b.dataset.i }));
    if (res.correct) confetti(20, ['🧠', '✨', '🎉']);
    await go('daily', true);
  },
  addTrivia() {
    modal(`<h2 class="px">➕ New trivia question</h2>
      <p class="muted tiny">It goes in the vault and gets picked on a future day. Nobody sees it early (except you).</p>
      <label class="lbl">Question</label><textarea id="t-q" maxlength="300" placeholder="What year did ___ back the car into the mailbox?"></textarea>
      <label class="lbl">Answers (tap the circle next to the right one)</label>
      ${[0, 1, 2, 3].map(i => `<div class="row" style="margin-top:6px"><input type="radio" name="t-ok" value="${i}" style="width:auto" ${i === 0 ? 'checked' : ''}>
        <input id="t-c${i}" class="grow" maxlength="120" placeholder="${i < 2 ? 'Answer ' + 'ABCD'[i] : 'Answer ' + 'ABCD'[i] + ' (optional)'}" style="width:auto"></div>`).join('')}
      <label class="lbl">Type</label><select id="t-cat"><option value="family">🏠 Family lore</option><option value="science">🧪 Science</option><option value="general">🌎 General</option></select>
      <p class="err" id="t-err"></p>
      <button class="btn big" data-a="saveTrivia">Add to the vault</button>`);
  },
  async saveTrivia() {
    const question = $('#t-q').value.trim();
    const raw = [0, 1, 2, 3].map(i => $('#t-c' + i).value.trim());
    const okIdx = +document.querySelector('input[name=t-ok]:checked').value;
    if (!question) return ($('#t-err').textContent = 'Write the question.');
    if (!raw[okIdx]) return ($('#t-err').textContent = 'The answer marked correct is empty.');
    const choices = [], map = {};
    raw.forEach((c, i) => { if (c) { map[i] = choices.length; choices.push(c); } });
    if (choices.length < 2) return ($('#t-err').textContent = 'Give at least 2 answers.');
    await q(sb.rpc('add_trivia', { p_question: question, p_choices: choices, p_answer: map[okIdx], p_category: $('#t-cat').value }));
    closeModal(); toast('🧠 Added to the vault. Act natural.');
  },
  async postScore() {
    const raw = $('#g-raw').value.trim();
    const p = parseGame(raw);
    if (!p) return toast("Couldn't read that. Paste the whole share text from Wordle, Connections, Strands, or the Mini.");
    const { error } = await sb.from('game_scores').insert({ ...p, raw: raw.slice(0, 600), member_id: S.myId });
    if (error) return toast(error.code === '23505' ? "You already posted that one 👀" : '😬 ' + error.message);
    $('#g-raw').value = '';
    if (p.game === 'wordle' && p.score <= 2) confetti(30, ['🟩', '🤯', '✨']);
    toast(`${GAME_INFO[p.game].em} Posted: ${GAME_INFO[p.game].fmt(p.score)}`);
    await loadCore(); go('daily', true);
  },
  // quotes
  addQuote() {
    modal(`<h2 class="px">💬 Add a quote</h2>
      <label class="lbl">What did they say?</label><textarea id="q-body" maxlength="400"></textarea>
      <label class="lbl">Who said it?</label>
      <select id="q-who">${S.members.map(m => `<option value="${m.id}">${esc(m.avatar)} ${esc(m.display_name)}</option>`).join('')}<option value="">Someone else…</option></select>
      <input id="q-other" maxlength="40" placeholder="their name" style="margin-top:6px">
      <label class="lbl">Context (optional)</label><input id="q-ctx" maxlength="200" placeholder="at Thanksgiving, about the turkey">
      <label class="lbl">When?</label><input id="q-date" type="date" value="${today()}">
      ${isHoney() ? '' : '<label class="row" style="margin-top:10px"><input type="checkbox" id="q-nsfh" style="width:auto"> 🍯 Not Safe For Honey</label>'}
      <p class="err" id="q-err"></p>
      <button class="btn big" data-a="saveQuote">Put it on the wall</button>`);
  },
  async saveQuote() {
    const body = $('#q-body').value.trim(), who = $('#q-who').value, other = $('#q-other').value.trim();
    if (!body) return ($('#q-err').textContent = 'What did they say?');
    if (!who && !other) return ($('#q-err').textContent = 'Who said it?');
    await q(sb.from('quotes').insert({
      body, said_by: who ? nameOf(who) : other, said_by_member: who || null, context: $('#q-ctx').value.trim() || null,
      said_on: $('#q-date').value || today(), nsfh: !!($('#q-nsfh') && $('#q-nsfh').checked), submitted_by: S.myId,
    }));
    closeModal(); toast('💬 On the wall forever'); go('quotes', true);
  },
  async voteQuote(b) {
    const cat = S.data.quotes.qom;
    await q(sb.from('award_votes').upsert({ category_id: cat.id, period_key: monthKey(), voter: S.myId, nominee_id: String(b.dataset.id) }, { onConflict: 'category_id,period_key,voter' }));
    toast('🗳️ Vote cast. Secret ballot, very official.'); go('quotes', true);
  },
  // awards
  vote: b => openVote(+b.dataset.c, b.dataset.p),
  async castVote(b) {
    await q(sb.from('award_votes').upsert({ category_id: +b.dataset.c, period_key: b.dataset.p, voter: S.myId, nominee_id: b.dataset.n }, { onConflict: 'category_id,period_key,voter' }));
    closeModal(); toast('🗳️ Vote locked in (until you change it)'); go('awards', true);
  },
  async second(b) { await q(sb.rpc('second_category', { p_category: +b.dataset.id })); await loadCore(); go('awards', true); },
  proposeCat() {
    modal(`<h2 class="px">💡 Propose an award</h2>
      <p class="muted tiny">If 3 people second it, it becomes an official monthly award.</p>
      <label class="lbl">Award name</label><input id="c-name" maxlength="60" placeholder="Worst Driver">
      <label class="lbl">Emoji</label><input id="c-emoji" maxlength="4" value="🏆">
      <label class="lbl">People vote for a…</label>
      <select id="c-type"><option value="member">person</option><option value="quote">quote</option><option value="meme">meme</option><option value="comment">roast</option><option value="win">W</option></select>
      <button class="btn big" style="margin-top:12px" data-a="saveCat">Propose it</button>`);
  },
  async saveCat() {
    const name = $('#c-name').value.trim(); if (!name) return;
    const row = await q(sb.from('award_categories').insert({ name, emoji: $('#c-emoji').value.trim() || '🏆', kind: 'vote', period: 'month', nominee_type: $('#c-type').value, proposed_by: S.myId, approved: false }).select().single());
    await q(sb.rpc('second_category', { p_category: row.id }));
    closeModal(); await loadCore(); go('awards', true); toast('💡 Proposed! Go recruit 2 more seconds.');
  },
  // love
  loveMenu() {
    modal(`<h2 class="px">🫶 psst</h2><p class="muted">Send someone an anonymous "lowkey proud of you." They'll never know it was you. Nobody will.</p>
      ${S.members.filter(m => m.id !== S.myId).map(m => `<button class="choice" data-a="sendLove" data-id="${m.id}">${esc(m.avatar)} ${esc(m.display_name)}</button>`).join('')}
      <p class="tiny muted center" id="love-total" style="margin-top:12px"></p>`);
    sb.rpc('village_love_total').then(({ data }) => { const el = $('#love-total'); if (el && data) el.textContent = `This family has secretly sent ${data} 🫶 so far. Softies.`; });
  },
  async sendLove(b) { await q(sb.rpc('send_love', { p_to: b.dataset.id })); closeModal(); toast('🫶 Sent. Your secret is safe. 🤐'); },
  async seenLove() { await q(sb.from('secret_love').update({ seen: true }).eq('seen', false)); confetti(14, ['🫶', '💕']); go('home', true); },
  resultsPick: el => { S.resultsView = el.value; go('awards', true); },
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  const fn = A[b.dataset.a];
  if (fn) { e.preventDefault(); Promise.resolve(fn(b, e)).catch(err => console.error(err)); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el && A[el.dataset.change]) A[el.dataset.change](el);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const el = e.target.closest('[data-enter]');
  if (el) { e.preventDefault(); const btn = document.getElementById(el.dataset.enter); if (btn) btn.click(); }
});

const VIEWS = { home: Home, ws: Ws, daily: Daily, quotes: Quotes, kitchen: Kitchen, awards: Awards };

boot();

/* =====================================================================
   CLOUD SAVE for the games
   Saves a game to the player's Family Village account (or, for the
   Dungeon, PB's Pot login) so progress survives a new phone, cleared
   browser data, or Safari tidying up. The browser copy stays too.
   Needs supabase-js loaded first. Uses village/setup/07_game_saves_and_safety.sql.

   How a device and the cloud are reconciled (see connect()):
   - Nothing played on this device yet (updatedAt 0): load the cloud save.
     A fresh browser or a freshly installed app never pushes an empty game.
   - First time this device links to THIS account, and both sides have
     progress that differs: ask the player which to keep. The other copy is
     kept on the device as a backup (<localKey>_before_sync or
     <localKey>_cloud_before_sync), so nothing is thrown away.
   - After that: the newest save wins (normal phone + laptop use), and the
     database refuses a save older than the one it has.

   CloudSave.account(opts) opens a small "Cloud save" box with a Village
   log-in (family code + name + PIN, the same as the Village) and log-out.
   Installed home-screen apps on iPhone have their own storage, so they
   need to log in once inside the app; the box opens by itself the first
   time an installed app runs without a login.
   ===================================================================== */
(function () {
'use strict';
const URL = 'https://xsihxxwqbguxpvmhpdqo.supabase.co';
const KEY = 'sb_publishable_mMfWPoSYDQUqkCM4rUaccA_6_n8u4XL';   // publishable key: safe to be public

let village = null;
function villageClient() {
  // same storage key as the Village, so a Village login on this browser is shared here.
  // It only signs in when the player uses the log-in box below.
  if (!village && window.supabase) {
    village = window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'family-village-auth', detectSessionInUrl: false },
    });
  }
  return village;
}

const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Running as an installed home-screen app (Android or iPhone)?
function isApp() {
  try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; }
  catch (e) { return false; }
}
const here = () => (isApp() ? 'this app' : 'this browser');

// { id, name } of the Village member logged in on this client, or null
async function villageMember(client) {
  try {
    const { data: id } = await client.rpc('my_member_id');
    if (!id) return null;
    const { data } = await client.from('members').select('display_name').eq('id', id).single();
    return { id: String(id), name: data && data.display_name ? data.display_name : '' };
  } catch (e) { return null; }
}

async function tryAccount(client, game) {
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;
  const { data, error } = await client.rpc('game_save_get', { p_game: game });
  if (error || !data || !data.account) return null;
  return { client, remote: data, uid: session.user.id };
}

/* ---------------- small self-contained pop-up ---------------- */
function css() {
  if (document.getElementById('cs-style')) return;
  const s = document.createElement('style'); s.id = 'cs-style';
  s.textContent = `.cs-bg{position:fixed;inset:0;z-index:2147483000;background:rgba(10,6,16,.6);display:flex;align-items:center;justify-content:center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom))}
.cs-card{background:#fffaf2;color:#2b2233;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;width:100%;max-width:430px;max-height:90vh;overflow:auto;border-radius:14px;padding:18px;box-shadow:0 10px 40px rgba(0,0,0,.4);text-align:left;letter-spacing:0;word-spacing:0}
.cs-card h2{font-size:20px;margin:0 0 8px;font-family:inherit;color:inherit}
.cs-card h3{font-size:16px;margin:16px 0 6px;font-family:inherit;color:inherit}
.cs-card p{margin:0 0 10px}
.cs-card label{display:block;font-weight:700;font-size:14px;margin:10px 0 4px}
.cs-card input{box-sizing:border-box;width:100%;min-height:44px;font:inherit;font-size:16px;color:#2b2233;background:#fff;border:2px solid #2b2233;border-radius:8px;padding:8px 10px}
.cs-card button{min-height:44px;font:inherit;font-weight:700;color:#2b2233;background:#fff;border:2px solid #2b2233;border-radius:10px;padding:8px 14px;cursor:pointer}
.cs-card button.cs-main{background:#2b2233;color:#fff}
.cs-card button.cs-warn{border-color:#b3263b;color:#b3263b}
.cs-card button.cs-pick{display:block;width:100%;text-align:left;margin:8px 0;font-weight:400}
.cs-card button.cs-pick b{display:block;font-size:17px}
.cs-card button:disabled{opacity:.6;cursor:default}
.cs-row{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px}
.cs-muted{color:#5d536a;font-size:14px}
.cs-err{color:#b3263b;font-weight:700;min-height:1.5em;margin-top:8px}
.cs-card a{color:#5a3fb0}`;
  document.head.appendChild(s);
}
function popup(html) {
  css();
  const bg = document.createElement('div'); bg.className = 'cs-bg';
  bg.innerHTML = `<div class="cs-card" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(bg);
  const first = bg.querySelector('input,button'); if (first) setTimeout(() => first.focus(), 30);
  return { el: bg, $: q => bg.querySelector(q), close: () => bg.remove() };
}

const when = ms => (ms ? new Date(ms).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown');

// Device and cloud both have progress and they differ: let the player pick.
function chooseSave(where, local, localText, remote) {
  const big = localText.length > remote.state.length * 1.1 ? 'local' : remote.state.length > localText.length * 1.1 ? 'remote' : '';
  return new Promise(resolve => {
    const p = popup(`<h2>☁ Two different saves</h2>
      <p>The save on ${here()} doesn't match the one in <b>${esc(where)}</b>. Which one do you want to keep playing?</p>
      <button class="cs-pick" data-k="local"><b>📱 The save on ${here()}</b>Last changed ${esc(when(local.updatedAt))}${big === 'local' ? ' · has more in it' : ''}</button>
      <button class="cs-pick" data-k="remote"><b>☁ The cloud save</b>Last saved ${esc(when(remote.updated_ms))}${big === 'remote' ? ' · has more in it' : ''}</button>
      <p class="cs-muted">The one you don't pick is tucked away as a backup on ${here()}, so nothing is deleted. If you're not sure, pick the one with more in it.</p>`);
    p.el.querySelectorAll('.cs-pick').forEach(b => b.addEventListener('click', () => { p.close(); resolve(b.dataset.k); }));
  });
}

const LOGIN_MSG = {
  bad_code: "That's not the family code.", code_locked: 'Too many wrong family codes. Try again in 15 minutes.',
  no_member: "Nobody by that name lives in the Village. Check the spelling (it's the name you use in the Village).",
  bad_pin: 'Wrong PIN. (5 wrong tries locks it for 15 minutes.)', locked: 'Too many wrong PINs. Try again in 15 minutes, or ask an admin to reset it.',
  not_signed_in: 'Something hiccuped. Try again.',
};

/* opts: { intro, pot: { user(), signIn(), signOut() } }   (pot is for the Dungeon) */
async function account(opts = {}) {
  const c = villageClient();
  if (!c) { alert('The cloud save needs the internet. Try again when you are online.'); return; }
  let me = null;
  try { const { data: { session } } = await c.auth.getSession(); if (session) me = await villageMember(c); } catch (e) {}
  const potUser = opts.pot && opts.pot.user ? opts.pot.user() : null;

  const villageHTML = me
    ? `<p>This game backs up to <b>${esc(me.name || 'your')}'s Village account</b>.</p>
       <button class="cs-warn" id="csOut">🚪 Log out of the Village</button>
       <p class="cs-muted" style="margin-top:6px">This logs ${here()} out of the <b>Family Village too</b>, not just this game${isApp() ? '' : ', and every other game on this browser that backs up to the Village'}. Your progress stays saved in the cloud.</p>`
    : `<p>Log in with your <b>Family Village</b> name and PIN to back this game up and load your cloud save.</p>
       <label for="csCode">Family code</label><input id="csCode" autocomplete="off" autocapitalize="none" spellcheck="false">
       <label for="csName">Your name (as it is in the Village)</label><input id="csName" autocomplete="off" maxlength="30">
       <label for="csPin">Your 4-digit PIN</label><input id="csPin" type="password" inputmode="numeric" maxlength="4" autocomplete="off">
       <div class="cs-err" id="csErr"></div>
       <div class="cs-row" style="margin-top:4px"><button class="cs-main" id="csIn">Log in</button></div>`;
  const potHTML = !opts.pot ? '' : potUser
    ? `<h3>🔐 Pot login</h3><p>Signed in to the Pot as <b>${esc(potUser)}</b>.</p>
       <button class="cs-warn" id="csPotOut">Sign out of the Pot</button>
       <p class="cs-muted" style="margin-top:6px">This also signs ${here()} out of the Loot Ledger and The Pot.</p>`
    : `<h3>🔐 Or use your Pot login</h3><button id="csPotIn">Sign in with your Pot email</button>`;

  const p = popup(`<h2>☁ Cloud save</h2>
    ${opts.intro ? `<p>${opts.intro}</p>` : ''}
    ${villageHTML}${potHTML}
    <p class="cs-muted" style="margin-top:14px">Moving a save that's only on another browser or app? Copy its backup code there, then restore it in this game's settings.</p>
    <div class="cs-row"><button id="csClose">Close</button></div>`);
  p.$('#csClose').addEventListener('click', p.close);

  if (me) {
    const out = p.$('#csOut');
    out.addEventListener('click', async () => {
      if (!out.dataset.sure) { out.dataset.sure = '1'; out.textContent = 'Tap again to log out of the Village'; return; }
      out.disabled = true;
      try { await c.rpc('logout_village'); } catch (e) {}
      await c.auth.signOut().catch(() => {});
      location.reload();
    });
  } else {
    const go = async () => {
      const code = p.$('#csCode').value.trim(), name = p.$('#csName').value.trim(), pin = p.$('#csPin').value.trim();
      const err = t => { p.$('#csErr').textContent = t; };
      if (!code || !name || !/^\d{4}$/.test(pin)) return err('Fill in the family code, your name and your 4-digit PIN.');
      const btn = p.$('#csIn'); btn.disabled = true; err('');
      try {
        const { data: { session } } = await c.auth.getSession();
        if (!session) { const r = await c.auth.signInAnonymously(); if (r.error) throw r.error; }
        const { data, error } = await c.rpc('login_village', { p_code: code, p_name: name, p_pin: pin });
        if (error) throw error;
        if (data !== 'ok') { btn.disabled = false; return err(LOGIN_MSG[data] || data); }
        p.$('#csErr').style.color = '#2f7a46'; err('Logged in! Loading your cloud save…');
        setTimeout(() => location.reload(), 600);
      } catch (e) { btn.disabled = false; err("Couldn't reach the Village. Check your internet and try again."); }
    };
    p.$('#csIn').addEventListener('click', go);
    p.$('#csPin').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  if (opts.pot) {
    const pi = p.$('#csPotIn'), po = p.$('#csPotOut');
    if (pi) pi.addEventListener('click', () => { p.close(); opts.pot.signIn(); });
    if (po) po.addEventListener('click', () => { po.disabled = true; opts.pot.signOut(); });
  }
}

/* opts: { game, localKey, getState(), setState(obj), status(text), potClient(), pot }
   Returns a ref with set({ state, updatedAt }) once connected, or null (device-only). */
async function connect(opts) {
  const say = t => { try { opts.status && opts.status(t); } catch (e) {} };
  if (!window.supabase) { say('Saved on this device'); return null; }
  let hit = null, where = '', who = '';
  const tries = [];
  if (opts.potClient) tries.push(['your Pot login', opts.potClient]);
  tries.push(['your Village account', villageClient, true]);
  for (const [label, get, isVillage] of tries) {
    try { hit = await tryAccount(get(), opts.game); } catch (e) { hit = null; }
    if (hit) {
      who = hit.uid; where = label;
      if (isVillage) { const m = await villageMember(hit.client); if (m) { who = 'm:' + m.id; if (m.name) where = m.name + "'s Village account"; } }
      break;
    }
  }
  if (!hit) {
    say('Saved on this device only · log in under Settings → ☁ Cloud save to back it up');
    // An installed app starts with its own empty storage (on iPhone), so offer the log-in once.
    const hello = 'cloudsave-app-hello-' + opts.game;
    if (isApp() && !read(hello)) {
      write(hello, '1');
      setTimeout(() => account({ pot: opts.pot, intro: "You're using the installed app. On iPhone it keeps its own storage, apart from Safari, so <b>log in once here</b> to load your cloud save and keep backing up." }), 800);
    }
    return null;
  }

  const local = opts.getState(), localText = JSON.stringify(local), remote = hit.remote;
  const linkKey = 'cloudsave-linked-' + opts.game, linkVal = read(linkKey);
  // linked = this device already synced with this same account ('1' = linked before accounts were recorded)
  const linked = !!linkVal && (linkVal === '1' || linkVal === who);
  if (remote.state && remote.state !== localText) {
    let takeRemote;
    if (linked) takeRemote = (remote.updated_ms || 0) > (local.updatedAt || 0);   // newest wins
    else if (!local.updatedAt) takeRemote = true;                                 // nothing played here yet
    else takeRemote = (await chooseSave(where, local, localText, remote)) === 'remote';
    if (takeRemote) {
      write(opts.localKey + '_before_sync', localText);   // just in case
      try { opts.setState(JSON.parse(remote.state)); } catch (e) {}
    } else if (!linked) {
      // keeping this device's save: tuck the cloud copy away, and make this one the newest
      // so the cloud accepts it instead of loading the other one over it
      write(opts.localKey + '_cloud_before_sync', remote.state);
      local.updatedAt = Date.now();
    }
  }
  write(linkKey, who);
  say('☁ Saved to ' + where);

  // The cloud save this device last saw. If another device saved after that
  // (the game was open on a phone AND a laptop), load that newer progress
  // instead of overwriting it with this device's older game.
  let seen = remote.updated_ms || 0;
  async function takeNewer() {
    const { data, error } = await hit.client.rpc('game_save_get', { p_game: opts.game });
    if (error || !data || !data.account || !data.state) return false;
    write(opts.localKey + '_before_sync', JSON.stringify(opts.getState()));   // just in case
    seen = data.updated_ms || 0;
    try { opts.setState(JSON.parse(data.state)); } catch (e) { return false; }
    say('☁ Loaded newer progress from your other device');
    return true;
  }
  return {
    where,
    async set(p) {
      const check = await hit.client.rpc('game_save_get', { p_game: opts.game });
      if (!check.error && check.data && check.data.account && (check.data.updated_ms || 0) > seen && await takeNewer()) return check.data;
      const updated = Math.round(p.updatedAt || 0);
      const { data, error } = await hit.client.rpc('game_save_put', { p_game: opts.game, p_state: p.state, p_updated: updated });
      if (error || !data || !data.account) throw error || new Error('Not signed in');
      // the cloud refused it because it already has something newer: load that
      if ((data.updated_ms || 0) > updated) { await takeNewer(); return data; }
      seen = data.updated_ms || updated;
      return data;
    },
  };
}

window.CloudSave = { connect, account, isApp };
})();

/* =====================================================================
   CLOUD SAVE for the games
   Saves a game to the player's Family Village account (or, for the
   Dungeon, PB's Pot login) so progress survives a new phone, cleared
   browser data, or Safari tidying up. The browser copy stays too.
   Needs supabase-js loaded first. Uses village/setup/07_game_saves_and_safety.sql.
   ===================================================================== */
(function () {
'use strict';
const URL = 'https://xsihxxwqbguxpvmhpdqo.supabase.co';
const KEY = 'sb_publishable_mMfWPoSYDQUqkCM4rUaccA_6_n8u4XL';   // publishable key: safe to be public

let village = null;
function villageClient() {
  // same storage key as the Village, so a Village login on this browser is shared here.
  // It never signs anyone in by itself.
  if (!village && window.supabase) {
    village = window.supabase.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'family-village-auth', detectSessionInUrl: false },
    });
  }
  return village;
}

async function tryAccount(client, game) {
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  if (!session) return null;
  const { data, error } = await client.rpc('game_save_get', { p_game: game });
  if (error || !data || !data.account) return null;
  return { client, remote: data };
}

const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

/* opts: { game, localKey, getState(), setState(obj), status(text), potClient() }
   Returns a ref with set({ state, updatedAt }) once connected, or null (device-only). */
async function connect(opts) {
  const say = t => { try { opts.status && opts.status(t); } catch (e) {} };
  if (!window.supabase) { say('Saved on this device'); return null; }
  let hit = null, where = '';
  const tries = [];
  if (opts.potClient) tries.push(['your Pot login', opts.potClient]);
  tries.push(['your Village account', villageClient]);
  for (const [label, get] of tries) {
    try { hit = await tryAccount(get(), opts.game); } catch (e) { hit = null; }
    if (hit) { where = label; break; }
  }
  if (!hit) { say('Saved on this device · log in to the Village to back it up'); return null; }

  const local = opts.getState(), localText = JSON.stringify(local), remote = hit.remote;
  const linkKey = 'cloudsave-linked-' + opts.game;
  if (remote.state && remote.state !== localText) {
    // after this device has synced once, the newest save wins.
    // the very first time, keep the bigger save, so a fresh phone can't wipe real progress.
    const takeRemote = read(linkKey)
      ? (remote.updated_ms || 0) > (local.updatedAt || 0)
      : remote.state.length >= localText.length;
    if (takeRemote) {
      write(opts.localKey + '_before_sync', localText);   // just in case
      try { opts.setState(JSON.parse(remote.state)); } catch (e) {}
    }
  }
  write(linkKey, '1');
  say('☁ Saved to ' + where);
  return {
    where,
    async set(p) {
      const { data, error } = await hit.client.rpc('game_save_put', { p_game: opts.game, p_state: p.state, p_updated: Math.round(p.updatedAt || 0) });
      if (error || !data || !data.account) throw error || new Error('Not signed in');
      return data;
    },
  };
}

window.CloudSave = { connect };
})();

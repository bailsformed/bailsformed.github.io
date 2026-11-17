# Handoff: bailsformed.github.io, for a real-visitor review

Written 2026-11-13 from the repo (main at `541f506`), the git history, the SQL setup files, and the live Supabase project's public settings. This file was first committed on 2026-11-16 at Bailey's request (it is public, like the rest of the repo). It holds no secrets: no service-role key, passwords, family code, invite links, or database connection strings.

**Read section 6 ("What NOT to do") before you click anything.** These sites are live, and real family members use them today.

---

## 0. How the site works

- **Hosting:** a static GitHub Pages site. Every push to `main` goes live at https://bailsformed.github.io in about a minute. There's no server code: each page is plain HTML and JavaScript running in the browser.
- **Database and logins:** a single Supabase project (the address starts with `xsihxxwqbguxpvmhpdqo`). The website uses Supabase's *publishable* (public) key. That key is meant to be public; what keeps data safe is the row-level security rules in section 3.
- **Visitor counts:** GoatCounter (simple page-view counting) runs on the homepage, the Village, and most of the games.
- **Search engines:** the Village, The Pot, and the personal games are marked `noindex`, so Google won't list them. Anyone who has the link can still open them.

---

## 1. Site map

| URL path | What it is | Who it's for | Status | On homepage? |
|---|---|---|---|---|
| `/` | Homepage: pixel-art cards linking to everything below | Everyone | Live | n/a |
| `/medquest/` | **MedQuest: Bailey's Road to the White Coat**, a study/pre-med progress RPG | Bailey (site owner) | Live | ✅ "My projects" |
| (card only) | "Next project", a "Coming soon" placeholder card with no link | n/a | Placeholder | ✅ |
| `/village/` | **The Family Village**, a private family social app (section 2) | The whole family | Live | ✅ "The family village" |
| `/dungeon/` | **Med School Dungeon**, a dungeon-crawler study game with a 💰 Loot Ledger tab tied to The Pot | PB (Bailey's partner) | Live | ✅ "Made for someone special" |
| `/nola/` | **Magnolia Isle 🌸**, a cozy island game | Nola | Live | ✅ |
| `/luke/` | **Operation: Open Field**, a mission-style game | Luke | Live | ✅ |
| `/feast/` | **The Moveable Feast**, a grown-up life and budgeting RPG (Paris / Hemingway theme): budget, loans, billable hours, tax reminders | Gage (brother, new lawyer) | Live | ✅ |
| `/kyla/` | **Gremlin Town**, a college-prep RPG | Kyla | Live | ✅ |
| `/ashley/` | **Sunbeam Farm**, a cozy budget farm game: budget crops, bill chore board, paycheck shipping bin, savings jars, spreadsheet import | Ashley (**not** a Village member) | Live | ✅ |
| `/little-freak/` | **Unmarketable Little Freak**, a self-discovery RPG | Mom | Live, **unlisted** (direct link only) | ❌ on purpose |
| `/underworld/` | **The Underworld Apothecary**, Bailey's own budget RPG (Hades theme) | Bailey only | Live, **unlisted** | ❌ on purpose |
| `/pot/` | **The Pot**, a shared money tracker for two people: accounts, budget, bills, ledger, runway, subscriptions, Google Calendar link | Bailey + PB | Live, unlisted | ❌ (reached from the Dungeon and by link) |

**Player guides** (plain how-to pages). As of the 2026-11-13 user review, only Gremlin Town links its guide from settings ("📖 Game guide"); the other games' guides exist but are **not linked from inside the games** until the `fix/review-polish` PR merges, which adds the link to each game's settings/menu:
`/medquest/guide.html`, `/dungeon/guide.html`, `/nola/guide.html`, `/luke/guide.html`, `/little-freak/guide.html`, `/feast/guide.html`, `/kyla/guide.html`.
The Underworld and Sunbeam Farm have no guide; for the Underworld that's on purpose.

---

## 2. The Family Village (`/village/`)

A phone-first family social app with a bottom tab bar: **🏡 Village · 💪 Ws · 🎲 Daily · 💬 Quotes · 🍽️ Kitchen · 🏆 Awards**. The round face button at the top right opens your profile ("house"). **❓** opens the in-app Village Guide. A small **🫶** sits in the bottom corner.

### 2a. Features

| Feature | Where in the UI | Status |
|---|---|---|
| **The Street**: a house per person, 🏮 lantern if they were active today, 🔥 streak, 🏆 trophy count, badges | 🏡 Village tab | Done |
| **Hot Seat** (one person spotlighted each day), "since you left" recap, this month's leaderboard | 🏡 Village tab | Done |
| **W tracker**: post a W (brag) or a check-in, optionally with minutes as 📚 Study or 💼 Work hours | 💪 Ws tab | Done |
| Reactions on Ws (🙄 🤡 👑 🧢 💀 🫡 "who asked"), roast comments, photo replies, the village's own snarky commentary line | 💪 Ws tab | Done |
| **Meme library ("Meme Vault")**: upload family photos (auto-shrunk, max 2 MB) and use them as reactions in comments and chat | 🏡 Village tab → 🖼️ Meme Vault, or the photo button in any composer | Done |
| **Quotes Wall**: save funny family quotes (who said it, context, date); ⋯ on a roast → "send to the Quotes Wall"; 👑 Hall of Fame | 💬 Quotes tab | Done |
| **Kitchen Table**: the family group chat (text and meme photos) | 🍽️ Kitchen tab | Done. It refreshes every ~6 seconds while open; it is not instant/live. |
| **Daily trivia**: one question a day, 🔊 read aloud, others' answers hidden until you answer, add your own family-lore questions. When the question pool runs out, old ones come back as ♻️ "Throwbacks". | 🎲 Daily tab | Done |
| **Word-game scoreboard**: paste Wordle / Connections / Strands / Mini share text | 🎲 Daily tab | Done |
| **Not Safe For Honey (NSFH) filter**: tap 🍯 before posting, or ⋯ → "Honey-proof this" later. Anyone marked "Honey" sees a sweet decoy message instead (memes become 🌸). Non-Honey members can turn on **👀 Honey Vision** in the Guide to preview what she sees. | 🍯 button in composers; ⋯ menus; ❓ Guide | Done |
| **Competitions / Awards**: monthly auto awards (Most Ws, Longest Streak, Grinder, Trivia Champ, Wordle Wizard, roasts…), secret-ballot votes (Quote / Meme / Roast / Biggest W of the Month, Most Dramatic), yearly awards, ⚔️ Old Heads vs Youngins showdown (Old Heads get a 25% bonus), 📚 Scholar League (scholars only), 💼 Workhorse League, sassy "congratulations" text, a ↩ take-back-my-vote option | 🏆 Awards tab | Built. **Not yet proven live:** the Village started 2026-11-11, so the first monthly results unlock **Dec 1, 2026** and the first yearly ones in December/January. |
| **Propose a new award**: three other members "second" it and it becomes official | 🏆 Awards tab | Done |
| **🫶 Secret love**: sends someone an anonymous "lowkey proud of you" (the sender is never stored) | Bottom corner | Done |
| Welcome tour (first visit) and full Village Guide | Automatic / ❓ button | Done |
| Profile: change face, color, "journey" line (e.g. "Pre-med @ Tulane"), change PIN | Face button, top right | Done |
| **Village Stats**: admin-only traffic (who opened which tab, last 30 days) | Admin's profile → 📊 Village Stats | Done |
| Install as a phone app ("Add to Home Screen") | Browser share menu | Works, but see Known Issues (iPhone keeps a separate login) |

Nothing in the Village is half-built or "planned" in the code. The only "coming soon" anywhere on the site is the homepage's "Next project" card.

### 2b. Joining, logging in, and invites (from a new person's side)

The Village doesn't use emails or passwords. It uses a shared **family code**, your **name**, and a **4-digit PIN**.

1. **First visit:** the page quietly creates an invisible "guest" login for that browser (a Supabase anonymous sign-in). You see a welcome screen.
2. **New member: "I'm new"**
   1. Type the family code (the admin shares it privately).
   2. Choose a display name, which must be unique in the Village.
   3. Choose a 4-digit PIN.
   4. Pick a face (emoji).

   That creates your member record and links this browser to you. The **very first person ever to join became the admin**.
3. **Returning member on a new phone or browser: "I've been here before"**: family code + name + PIN links that browser to your member.
4. **Invite link (the admin's alternative):**
   1. The admin creates a resident in the admin panel (name, face, statuses).
   2. The admin taps "invite link" and sends it. Links last 14 days, work once, and each person has only one live link at a time.
   3. Opening the link links that phone to that person with no code or PIN needed. They can set a PIN later from their house.

   If the phone already belongs to someone else, the page first asks "This will switch this phone to ___, OK?"
5. **Lockouts:**
   - 10 wrong family codes from one browser lock that browser out for 15 minutes.
   - 5 wrong PINs for one *name* lock **that member** out for 15 minutes, on every device.
6. **Forgot PIN:** the admin resets it.
7. **Clearing browser data or switching browsers** means logging in again with code + name + PIN.

### 2c. What admins can do that others can't

- See the **admin panel** in their profile:
  - give or remove statuses: 🍯 Honey, 🎓 Scholar, 🧓 Old Head, 👑 Admin (admins can't un-crown themselves)
  - **reset anyone's PIN**
  - **create a resident** and **make an invite link**
- **Delete anyone's** posts, comments, memes, quotes, reactions, chat messages, and scores (regular members can delete only their own).
- Delete proposed award categories.
- Open **📊 Village Stats** (traffic).
- See admin-only banners on the Village tab:
  - "Trivia vault running low/empty"
  - "New in the village: ___. Do they need a 🍯 / 🎓 / 🧓 status?" **This is currently showing for new member "pb".**
- Wear the 👑 face. Only Honey can wear 🍯; the database enforces both.

### 2d. Roles and permissions (the row-level security rules, in plain English)

- **Nobody who isn't a linked family member can read anything.** Being "a member" means "this browser's login is linked to a member". A random visitor gets a guest login but sees no data.
- **Members can see everyone's** profiles, Ws, comments, reactions, memes, quotes, chat, scores, and award categories.
- **You post only as yourself.** The database rejects a post that claims to come from someone else.
- **You delete only your own stuff**, unless you're the admin.
- **Profiles:** you can change only your own face, color, and journey line. Statuses (Honey/Scholar/Old Head/Admin) change only through the admin's tools.
- **Trivia:** you see only today's and past questions (plus any you wrote). The correct answers sit in a hidden area the website can't read. You see others' answers only after answering yourself, or once the day is over.
- **Votes are secret:** you can only ever see your own ballot. Totals unlock only after the month or year ends.
- **🫶 Secret love:** you see only love sent *to you*, and the sender isn't recorded at all.
- **Village Stats** (page visits): no one can read the table directly. Only the admin's stats function can.
- **PINs, the family code, and invite tokens** are stored only as scrambled hashes, in a private area the website can't reach.

---

## 3. Supabase

### 3a. Tables (all in the one project)

**Family Village** (from `village/setup/01`–`09`):

| Table | Stores | Main columns |
|---|---|---|
| `members` | One row per family member | display name, face, color, is_honey, is_scholar, is_elder (Old Head), is_admin, journey line, joined date |
| `member_devices` | Which browser login belongs to which member | browser login id → member |
| `wins` | Ws and check-ins | member, kind (win/checkin), text, minutes, hours type (study/work), NSFH flag, time |
| `comments` | Roasts under a W | W, member, text and/or meme, NSFH flag |
| `win_emojis` | Quick reactions on Ws | W, member, emoji |
| `reaction_images` | Meme Vault entries | member, caption, file path in storage, NSFH flag |
| `quotes` | Quotes Wall | quote, said by (name and/or member), context, date, submitted by, NSFH flag |
| `kitchen_messages` | Group chat | member, text and/or meme, NSFH flag |
| `game_scores` | Wordle/Connections/Strands/Mini | member, game, puzzle number, score, pasted text, date |
| `secret_love` | Anonymous 🫶s | recipient, seen? (no sender column) |
| `trivia_questions` | Trivia pool | question, choices, category (science/family/general), author, play date |
| `trivia_answers` | Who answered what | question, member, choice, correct? |
| `award_categories` | Awards (built-in and proposed) | name, emoji, auto/vote, month/year, metric, nominee type, league, approved? |
| `category_seconds` | "Seconds" on proposed awards | category, member |
| `award_votes` | Secret ballots | category, period (e.g. 2026-11), voter, nominee |
| `page_events` | Village Stats traffic | member, tab, time |

Hidden ("private") tables the website can't touch directly:
- `member_pins` (hashed PINs plus lockout counters)
- `family_secret` (hashed family code)
- `invites` (hashed invite tokens, expiry, used?)
- `trivia_keys` (correct answers)
- `code_attempts` (wrong-family-code counter)
- `pot_invites` and `pot_join_attempts` (for the Pot)

**Game saves:**

| Table | Stores | Notes |
|---|---|---|
| `game_saves` | One saved game per (player, game) | Player = a Village member, or a Pot email login (for the Dungeon). Allowed games: medquest, dungeon, nola, luke, freak, underworld, feast, kyla, ashley. No direct access; only the `game_save_get` / `game_save_put` functions, which save only if the incoming copy is newer. |
| `key_saves` | Sunbeam Farm saves, keyed by a private "farm key" | Stores only a scrambled hash of the key. No direct access; only `key_save_get` / `key_save_put`, which work without any login. **Confirmed live** (the function answers). |

**The Pot** (from `pot/setup/01`–`03`). Every Pot table can be read or written only by members of the same household:

| Table | Stores |
|---|---|
| `pot_households` | The shared pot (name) |
| `pot_members` | The two people in it (login, display name, theme, emoji) |
| `pot_accounts` | Bank/credit accounts and balances (with "balance set on" date) |
| `pot_categories`, `pot_budgets` | Budget categories and monthly amounts |
| `pot_tx` | Transactions (with duplicate-import protection) |
| `pot_bills`, `pot_bill_paid` | Recurring bills and which months are paid |
| `pot_rules` | Auto-categorize rules |
| `pot_settings` | Household settings |
| `pot_events` | Calendar dates / deadlines |

### 3b. Storage buckets

- **One bucket: `reactions`** (Meme Vault photos).
  - **Upload:** Village members only. JPEG/PNG/WebP/GIF only, 2 MB max; the page shrinks photos first. Files get random names.
  - **View:** the bucket is set to **public**, so anyone holding a photo's exact web address can open it, even without logging in. In practice the addresses are random and only appear inside the Village. (This is listed under Known Issues as an optional privacy upgrade.)
  - **Delete:** the person who posted it (from any of their devices) or the admin.

### 3c. Auth settings (read from the live project's public settings)

| Setting | Value | Used by |
|---|---|---|
| Anonymous ("guest") sign-ins | **On** | The Village, which gives every browser an invisible login, then links it to a member |
| Email + password | **On** | The Pot (and the Dungeon via the Pot login) |
| New sign-ups allowed | **Yes** (open) | Anyone could create an email login, but it grants nothing without a Pot invite code |
| Email confirmation required | **Yes** (new email accounts must click a link) | The Pot |
| Magic link / phone / Google / Apple / other social logins | Not used (phone and all social providers are off) | n/a |
| Password reset by email | Used by the Pot's "Forgot password" | The Pot |
| Redirect URLs (per `pot/SETUP.md`) | `/pot/` and `/dungeon/` | Where confirmation and reset emails return |

The Pot also connects to **Google Calendar** from the browser, using Google's own sign-in popup and a Google client ID typed into Pot settings. That isn't part of Supabase.

### 3d. Edge functions, triggers, scheduled jobs

- **Edge functions: none.**
- **Scheduled jobs: none.** Nothing runs on a timer. The day's trivia question is picked the first time anyone opens Daily that day (Chicago time). Award standings and results are calculated when someone opens the Awards tab.
- **Database functions (RPCs):** all the logic for join/login/invite/PIN, trivia, awards tally, stats, 🫶, Honey-proofing, game saves, and Pot create/join. Most refuse to run for non-members.
- **Triggers:**
  - `members_reserved_faces`: only admins can wear 👑 and only Honey can wear 🍯.
  - `*_drop_votes` on quotes, memes, comments, and Ws: deleting an item removes open-period votes for it, so a deleted item can't win.

### 3e. SQL setup steps (`village/setup/`, `pot/setup/`)

These are run by hand in the Supabase SQL Editor, in number order. 01–10 and Pot 01–03 were run and verified earlier, and 14 is confirmed live.

- **11** is redundant (10 already covered it).
- **12** (`kyla`) and **13** (`ashley`) only widen the list of allowed games. Whether 12 was run couldn't be checked from outside the dashboard, so see Known Issues. 13 no longer matters, because Sunbeam Farm now saves through 14 instead.

---

## 4. Other projects: how each one saves

All games keep a copy in the browser (localStorage). "Cloud" means they *also* save to Supabase when possible.

| Project | Saves to | Details |
|---|---|---|
| MedQuest, Magnolia Isle, Operation: Open Field, Little Freak, The Moveable Feast, Gremlin Town, The Underworld Apothecary | Browser **+** Village account | If the same browser is logged in to the Village, the game saves to that member's account and loads on any device where they're logged in. Not logged in = browser only. On a device's first link the bigger save wins; after that the newest save wins. A backup-code / file export exists in settings. |
| Med School Dungeon | Browser **+** Pot login (or Village) | Saves to PB's Pot email login, and its 💰 Loot Ledger tab reads Pot data. |
| Sunbeam Farm (`/ashley/`) | Browser **+** private farm key | Ashley isn't on the Village. The game makes a random 28-character "farm key". Pasting it on a new phone brings the farm back. **If the key is lost, the cloud copy can't be found.** |
| The Underworld Apothecary | Browser + Village account, plus a **private pack** | The public code holds only generic placeholders. Bailey's real budget numbers, rites, and letter live in a "private pack" stored inside *her* save, never in the repo. Anyone else opening the page sees an empty, generic version. |
| The Pot | Supabase only (the `pot_*` tables) | Email/password login. One person creates the pot and gets a one-time invite code; the second person joins with it. Code guessing is rate-limited per login. |
| Homepage, guides | Nothing | Static pages |

**Installable home-screen apps** (branch `feat/home-screen-apps`): every app folder has its own `manifest.webmanifest` (Village keeps its original `manifest.json`, `start_url`/`scope` `./`, no `id`, so existing installs don't duplicate) and its own icons. Scopes never overlap; the homepage has no manifest. No service worker.
On iPhone an installed app has **its own storage, apart from Safari**, so the games' Village login and device-only saves don't carry over. Each game's settings has **☁ Cloud save: log in or out** (family code + name + PIN, the same `login_village` RPC the Village uses), and it opens by itself the first time an installed app runs without a login. Logging out there logs that browser/app out of the Village too, and the button says so. The Dungeon also offers its Pot login there; Sunbeam Farm's onboarding points installed-app users to "I already have a farm key".
**Save conflicts** (`shared/cloudsave.js`): a device with nothing played (updatedAt 0) always loads the cloud save and never pushes an empty game. The first time a device links to an account (or a different account than before) and both sides have different progress, the player picks which to keep; the other copy stays on the device as `<key>_before_sync` / `<key>_cloud_before_sync`. After that the newest save wins, and the database refuses older saves.

---

## 5. Known issues and fragile spots

**Things waiting on Bailey:**
1. **"pb" needs a status.** The admin banner in the Village asks whether new member "pb" should get 🍯 / 🎓 / 🧓. One tap clears it.
2. **Gremlin Town cloud saves may not be enabled in Supabase.** If they aren't, Kyla's game still saves in her browser but silently fails to back up to her Village account. Run **step 13**, `village/setup/13_ashley_saves.sql` (not step 12): its allowed-games list includes both `kyla` and `ashley`. Step 12's list has no `ashley`, so running 12 after 13 would quietly turn off Ashley's account saves. Step 13 is safe to re-run.
3. **A stray empty "feast" save sits on Bailey's own Village account**, created while testing. It's harmless and doesn't touch Gage's save.

**Optional privacy upgrades (decided "not yet"):**
4. Meme photos are publicly viewable by exact link (bucket is public).
5. Email sign-ups are open to anyone (grants no access, but anyone can create an account in the project).
6. The Honey filter is a courtesy filter, not a lock. Honey's own account hides tagged posts, but it relies on people remembering to tap 🍯.
7. An old commit in the git history mentions a personal detail. The owner chose to leave it.

**Fragile or untested:**
8. **Awards results haven't fired for real yet.** The first monthly results unlock Dec 1, 2026, and yearly ones after December. Trophy counts on houses depend on this.
9. **iPhone "Add to Home Screen" keeps its own separate storage.** People who install the Village or a game as an icon must log in again *inside* the icon, and a game icon won't see a Village login made in Safari. The send-out advice is "bookmark in your normal browser".
10. **Clearing browser data / Safari's 7-day cleanup** wipes the guest login. Members then need code + name + PIN again. Games not linked to the Village lose their browser-only progress unless the player saved a backup code.
11. **PIN lockout hits the member, not the device.** Five wrong PINs for a name lock that real person out for 15 minutes everywhere.
12. **Kitchen chat polls every 6 seconds**, so it isn't instant, and it only refreshes while the tab is open and visible.
13. **"Newest save wins."** Playing the same game on two devices at once, or playing a game while logged in as someone else, can overwrite progress.
14. **Unlisted is not private.** `/little-freak/`, `/underworld/`, and `/pot/` aren't on the homepage and aren't indexed, but anyone with the link can open them. They show nothing personal without a login or private pack.
15. The Pot's Google Calendar connection needs a Google client ID and an allowed-origin setup on Google's side. It's easy to misconfigure.

---

## 6. What to test, and what NOT to do

### ⚠️ Do NOT (these show up for real family members or touch real data)

- **Don't join the Village with the family code under a new name.** That creates a real resident everyone sees on the Street, and it triggers the admin's "new in the village" banner. If you need an inside view, ask Bailey to create a **"Tester"** resident and send you an invite link, and have it removed afterward. (Removing a member is done in the Supabase dashboard, and it deletes everything they posted.)
- **Don't log in as a real family member**, and don't guess names or PINs. Five wrong PINs lock that real person out for 15 minutes.
- **Don't open anyone's real invite link.** Links work once; opening one uses it up and moves your browser to that person.
- Inside the Village, even as a Tester, **every one of these is visible to the whole family**:
  - posting Ws, comments, reactions, quotes, Kitchen messages, or memes
  - sending 🫶
  - adding trivia questions (they'll be served to the family later)
  - proposing or seconding awards, and voting

  Keep tests to one clearly labeled post, and delete it right after.
- **Don't answer today's trivia as a real member.** Each person gets one answer per day.
- **Don't open games while your browser is logged in to the Village as a real member** (or the Pot as PB/Bailey). The game will load and save over that person's cloud save. **Test games in a private/incognito window**, where saves stay in that window only.
- **The Pot holds real household finances.** Don't sign in with real credentials. Don't record transactions, mark bills paid, edit balances, or connect/add to Google Calendar. You can create your own throwaway email login to see the empty "create a pot" screens. That makes an account in the real project, so tell Bailey so it can be deleted.
- **Don't paste anyone's real farm key** into Sunbeam Farm, or load anything into the Underworld's "Private pack" box.
- Expect that just *visiting* adds to GoatCounter visitor counts. Visiting Village tabs as a Tester also shows up in the admin's Village Stats.

### ✅ Most worth testing (as a real visitor would)

1. **Homepage → every card** on a phone (iPhone Safari especially) and on desktop: links work, text fits, nothing scrolls sideways.
2. **First-time Village visit** (no login): does the welcome screen make sense? Try a **wrong** family code once to see the error message, but stop well short of 10.
3. **Invite-link flow** with a Tester invite from Bailey: open on a fresh phone → tour → profile → set a PIN → log out → log back in with code + name + PIN on a second browser.
4. **Each game, fresh, in a private window**:
   - Does the first screen explain what to do?
   - Does progress survive a reload?
   - Does the backup-code export and import work?
   - Does the "Game guide" button open the right guide?
5. **Each guide page** (`/…/guide.html`): readable on a phone, matches what the game actually shows.
6. **Sunbeam Farm farm key**: start a farm in a private window, copy the key, open another private window, paste the key, and confirm the farm comes back.
7. **The Underworld without a pack**: it should look generic, with no personal names or numbers anywhere.
8. **The Moveable Feast** (sent to Gage soon): the onboarding/hand-holding flow, the timer, and the "add to Google Calendar" links.
9. **Add to Home Screen** on iPhone for one game: confirm the "log in again inside the icon" behavior matches what family members were told.
10. **Accessibility basics**: tap-target size, contrast, font size on small phones, and screen-reader labels on the bottom tabs.

---

## 7. Recent history (from the git log)

| Date | What happened |
|---|---|
| 2026-11-11 | Repo created; early game files uploaded (MedQuest, Dungeon, Magnolia Isle, Open Field). **The Family Village built.** |
| 2026-11-12 | Village Stats, invite links, statuses (Old Head), Scholar/Workhorse leagues, welcome tour, Village Guide, Honey Vision, sassy award text, GoatCounter; trivia auto-recycle; "Big Brain" award. **The Pot + Dungeon's Loot Ledger** added. First QA fixes (PRs #1–#2): Honey filter reset, double-tap posts, Pot balances, duplicate imports, bill matching. Games start saving to family accounts. **Unmarketable Little Freak** for Mom (PR #3). |
| 2026-11-13 (morning) | More QA (PRs #4–#6): Pot undo, two-sided transfers, votes for deleted items, take-back-vote, invite-switch warning, "don't overwrite a newer save", noindex on private pages. **Player guides for every game** (PR #7). |
| 2026-11-13 (midday) | **The Underworld Apothecary** goes on the site with the private-pack design (PR #9). **The Moveable Feast** for Gage, rebuilt on the Underworld engine (PR #8), plus its guide (PR #10). |
| 2026-11-13 (afternoon) | **Gremlin Town** for Kyla (PR #11), five review bug fixes (PR #12), guide (PR #13). |
| 2026-11-13 (evening) | **Sunbeam Farm** for Ashley (PR #14), then switched to a private farm key instead of a Village login (PR #15, latest). |

All 15 pull requests are merged, and none are open.

---

## 8. The Underworld Apothecary revamp (merged to main and pushed 2026-11-16)

Built on two branches, both merged into `main` on 2026-11-16:

- `feat/underworld-revamp` (off `main`): new look, five rooms, fixes, Hades art, personal details moved out.
- `feat/underworld-couple-art` (off the branch above): Bailey and PB art, wardrobe removed, room repainted.

The tag `pre-underworld-revamp` marks `main` just before the merge, as a rollback point. Bailey approved the new app icon before it went live.

### 8a. What changed for the player

- **Look:** near-black, burgundy, antique gold, bone and plum (taken from Bailey's own character sheets). Cormorant Garamond headings, Spectral body text.
- **Five rooms** in a bottom bar (a bar under the header on wide screens): **Tonight · Path · Garden · Treasury · Altar**. All Quiet and the Hearth week open from Tonight; the War Chest opens from the Treasury; the Olympian Games open from the Altar. Old `#hash` links still work.
- **Tonight:** the study scene, Hades and his line in a bone speech bubble, one "next torch" card, two quick-log buttons, eight one-tap Hearth toggles, the unchanged "🌙 Hard day? Call Hecate" button, and All Quiet as a row of candles.
- **Pictures first, figures on tap:** the Treasury shows a pomegranate (runway), candles (bills) and a bar (spending); tapping any of them shows the numbers. Tables became cards.
- **Art:** Hades, Bailey and PB are painted cut-outs from Bailey's own images (made by her with ChatGPT). Hecate, Quincy and Fortuna are still code-drawn; Bailey plans art sheets for them.
- **Hades's lines are word for word.** His small portrait changes with the mood of the line (`HADES_MOOD` maps each bank of lines to an expression file).

### 8b. Files

- `underworld/index.html`: still one plain HTML/CSS/JS file, no build step.
- `underworld/art/`: 27 transparent WebP files (about 650 KB): `hades-*`, `bailey-*`, `pb-*` (full, companion, closeup, small, and expressions named by mood) and `couch-us.webp`. They were cut from her sheets locally with rembg; nothing was recoloured, redrawn or upscaled. The sheets are only 1312 px wide, so the crops are small: don't show them much larger than they are now.
- `bailey-full` and `pb-full` have straight cut edges (the two figures overlap on the sheet). **They are not used anywhere yet.** Use them only where that edge is hidden or cropped; Bailey will make separate full-body images.
- `underworld/manifest.webmanifest`: new colours and three `shortcuts` (`?do=spend`, `?do=hours`, `?do=hearth`). `id`, `scope` and `start_url` are unchanged.
- App icons (`icon-192`, `icon-512`, `icon-512-maskable`, `apple-touch-icon`) were regenerated from Hades's face. Bailey approved them.
- `.gitignore`: ignores `*backup*.json`, `*private-pack*.json` and `*private_pack*.json`. Never commit a backup or pack; this repo is public.

### 8c. Saves (nothing was renamed, no migration, no SQL)

- The save key is still `underworld_apothecary_v1` and the cloud game name is still `underworld`. `shared/cloudsave.js` was not touched.
- The save shape is unchanged. `outfit` and `pbCap` are still in it but unused (the wardrobe and PB's cap went away with the old chibis). If Bailey makes a white-coat sheet, it comes back as a one-time art swap.
- **New extra key on the device only:** `underworld_apothecary_v1_before_change` holds a copy of the game from just before the last Restore or Reset. Settings offers to bring it back.
- **Restore and Reset now ask first.** Reset keeps the private pack.
- **A must-pay bill with a $0 budget is not counted as unpaid** (`dueMusts()`).
- **MedQuest is read, never written.** The Path reads `medquest_bailey_v1` from the same browser's storage; a rite finished there counts as finished here. It does not read MedQuest's cloud save, so progress made on another device won't show. Bailey has accepted this for now.

### 8d. Personal details and the private pack

The public file no longer contains the advisor's name, email or links, school and town names, work history, Bailey's surname, the dated key-dates list, or three Hades lines that name people or places. Semester years inside quest text are still public (Bailey agreed).

- Generic wording lives in the public file. `applyPack()` lays the pack's wording over it: `quests`, `chapters`, `codex`, `keyDates`, `warQuests`, `strings` (read with `pk(key, fallback)`), `autoRules` and `lines`.
- Bailey's original wording is in a **pack add-on** file (`kind: "underworld-pack-addon"`), kept outside the repo. Loading it under Settings → Private pack **merges** it into her existing pack; it then saves with her account.
- Until she loads the add-on on her live save, she sees the generic wording. Nothing is lost either way.
- Verified with her real backup: with the add-on loaded, every quest, chapter, key date, lexicon entry, battle-plan line and Hades line matched the pre-change game exactly.
- Git history still contains the old text. Bailey chose to leave it.
- **MedQuest (`/medquest/`) still has the same details in public.** A separate plan for that is pending Bailey's go-ahead.

### 8e. Not connected, on purpose

- **The Pot:** the Apothecary and The Pot share no data. The Pot only has an "apothecary" colour theme. Bailey said to leave it that way.
- **No service worker** (she doesn't want updates stuck behind a cache) and no "share as a W" to the Village.

### 8f. Tested and not tested

- Tested in a local copy with her real backup: loads with every field identical; Android-style Back; a new day; $0 bills; restore, reset and undo; MedQuest read; phone width (375 px) and desktop (1280 px); no console errors.
- **Not tested:** saving while logged in to the Village (no one should log in as Bailey to test), and a real Android phone or an installed home-screen app.

### 8g. Do / don't for the next person

- Don't redraw Hades, Bailey or PB in code, and don't recolour or upscale the art. New looks come from new sheets Bailey makes.
- Don't change Hades's lines. Don't change the Hecate button's wording or what it opens. Quincy stays as he is until Bailey supplies art.
- Keep numbers one layer down: pictures first, figures on tap.
- Any personal wording belongs in the pack, not the public file.

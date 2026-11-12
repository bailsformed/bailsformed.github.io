# The Pot: setup checklist

One thing at a time. Each step says how long it takes. You can stop between any two parts.

---

## Part 1: Put the files on the site (5 min)

- [ ] In GitHub Desktop, open your site repo, then **Repository → Show in Finder**.
- [ ] From the zip, drag in:
  - the whole **`pot`** folder (next to `village`, `dungeon` and the others)
  - **`dungeon/index.html`**: replace the old one (this adds PB's 💰 Loot Ledger tab; his saved progress is untouched)
- [ ] Back in GitHub Desktop: write a summary like "Add The Pot", click **Commit to main**, then **Push origin**.

> Made changes to the dungeon game on your Mac that you haven't pushed yet? Push those first, then replace the file.

## Part 2: Create the Pot's tables in Supabase (3 min)

- [ ] Open your Supabase project (the same one as the village) → **SQL Editor** → **New query**.
- [ ] Open `pot/setup/01_pot.sql`, copy everything, paste, click **Run**. You should see "Success. No rows returned."

This only adds new `pot_` tables. It doesn't touch anything in the village.

## Part 3: Two Supabase settings (2 min)

- [ ] **Authentication → Sign In / Providers → Email**: make sure it's **enabled**.
- [ ] **Authentication → URL Configuration → Redirect URLs**: add both of these:
  - `https://bailsformed.github.io/pot/`
  - `https://bailsformed.github.io/dungeon/`

  (These are where confirmation and password-reset emails send you back to.)

## Part 4: Bailey starts the pot (10 min)

- [ ] Go to **bailsformed.github.io/pot/** → **First time? Create login** → use your email and a real password.
- [ ] Click the confirmation link in your email, come back, and **Sign in**.
- [ ] Name: Bailey · Game: The Underworld Apothecary · **Start our pot**.
- [ ] **Write down the invite code** (it's shown once).
- [ ] Enter your accounts with today's balances (for credit cards, type what you owe).
- [ ] Your budget is pre-filled from your New Paltz plan. Adjust it, then **Next**.
- [ ] Your bills are pre-filled. Untick anything wrong, fix the due days, then **Finish**.

## Part 5: PB joins (5 min)

- [ ] PB opens his dungeon game → **💰 Loot Ledger** → **Sign in** → **Create login** (his own email).
- [ ] Name: PB · Game: Med School Dungeon · **Join with a code** → the invite code.
- [ ] He enters his balances and his budget, plus any bills that are his.

Done: the dashboard now shows both of you.

## Part 6: Google Calendar two-way sync (20 min, one time)

You'll make a free "Google Cloud project" so Google lets this page read and add events to your joint calendar.

1. [ ] Go to **console.cloud.google.com** (sign in with your Google account) → project picker at the top → **New project** → name it `The Pot` → **Create**, then select it.
2. [ ] Search the top bar for **Google Calendar API** → **Enable**.
3. [ ] Search **Google Auth Platform** (or "OAuth consent screen") → **Get started**:
   - App name: `The Pot` · support email: yours → **Next**
   - Audience: **External** → **Next** → your contact email → agree → **Create**
4. [ ] **Audience** → **Test users** → **Add users** → your Gmail **and PB's Gmail** → Save.
5. [ ] **Data Access** → **Add or remove scopes** → find and tick:
   - `.../auth/calendar.events`
   - `.../auth/calendar.calendarlist.readonly`

   → **Update** → **Save**.
6. [ ] **Clients** → **Create client** → Application type **Web application** → name `The Pot` →
   **Authorized JavaScript origins** → **Add URI** → `https://bailsformed.github.io` (no slash at the end) → **Create**.
7. [ ] Copy the **Client ID** (ends in `.apps.googleusercontent.com`).
8. [ ] On the Pot: **Connect Google Calendar** → paste → **Save & connect** → sign in → pick your **joint calendar**.

When Google says **"Google hasn't verified this app"**, that's normal for a private app: click **Continue**. It's your own app and only the two test users can use it.

The connection lasts about an hour at a time. After that, tap **Connect** again (no re-setup).

## Part 7: Habits that keep it safe

- **Weekly:** ⚙ Settings → **Full backup**. Supabase's free plan has no automatic backups, so this file is your safety net.
- **Use it at least once a week.** Free Supabase projects pause after a week of no activity. If that happens, open Supabase and click **Resume project**. Your data is kept.
- **Monthly:** import each account's CSV. Duplicates are skipped, so overlapping dates are fine.

## Spring 2027: class dates

When you get your syllabuses, send the PDFs to Claude and ask for a **"Pot class-dates file."** Upload it with **📚 Import class dates**. Every exam and due date lands on the calendar, in Google, and on the accountability board.

Format, for reference:
```json
[{"date":"2027-02-10","title":"Exam 1","course":"BIO 201","kind":"exam","who":"Bailey","start":"10:00","end":"11:15","notes":"Ch 1-4"}]
```
`kind` is one of: exam, quiz, assignment, lab, reading, class, deadline, money, life, other. `who`: Bailey, PB, or both.

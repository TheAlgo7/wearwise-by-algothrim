# For User To Do — WearWise Manual Steps

These steps must be done by you. I (Claude) cannot do them because they require your accounts / passwords / emails / personal credentials. Each step tells you exactly what to click and where to paste the result.

---

## 1. Supabase — create project (5 min)

1. Go to **https://supabase.com** → Sign in with GitHub.
2. Click **New Project**.
   - Name: `wearwise`
   - Database password: generate + save to your password manager
   - Region: closest to you (e.g. `Mumbai (ap-south-1)` for India)
   - Plan: **Free**
3. Wait ~2 min for provisioning.
4. In the project, go to **Project Settings → API**. Copy these three values:
   - `Project URL` → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`  ⚠️ never commit this.
5. Go to **SQL Editor → New query**. Open the file `supabase/schema.sql` in this project, paste it, and click **Run**. This creates every table, enum, and the `items` storage bucket.
6. (Optional) Run `supabase/seed.sql` the same way to pre-load the default categories + modes + a blank style profile.

---

## 2. OpenWeather — get free API key (2 min)

1. Go to **https://openweathermap.org/api** → **Sign Up** (free).
2. After login, go to **API keys** tab.
3. Copy the default key → paste into `.env.local` as `OPENWEATHER_API_KEY`.
4. Note: new keys take 10–60 min to activate. Plan for a short wait on first weather call.

---

## 3. Google Gemini — get API key (2 min)

1. Go to **https://aistudio.google.com/apikey**.
2. Sign in with Google.
3. Click **Create API Key** → pick any project (or create one).
4. Copy the key → paste into `.env.local` as `GEMINI_API_KEY`.
5. Free tier includes Gemini 2.5 Flash + Gemini 2.5 Flash Image (this is the "Nano Banana 2" model for background removal). Rate limits are generous for personal use.

---

## 4. Fill `.env.local`

Copy `.env.local.example` → `.env.local` and paste the five values:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENWEATHER_API_KEY=...
GEMINI_API_KEY=...
```

Then run `npm install && npm run dev` and open **http://localhost:3000**.

---

## 5. First-run setup inside the app (5 min)

1. Open **Profile** tab → fill **Style Blueprint**: height, weight, body type, preferred fits (e.g. `oversized`, `regular`, `bootcut`), palette (e.g. black/white/cream/olive), signature combos, things you never wear together.
2. Open **Wardrobe → Add Item** → use your phone camera → take a photo of a clothing item against any background → confirm the AI-cleaned image and tags → save. Repeat for ~15–30 items so the generator has enough variety.

---

## 6. Vercel deployment (I'll do most of this; you do one thing)

I will:
- Create the GitHub repo `wearwise-by-algothrim` under your `TheAlgo7` account.
- Push the initial commit.
- Set up the Vercel project via CLI and link it.

**You do this one thing afterward:**
- Go to **https://vercel.com → Your project → Settings → Environment Variables**.
- Add the same five env vars from your `.env.local` (Production + Preview + Development).
- Click **Redeploy** on the latest deployment.

Done. Live at `https://wearwise-by-algothrim.vercel.app` (or your chosen domain).

---

## 7. PWA install on Samsung Galaxy S24 Ultra

1. Open the deployed URL in **Chrome** or **Samsung Internet**.
2. Tap menu (⋮) → **Install app** / **Add to Home screen**.
3. WearWise now has its own icon on your home screen with full-screen mode, splash, and offline cache. Open it like any native app.

---

## 8. Later / optional

- **Custom domain**: Vercel → Domains → add `wearwise.algothrim.com` (or similar). Point DNS CNAME at `cname.vercel-dns.com`.
- **Supabase RLS**: V1 runs with permissive policies (single-user). When you're ready to share this with anyone, I'll add proper row-level-security and auth.
- **Icons**: master `icon.svg` is in `public/icons/`. Swap it for your own design whenever you want — all derived sizes regenerate from it.
- **Backups**: Supabase free tier does daily backups automatically. Fine for personal use.

# WearWise — Setup Guide

There is only **one thing** left to do before the app works fully.
Everything else (code, API keys, hosting) is already done.

---

## The One Thing: Set Up Your Database

The app is live at **https://wearwise-algothrim.vercel.app** but it has no database tables yet.
You need to create them once. Takes about 3 minutes.

---

### Step 1 — Open the Supabase SQL Editor

Click this link → **https://supabase.com/dashboard/project/mymduybnngsatxxbzzet/sql/new**

It will open a blank SQL editor that looks like a text box.

---

### Step 2 — Run the Schema (creates all tables)

1. Open the file `supabase/schema.sql` in this folder on your computer
   - It's at: `C:\Users\Gaurav\Desktop\WearWise App\supabase\schema.sql`
   - Open it with Notepad, VS Code, or any text editor
2. Press **Ctrl+A** to select all the text
3. Press **Ctrl+C** to copy it
4. Go back to the Supabase SQL editor tab in your browser
5. Click inside the text box and press **Ctrl+A** then **Ctrl+V** to paste
6. Click the green **Run** button (bottom right)
7. Wait for it to say **"Success. No rows returned"** at the bottom

---

### Step 3 — Run the Seed (fills in categories & modes)

1. Open the file `supabase/seed.sql` in this folder on your computer
   - It's at: `C:\Users\Gaurav\Desktop\WearWise App\supabase\seed.sql`
2. Press **Ctrl+A** → **Ctrl+C** to copy all of it
3. Go back to the Supabase SQL editor
4. Click the **+** button at the top to open a **new** SQL tab (don't overwrite the last one)
5. Click inside the new text box and press **Ctrl+A** then **Ctrl+V** to paste
6. Click the green **Run** button
7. Wait for **"Success"**

---

### Step 4 — Check it worked

Click this link → **https://supabase.com/dashboard/project/mymduybnngsatxxbzzet/editor**

You should see these tables listed on the left side:
- `categories`
- `items`
- `outfits`
- `style_profile`
- `modes`

If you see them — you're done. The app is fully working.

---

## Open the App

Go to → **https://wearwise-algothrim.vercel.app**

On your Samsung Galaxy S24 Ultra, open that URL in **Samsung Internet** or **Chrome**, then:

1. Tap the **three-dot menu** (top right)
2. Tap **"Add to Home screen"** or **"Install app"**
3. Tap **Add**

WearWise will appear on your home screen like a real app, full screen, no browser bar.

---

## That's It

The app is set up. Start by going to **Wardrobe → Add Item** to photograph your clothes.
The AI will tag each item automatically. Once you have clothes in, tap **Today** to generate outfits.

---

*App is hosted at: https://wearwise-algothrim.vercel.app*
*Database is at: https://supabase.com/dashboard/project/mymduybnngsatxxbzzet*

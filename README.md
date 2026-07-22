# Practice Log — setup

Fifteen minutes of code a day. Correctness is graded by actually running your code, not by opinion.

## Put it online (one time, ~10 minutes)

You need a GitHub account. Everything below is free.

1. Go to **github.com/new**
   - Repository name: `practice-log`
   - Visibility: **Public** (GitHub Pages needs this on the free tier)
   - Do **not** check "Add a README"
   - Create repository

2. On the empty repo page, click **uploading an existing file**

3. Drag in all seven files from this folder:
   ```
   index.html
   sw.js
   manifest.webmanifest
   icon-192.png
   icon-512.png
   icon-maskable-512.png
   apple-touch-icon.png
   ```
   Then **Commit changes**.

4. **Settings** → **Pages** (left sidebar)
   - Source: **Deploy from a branch**
   - Branch: `main`, folder: `/ (root)`
   - Save

5. Wait about a minute, then reload the Pages settings screen. Your URL appears at the top:
   ```
   https://YOUR-USERNAME.github.io/practice-log/
   ```

## Install it on your phone

Open that URL on your phone **over wifi**, then:

- **iPhone (Safari only — not Chrome):** Share button → **Add to Home Screen** → Add
- **Android (Chrome):** menu (⋮) → **Install app**

You now have an icon that opens full-screen with no browser chrome.

## Make Python work with no signal

This part matters and is easy to skip.

1. Open the installed app while still on wifi
2. Scroll to the bottom
3. Tap **Cache Python for offline (~12 MB)**
4. Wait for "Python runtime cached"

Do this once. The service worker keeps those files permanently, so Python drills run underground.

JavaScript never needed this — it runs in the browser engine itself, always.

## What runs where

| Language | Correctness graded by | Works with no signal |
|---|---|---|
| JavaScript | Executing your code | Always |
| Python | Executing your code | After you cache the runtime |
| R | Static checks only | Yes |
| Mermaid | Syntax validation | Yes |

## Changing it later

Everything is in `index.html`. Two things worth editing:

- **`BANK`** — the exercises. Each entry is `{c: concept, t: title, b: brief, o: exact expected output, h: [three hints]}`. Set `o` to `null` if there's no exact output to check.
- **`LADDER`** — the concept order per language. The app always serves you the first concept you haven't cleared.

To update the live app, upload the changed file to GitHub again. The service worker is network-first on the app itself, so you'll get the new version on your next launch with signal.

## Your data

Progress lives in `localStorage` on that device only. It is not synced anywhere and nobody else can see it. **Export progress** at the bottom saves a JSON backup — worth doing occasionally, since clearing your browser data wipes it.

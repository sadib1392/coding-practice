# Practice Log — setup

Fifteen minutes of code a day. Correctness is graded by actually running your code, not by opinion.

## Put it online

The files already live in this repo (`sadib1392/coding-practice`), so all that's
left is to switch GitHub Pages on. The live URL will be:

```
https://sadib1392.github.io/coding-practice/
```

Pick **one** of the two ways below — they're mutually exclusive, so don't do both.

### Option A — automatic (recommended)

A workflow at `.github/workflows/deploy-pages.yml` builds and publishes the site
on every push to `main`, and turns Pages on the first time it runs. To use it,
get that workflow onto `main` (merge the branch it's on). Then:

1. Open the **Actions** tab and watch the **Deploy to GitHub Pages** run finish (~1 min).
2. The live URL is printed on that run, and appears under **Settings → Pages**.

After this, every future change you push to `main` redeploys the app on its own —
you never touch settings again.

### Option B — manual toggle (30 seconds, no merge)

The files are already on `main`, so you can just flip the switch:

1. **Settings → Pages** (left sidebar)
   - Source: **Deploy from a branch**
   - Branch: `main`, folder: `/ (root)`
   - Save
2. Wait about a minute, reload the Pages settings screen. Your URL appears at the top:
   ```
   https://sadib1392.github.io/coding-practice/
   ```

> If you use Option B and later want the auto-deploy from Option A, that's fine —
> just don't try to run both at the same time.

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

To update the live app, commit the changed file to `main` (Option A redeploys it
automatically; with Option B, the change is served as soon as it's on `main`). The
service worker is network-first on the app itself, so you'll get the new version on
your next launch with signal.

## Your data

Progress lives in `localStorage` on that device only. It is not synced anywhere and nobody else can see it. **Export progress** at the bottom saves a JSON backup — worth doing occasionally, since clearing your browser data wipes it.

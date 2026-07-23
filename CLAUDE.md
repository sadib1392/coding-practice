# Practice Log — project context

This file is the session handoff. It carries the full working context from the
remote Claude Code sessions that built this app, so any local session can pick
up exactly where they left off. Keep it updated when architecture or
constraints change.

## What this is

A self-contained coding-practice PWA for a beginner (the repo owner) practising
~15 minutes a day. Python is the priority language; JavaScript, R, and Mermaid
are secondary. Live at **https://sadib1392.github.io/coding-practice/**,
deployed automatically by `.github/workflows/deploy-pages.yml` on every push to
`main` (it also enables Pages itself — no manual settings step).

Three things distinguish it from a flashcard app:

1. **Correctness is decided by executing the code**, not by opinion. Python
   runs on Pyodide (WASM, CDN-loaded on demand), JavaScript runs in the browser
   engine. Output is diffed (via `norm()`) against an exact expected string.
2. **It works offline.** Service worker precaches the shell; a button caches
   the ~12 MB Pyodide runtime permanently.
3. **Teaching comes before drilling.** Concept lessons with readings and
   warm-up problems, plus a chapter-by-chapter book course.

Non-goals, deliberately: no accounts, no backend, no build step, no npm
runtime dependencies, no analytics, no sync.

## Files

```
index.html              the entire app: markup, CSS, JS, lessons, exercises
book/ch01.js            book chapter data (one file per chapter, plain script)
sw.js                   service worker: shell precache + Pyodide runtime cache
manifest.webmanifest    PWA manifest
icon-*.png, apple-touch-icon.png
tests/                  jsdom smoke suites + content verification harnesses
.github/workflows/deploy-pages.yml   auto-deploy to GitHub Pages
```

## Current state (as of 2026-07-23)

Everything below is merged to `main` and deployed:

- **Concept ladder practice** (original app): `LANGS` / `LADDER` / `BANK` /
  `LESSONS`, graded drills, streaks, ledger, offline queue for Python.
- **Lessons** for all 33 ladder concepts (12 py / 10 js / 6 r / 5 mermaid):
  intro `i`, syntax pairs `s`, gotchas `w`.
- **Extended Python lessons**: every Python concept also has `read`
  (multi-paragraph prose) and `practice` (3 predict-the-output problems each,
  36 total). JS/R/Mermaid don't have these yet — the shape is optional and
  backward compatible. **Extending read/practice to JS is a natural next task.**
- **Text highlighting**: select prose in lessons or book → floating Highlight
  button → saved as character-offset ranges in `S.highlights`, keyed per prose
  block; tap a highlight to remove. Survives reload.
- **Book course** (BOOK tab): chapter reader following the curriculum of
  *Automate the Boring Stuff with Python* (3rd ed.) by Al Sweigart, with
  **original lesson text** (see "Book content policy" below). Chapter 1
  (Python Basics) is complete: 7 sections, 10 reveal-answer questions, 4
  graded exercises. Chapter 2 (if-else and Flow Control) is complete: 8
  sections, 10 questions, 4 graded exercises, all mapped to the
  `conditionals` ladder concept. Per-section mark-as-read, progress meters,
  and a "pick up where you left off" card on the practice view.
- **3e chapter map differs from older editions** (verified against the live
  3e TOC): ch2 is booleans/comparisons/if-elif-else only; ch3 Loops, ch4
  Functions, ch5 Debugging, ch6 Lists, ch7 Dictionaries, ch8 Strings.
  Truthiness is NOT in 3e ch2, so the book chapter leaves it out (the app's
  `conditionals` lesson still covers it).
- **Chapters are NOT gated** — any chapter can be started at any time. The
  owner has been offered locked progression and hasn't asked for it.
- Nav is three tabs: PRACTICE / BOOK / LEDGER, plus language tabs.
- Service worker `SHELL` is at `shell-v5`.

## Architecture (index.html, one script block, in order)

| Section | Contents |
|---|---|
| `LANGS` | per-language metadata; `runs` is `"native"`, `"pyodide"`, or `false` |
| `LADDER` | ordered concept list per language |
| `BANK` | ladder exercises |
| `LESSONS` | lessons (`i`, `s`, `w`, and for Python `read`, `practice`) |
| book consts | `BOOK_META`, `BOOK_ORDER`, `bookChapters()` |
| storage | `S`, `persist()`, key `practicelog.offline.v1` |
| helpers | `el()`, `norm()`, `clone()` (JSON-based) |
| execution | `runPython`, `runJS`, `bootPython` |
| static checks | `lint`, `gradeIt` |
| actions | `teach`, `newTask`, `submit`, `logSession`, `drainQueue` |
| book actions | `openBook`, `markRead`, `startBookExercise`, `firstUnread`, `ensureBook` |
| PWA | SW registration, `cacheRuntime` |
| highlighting | `hlSpans`, `hlElK`/`hlEl`, `applyHighlight`, `wireHighlighting` |
| render | `render`, `renderBook`, `renderChapter`, `renderLesson`, `renderTask`, `renderRun`, `renderGrade`, `renderLedger` |

### State shape (`S`, single localStorage key)

```js
S = {
  lang, sessions[], streak{count,last},
  solid{lang:[concepts]}, shaky{...},
  queue[],                          // Python submissions awaiting a runtime
                                    // entries carry book:chId|null for credit
  highlights{ key: [[start,end],...] },  // key: "python|loops|r0" or "book|ch01|s2|b1"
  book{ last:{ch,sec}|null, read:{ch01:{0:true,...}}, ex:{ch01:["Exercise title",...]} }
}
```
`blank` defines defaults; a top-level backfill loop migrates old stored states.

### Book chapter data shape (`book/chNN.js`)

```js
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.chNN = {
  n, title, src,                       // src links to the original chapter
  blurb,
  sections: [ { t, body: [ ["p",text] | ["code",text] | ["note",text] ] } ],
  questions: [ { q, a } ],             // reveal-style self-checks
  exercises: [ { c, t, b, o, h:[3], book:"chNN" } ]  // BANK-shaped, graded
};
```
Exercise `c` maps to a `LADDER.python` concept so passing also advances the
ladder. `logSession` and `drainQueue` both credit `S.book.ex[chId]` on pass.

**To add a chapter**: create `book/chNN.js` (copy ch01's shape), add a
`<script src>` tag in index.html before the main script, append the id to
`BOOK_ORDER`, add the file to `APP_FILES` in sw.js, bump `SHELL`.

## Book content policy (important)

The remote build environment could not reach automatetheboringstuff.com
(network policy 403). Local sessions CAN reach it (checked 2026-07-23): the
3e pages state no Creative Commons license, so the situation is unchanged —
the 3e's terms are unknown and no text may be copied. The site remains
useful read-only for verifying the 3e's chapter/section structure.
**All chapter text is original prose written for this app**,
following the book's chapter-by-chapter curriculum, credited to Al Sweigart
and linked to each original chapter. If the owner wants verbatim book text
embedded, first verify the 3e license terms on the site (earlier editions were
CC BY-NC-SA), then swap the data files and note changes; ShareAlike/attribution
would apply. Until verified, keep writing original text.

## Hard constraints — do not violate

- **No build step.** No npm runtime deps, no bundler. App logic stays in
  index.html; book chapters are plain data script files (this is content, not
  a module split).
- **No `localStorage` writes outside `persist()`.** One key, one writer.
- **Bump `SHELL` in sw.js** whenever the app shell (index.html, book files,
  icons) changes, or users get stale caches.
- **Do not use `structuredClone`** (broke on the owner's browser). Use `clone()`.
- **Guard every browser API** — `matchMedia`, `scrollIntoView`, `localStorage`,
  `getSelection` have all failed somewhere. Feature-detect first.
- **Keep `color-scheme: light only` and the `prefers-color-scheme: dark`
  override block.** The owner's device force-inverted the page; this is the fix.
- Text contrast stays ≥ WCAG AA. The owner asked for lighter type once; it is
  already at the floor.
- **Every expected output must be captured by executing the code** — reference
  solutions for exercises, REPL results in readings, predict-the-output
  answers. Never write outputs from memory. `tests/ch1_verify.py` and
  `tests/practice_verify.py` show the pattern.
- Hints escalate: tier 1 nudges, tier 2 names the concept, tier 3 is
  pseudocode but **never the complete answer**.
- Lesson/book register: direct, no encouragement, no exclamation marks,
  gotchas phrased as the mistake the learner will actually make.

## Testing

No framework; jsdom harnesses in `tests/`. Setup: `npm install jsdom`
(gitignored). Run from repo root:

```bash
node tests/smoke.mjs    # core: renders, lesson shows, JS drill PASS 5/5, wrong answer MISMATCH
node tests/smoke2.mjs   # lessons: reading/practice sections, reveal toggle, highlight round-trip
node tests/smoke3.mjs   # book: reader, highlight, mark-read, resume, queue credit, ch02 (42 checks)
python3 tests/ch1_verify.py       # re-verify chapter 1 outputs
python3 tests/practice_verify.py  # re-verify lesson practice outputs
python3 tests/ch2_verify.py       # re-verify chapter 2 outputs (self-checking, exits 1 on drift)
```

All three smoke suites must pass before pushing. Always test the failing case
too — a grader that passes everything is worse than no grader. Note: jsdom
skips external `<script src>`; smoke3 evals `book/ch01.js` in `beforeParse` to
replicate real script order.

## Deploy

Push to `main` → workflow deploys to GitHub Pages automatically. The owner
works on mobile and merges PRs from the GitHub app; branch-then-PR has been
the pattern. iOS install: Safari only → Add to Home Screen; then "Cache
Python for offline" on wifi.

## Known limitations — do not "fix" silently

- R and Mermaid never execute; correctness capped at 3/5 (disclosed in
  footer). WebR (webr.r-wasm.org) is the highest-value technical addition.
- Pyodide cache is evictable (iOS ~7 weeks unused); the cache button
  reappearing is intended.
- Progress is device-local; "Export progress" is the backup.
- `runJS` uses `new Function` — acceptable only because the sole author of the
  code is the person running it. Never feed it code from any other source.
- JS runner waits a fixed 700 ms for async output; keep drill delays < 500 ms.

## Roadmap (owner's priorities)

1. **Book chapters 3+** (next: Chapter 3, Loops — while/for/range in the 3e),
   same shape as ch01/ch02, outputs verified by execution. This is the owner's
   main ongoing ask — they want the whole ATBS curriculum over time. Prefer
   ch2_verify.py's self-checking pattern for new verify scripts.
2. Extend `read`/`practice` lesson sections to JavaScript concepts.
3. More Python BANK drills (2-3 per concept; `while` loops and string
   formatting underrepresented).
4. WebR execution for R (same shape as `bootPython`).
5. Offered but not requested: locked chapter progression.

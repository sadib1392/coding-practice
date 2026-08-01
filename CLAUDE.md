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
   runs on Pyodide, R runs on WebR, JavaScript runs in the browser engine — all
   WASM/native, CDN-loaded on demand. Output is diffed (via `norm()`) against an
   exact expected string.
2. **It works offline.** Service worker precaches the shell; a button caches
   the ~12 MB Pyodide runtime permanently.
3. **Teaching comes before drilling.** Concept lessons with readings and
   warm-up problems, plus a chapter-by-chapter book course.
4. **Progress is gamified.** XP, levels, a daily goal, streaks, hearts, daily
   quests, badges, and a Duolingo-style chapter path. The rewards hang off real
   verified work — passing an exercise means the code ran and matched.

Non-goals, deliberately: no accounts, no backend, no build step, no npm
runtime dependencies, no analytics, no sync.

## Files

```
index.html              the entire app: markup, CSS, JS, lessons, exercises, game
book/ch01.js …ch24.js   Python book chapters (Automate the Boring Stuff, 3e)
book/r01.js …r29.js     R book chapters (R for Data Science, 2e)
sw.js                   service worker: shell precache + Pyodide/WebR runtime cache
manifest.webmanifest    PWA manifest
icon-*.png, apple-touch-icon.png
tests/                  jsdom smoke suites, shape contract check, one self-checking
                        chN_verify.py per Python chapter, one rchN_verify.mjs per R
                        chapter, and rverify.mjs (the shared WebR harness)
.github/workflows/deploy-pages.yml   auto-deploy to GitHub Pages
```

## Current state (as of 2026-07-28)

Everything below is merged to `main` and deployed:

- **Concept ladder practice** (original app): `LANGS` / `LADDER` / `BANK` /
  `LESSONS`, graded drills, streaks, ledger, offline queue for Python.
- **Lessons** for all 33 ladder concepts (12 py / 10 js / 6 r / 5 mermaid):
  intro `i`, syntax pairs `s`, gotchas `w`.
- **Extended lessons cover all four languages** (42 concepts): every concept
  has `read` (3+ paragraphs) and `practice` (3 problems). Verification per
  language: Python via python3, R via WebR, **JS via a harness replicating the
  runJS console shim exactly** (strings raw, everything else JSON.stringify —
  arrays print as [1,2,3]; see tests/js_practice_verify.mjs), **Mermaid via
  real mermaid.parse verdicts captured in Chromium** (tests/mmd_verify.mjs;
  practice is predict-the-verdict, and two verdicts are deliberately
  "surprisingly VALID": bare state names and the old stateDiagram header).
- **R ladder is 15 concepts** covering base R and the tidyverse, with 2 BANK
  drills each (30). Every R drill carries a real expected output captured from
  WebR — they were all `o:null` before R could execute.
- **Text highlighting**: select prose in lessons or book → floating Highlight
  button → saved as character-offset ranges in `S.highlights`, keyed per prose
  block; tap a highlight to remove. Survives reload.
- **Two book courses** (BOOK tab shows the book for the current language tab):
  - **Python** — *Automate the Boring Stuff with Python* (3e), Al Sweigart.
    **All 24 chapters complete** (ch01–ch24).
  - **R** — *R for Data Science* (2e), Wickham/Çetinkaya-Rundel/Grolemund.
    **All 29 chapters complete** (r01–r29).
  Both use **original lesson text** (see "Book content policy"). Every chapter
  has 6–9 sections, exactly 10 reveal-answer questions, and exactly 4 graded
  exercises mapped to that language's ladder concepts. R chapters may carry a
  `pkgs` array naming the WebR packages their exercises need. Per-section
  mark-as-read, progress meters, a "pick up where you left off" card, and a
  chapter path with crowns.
- **3e chapter map differs from older editions** (verified against the live
  3e TOC): ch2 is if-else only (truthiness moved to ch3), ch3 Loops, ch4
  Functions, ch5 Debugging, ch6 Lists, ch7 Dictionaries, ch8 Strings, ch9
  Regex, ch10 Files, ch11 Organizing Files, ch12 CLI Programs, ch13 Web
  Scraping, ch14 Excel, ch15 Google Sheets, ch16 SQLite, ch17 PDF/Word,
  ch18 CSV/JSON/XML, ch19 Time/Scheduling, ch20 Email/Texts/Push, ch21
  Graphs/Images, ch22 OCR, ch23 Keyboard/Mouse, ch24 TTS/Speech.
- **Third-party-library chapters (13–15, 17, 19–24) follow a strict
  honesty policy**: the library workflow is taught with an in-chapter
  disclosure note (desktop Python only — cannot run in this app), library
  calls whose output could not be honestly captured are shown output-free
  (never fabricated), outputs that ARE shown were captured from real runs
  in scratch venvs (bs4, openpyxl, pypdf/python-docx, Pillow/Matplotlib),
  and every graded exercise is stdlib-only so it runs in Pyodide. ch16
  (sqlite3) and ch18 (csv/json/xml) are stdlib and fully runnable in-app.
- **Chapters are NOT gated** — any chapter can be started at any time. The
  owner has been offered locked progression and hasn't asked for it.
- **Write-in question answers** (owner's July 27 ask): every book question has
  a `textarea.qans` above its Reveal button; answers persist in `S.book.ans`
  (saved on change and on reveal) and restore on reload.
- **Failed-exercise feedback** (owner's July 27 ask): when a book exercise is
  proven wrong **by execution** (never on a static/queued grade), the grade
  card appends a WHERE TO LOOK hint naming the chapter — and the exact section
  plus a tie-back sentence when the exercise carries `sec`/`fb` — with a
  "Reread" button that jumps there. ch01 has `sec`/`fb` on all 4 exercises;
  the other 52 chapters fall back to chapter-level pointers until backfilled.
- `openBook()` now derives the language from the chapter id (`bookLangOf`);
  it previously forced python, which broke opening R chapters directly.
- **Question self-checks**: after revealing a book answer, "I had it" /
  "Missed it" buttons record `S.book.quiz[chId][qi]` (true/false). Score shows
  in the questions header and on the chapter path. **Self-marks pay no XP** —
  rewards hang off executed code only — and do not affect `chapterDone`.
- **Free-run code, no grading**: `runnerEl(lang,{pkgs})` renders a
  textarea + Run + output block. Placed as "Try it yourself" below every
  chapter's exercises (book language, chapter `pkgs` honored) and as a
  "Playground" card on the practice view for the current language tab. The R
  runner also auto-installs packages named in `library()`/`require()` calls.
  **Mermaid renders** via CDN-on-demand ESM import (`renderMermaid`, theme
  follows the app theme); the SW caches `/npm/mermaid` chunks in the RUNTIME
  cache so rendering works offline after first use. Rendering is display
  only — Mermaid **grading** is still static and still capped, as disclosed.
- Nav is three tabs: PRACTICE / BOOK / LEDGER, plus language tabs.
- Service worker `SHELL` is at `shell-v10`.
- **Themes**: Light (default) / Dark / System, chosen in the ledger. See the
  theme constraint under "Hard constraints".

## Architecture (index.html, one script block, in order)

| Section | Contents |
|---|---|
| `LANGS` | per-language metadata; `runs` is `"native"`, `"pyodide"`, `"webr"`, or `false` |
| `LADDER` | ordered concept list per language |
| `BANK` | ladder exercises |
| `LESSONS` | lessons (`i`, `s`, `w`, and for Python and R `read`, `practice`) |
| book consts | `BOOKS` (python + r), `curBook()`, `bookChapters()`, `chapterById()` |
| storage | `S`, `persist()`, key `practicelog.offline.v1` |
| theme | `applyTheme()`, `resolvedTheme()`, `setTheme()`, `watchSystemTheme()` |
| game | `XP`, `levelInfo`, hearts, quests, `BADGES`, `awardXP`, `sfx`, `toast` |
| helpers | `el()`, `norm()`, `clone()` (JSON-based) |
| execution | `runPython`, `runJS`, `bootPython`, `bootR`, `runR`, `ensureRPkgs` |
| static checks | `lint`, `gradeIt` |
| actions | `teach`, `newTask`, `submit`, `logSession`, `drainQueue` |
| book actions | `openBook`, `markRead`, `startBookExercise`, `firstUnread`, `ensureBook` |
| PWA | SW registration, `cacheRuntime` |
| highlighting | `hlSpans`, `hlElK`/`hlEl`, `applyHighlight`, `wireHighlighting` |
| render | `render`, `renderStats`, `drawToasts`, `drawParty`, `confetti`, `renderBook`, `renderChapter`, `renderLesson`, `renderTask`, `renderRun`, `renderGrade`, `renderLedger` |

### Game mechanics (index.html, `/* ============ game ============ */`)

| Piece | Behaviour |
|---|---|
| XP | `XP` table: section 4, exercise 12 (repeat 4), drill 10, chapter 40, quest 20, goal 15. Combo adds up to +10. |
| Levels | `levelInfo(xp)`; level *l* costs `100+(l-1)*50`, so the curve widens. |
| Daily goal | `S.game.goal` (20/50/100, set in the ledger). Met once per day, pays a bonus. |
| Hearts | 5 max, one back every 20 min. A **failed graded attempt** costs one; at zero, grading is blocked but **reading is never blocked**. Fully switchable off in the ledger. |
| Quests | 3 per day, chosen from a hash of the date so a reload never reshuffles them. |
| Badges | 13 in `BADGES`, checked after every award. |
| Feedback | `sfx()` synthesises tones with WebAudio (no audio files), `buzz()` vibrates, `toast()` queues a pill, `party` drives the full-screen celebration, `confetti()` is canvas-drawn. All guarded; confetti also respects `prefers-reduced-motion`. |

The chapter path shows progression but **does not gate** chapters — the owner
asked for that explicitly. The next unfinished chapter pulses instead.

### State shape (`S`, single localStorage key)

```js
S = {
  lang, sessions[], streak{count,last},
  solid{lang:[concepts]}, shaky{...},
  queue[],                          // Python submissions awaiting a runtime
                                    // entries carry book:chId|null for credit
  highlights{ key: [[start,end],...] },  // key: "python|loops|r0" or "book|ch01|s2|b1"
  book{ last:{ch,sec}|null, read:{ch01:{0:true,...}}, ex:{ch01:["Exercise title",...]},
        ans:{ch01:{0:"the learner's written answer",...}},     // write-in question answers
        quiz:{ch01:{0:true,1:false,...}} },                    // self-check marks (no XP)
  game{ xp, day, todayXp, goal, hearts, heartTs, freezes, combo, bestCombo,
        quests:{day,items[]}, badges:{id:date}, hist:{date:xp}, goalDays,
        lastGoalDay, opts:{hearts,sound,motion} }
}
```
`ensureGame()` backfills and rolls the day over; every game mutation still
routes through `persist()`.
`blank` defines defaults; a top-level backfill loop migrates old stored states.

### Book chapter data shape (`book/chNN.js`)

```js
window.BOOK = window.BOOK || { chapters: {} };
window.BOOK.chapters.chNN = {
  n, title, src,                       // src links to the original chapter
  blurb,
  sections: [ { t, body: [ ["p",text] | ["code",text] | ["note",text] ] } ],
  questions: [ { q, a } ],             // reveal-style self-checks
  exercises: [ { c, t, b, o, h:[3], book:"chNN",
                 sec?, fb? } ]  // BANK-shaped, graded. Optional: sec is the index
                                // of the section that teaches this exercise, fb a
                                // one-sentence tie-back shown on a failed attempt.
                                // Both feed the WHERE TO LOOK feedback in
                                // renderGrade; without sec it falls back to a
                                // chapter-level pointer. ch01 is the exemplar —
                                // backfilling sec/fb across chapters is an open
                                // content task. shape_check validates both.
};
```
Exercise `c` maps to a `LADDER.python` concept so passing also advances the
ladder. `logSession` and `drainQueue` both credit `S.book.ex[chId]` on pass.

All 24 chapters exist, so there is nothing left to add. **To edit a
chapter**: change `book/chNN.js`, keep every shown output execution-true
(update `tests/chN_verify.py` and run it), run `node tests/shape_check.mjs
chNN` and `node tests/smoke3.mjs`, and bump `SHELL`. If a chapter were ever
added or removed: `<script src>` tag in index.html before the main script,
id in `BOOK_ORDER`, file in `APP_FILES` in sw.js, bump `SHELL`.

### R execution (WebR)

`bootR()` dynamically imports `https://webr.r-wasm.org/latest/webr.mjs`;
`runR(code, pkgs)` installs any missing packages then runs through `captureR`
with **`captureConditions:false`**, which is deliberate: an R error then lands
in the transcript as the `Error: ...` line R itself prints (matching a real
console) instead of throwing, and `runR` flags it by spotting that line.

Verified facts, not assumptions:
- WebR needs **no cross-origin isolation**, so it works on GitHub Pages. Tested
  with `crossOriginIsolated === false`.
- WebR's R is **4.6.0** — local R on this machine is 4.3.2 with different
  package versions, so **never capture chapter output from local R**. Use
  `tests/rverify.mjs`, which drives the same WebR from Node.
- ggplot2 there is **4.x / S7-based**: `p$labels$x` is NULL until draw time;
  use `get_labs(p)$x`. `length(p$layers)`, `class(p$layers[[1]]$geom)[1]` and
  `nrow(p$data)` are reliable. Printing a plot object emits **no text**, so no
  exercise may end on a bare plot object.
- `geom_histogram`'s geom class is `GeomBar`; `binwidth` lives in `stat_params`.
- ggplot2 4.x does not pull in tibble — list `"tibble"` in `pkgs` if you use it.
- `library(dplyr)` prints an attach banner, and `runR` installs a chapter's
  `pkgs` but does **not** attach them, so exercises call `library()` themselves
  and use `suppressMessages()` when the graded transcript should hold only the
  learner's own output.
- dplyr there is 1.2.1, whose regroup message differs from the familiar 1.1.x
  wording. `getwd()` is `/home/web_user`; relative-path file I/O works; the
  global env and filesystem persist between runs, so blocks needing a clean
  slate start with `rm(list = ls())` and file writes are idempotent.
- **Errors print as `Error: <message>`** — WebR drops the `Error in <call> :`
  prefix desktop R shows, and rlang's multi-line bullets do not survive
  `captureConditions:false`. To teach the full message, catch it and print
  `conditionMessage(e)` (or `conditionMessage(e$parent)` for purrr/dplyr).
  `traceback()` returns `No traceback available`. Warnings print *before* the
  value here, and carry their call even though errors do not.
- Printing a ggplot emits no text **unless drawing raises a warning**, in which
  case the warning is the entire output.

**Package availability in WebR, probed rather than assumed.** Installs: dplyr,
tidyr, tibble, ggplot2, stringr, forcats, lubridate, purrr, readr, readxl,
writexl, DBI, RSQLite, dbplyr, duckdb, jsonlite, rvest, xml2, nanoparquet,
googlesheets4, styler, lintr. **Does not install: `arrow`** — note that
`installPackages(['arrow'])` returns *without throwing* and the package is
simply absent afterwards, so check `packageVersion()` rather than trusting the
call. googlesheets4 installs but needs network plus browser OAuth, so it stays
output-free. Chapters 22 (arrow) and 24's network fetches are the only
library workflows taught output-free; everything else runs for real.

## Book content policy (important)

**Both books are original prose. Neither may be copied.**

- *Automate the Boring Stuff* (3e): the pages state no Creative Commons
  license, so its terms are unknown and no text may be copied. The site is
  reachable from local sessions and useful read-only for chapter structure.
- *R for Data Science* (2e): licensed **CC BY-NC-ND 3.0** (verified on the
  site, 2026-07-23). **ND means NoDerivatives** — a close paraphrase is a
  derivative work, so the same rule applies with the license now confirmed
  rather than merely unknown. Curriculum structure (a list of topics) is not
  copyrightable; the words are.

**Owner request on file (July 27 log): "do not deviate too much from the
original text. do not summarize."** Resolution: verbatim or near-verbatim text
cannot be added for either book under the verified terms above — that part of
the request must not be implemented by copying or close paraphrase, in any
session. What CAN honor its spirit: keep readings full prose that covers every
topic the original chapter covers (no thin summaries), keep the original-
chapter link prominent in every chapter, and deepen any section that skimps.
If the owner obtains permission from a rights holder, revisit; until then this
is settled policy, not an open question.

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
- **Themes are opt-in, never automatic.** Light is the default and keeps
  `color-scheme: light only` — the fix for the owner's device force-inverting
  the page. Dark is a designed palette under `:root[data-theme="dark"]`, chosen
  in the ledger (Light / Dark / System); only "System" consults the device.
  The `prefers-color-scheme: dark` re-assertion block still exists but every
  rule is scoped `html:not([data-theme="dark"])`, so an OS-imposed dark theme is
  still overridden while a deliberately chosen one is not. `smoke4.mjs` asserts
  a dark-preferring device does NOT darken the app on the Light setting.
- **Components must not hardcode colours.** Use the semantic pairs —
  `--fill`/`--onFill` (ink-coloured buttons and pills), `--onAccent` (text on a
  teal or gold fill), `--hl`/`--onHl` (highlights), `--knobShadow`. A literal
  `#fff` on a `var(--ink)` background inverts into unreadable text in dark.
- Text contrast stays ≥ WCAG AA **in both palettes**, checked by
  `node tests/contrast_check.mjs`, which parses the variables out of index.html.
  Note: `--soft` and `--gold` were previously **below** AA (3.48:1 and 4.49:1)
  despite this file claiming otherwise, and were darkened to #69716C and
  #976708. If the owner asks for lighter muted type again, that is the tradeoff
  being requested — it is one line, but it drops below AA.
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
node tests/smoke3.mjs   # book: deep flows + auto-checks EVERY wired chapter's render counts
node tests/smoke4.mjs   # game + theme: XP, hearts, quests, badges, levels, celebration
node tests/contrast_check.mjs     # WCAG AA for both palettes (parses the CSS variables)
node tests/shape_check.mjs        # data contract for all book/ch*.js (counts, concepts, register)
for n in $(seq 1 29); do [ -f "tests/rch${n}_verify.mjs" ] && (node "tests/rch${n}_verify.mjs" >/dev/null || echo "r$n FAIL"); done
python3 tests/practice_verify.py  # re-verify lesson practice outputs (prints for eyeballing)
python3 tests/ch1_verify.py       # chapter 1 outputs (print-style, the original pattern)
for n in $(seq 2 24); do python3 "tests/ch${n}_verify.py" > /dev/null || echo "ch$n FAIL"; done
```

ch2–ch24 verify scripts are self-checking (exit 1 on drift). Checks that
need a third-party lib (bs4, openpyxl, pypdf/python-docx, Pillow/Matplotlib)
skip gracefully with a printed skip line when the lib is absent — the
battery is green on a stdlib-only machine. All suites must pass before
pushing. Always test the failing case too — a grader that passes everything
is worse than no grader. Note: jsdom skips external `<script src>`; smoke3
reads every `book/ch*.js` and evals them in `beforeParse` to replicate real
script order, so new chapters need no smoke3 edits.

## Deploy

Push to `main` → workflow deploys to GitHub Pages automatically. The owner
works on mobile and merges PRs from the GitHub app; branch-then-PR has been
the pattern. iOS install: Safari only → Add to Home Screen; then "Cache
Python for offline" on wifi.

## Known limitations — do not "fix" silently

- Mermaid **grading** never executes; correctness capped at 3/5 (disclosed in
  footer). Mermaid does **render** in the free-run runners — display only, it
  emits no text to diff, so the grading cap stands. R executes via WebR.
- Pyodide cache is evictable (iOS ~7 weeks unused); the cache button
  reappearing is intended.
- Progress is device-local; "Export progress" is the backup.
- `runJS` uses `new Function` — acceptable only because the sole author of the
  code is the person running it. Never feed it code from any other source.
- JS runner waits a fixed 700 ms for async output; keep drill delays < 500 ms.

### Pyodide runtime facts (verified by real testing during the book build)

- `shelve` does not import in Pyodide 0.26.4 (`No module named 'dbm'`).
- `FileNotFoundError` reports `[Errno 44]` in Pyodide vs `[Errno 2]` locally
  (WASI errno); ch10 discloses this in prose.
- `zipfile` `compress_size` differs across zlib builds — never assert exact
  compressed sizes.
- The Pyodide filesystem persists across submissions within one session:
  `shutil.move(file, existing_folder)` raises `shutil.Error` on a rerun, so
  book exercises use full-destination-path moves and idempotent 'w' writes.
- `subprocess`, threading, network, clipboard, and GUI libraries are absent
  or non-functional in the app; chapters that teach them disclose it.

## Roadmap (owner's priorities)

1. ~~Python book chapters~~ **DONE: all 24 3e chapters.**
2. ~~WebR execution for R~~ **DONE: R runs and is graded by execution.**
3. ~~R book~~ **DONE: all 29 r4ds 2e chapters,** plus the 15-concept R ladder
   with lessons and drills. Future book work is edits, not additions.
4. ~~Extend `read`/`practice` to JS and Mermaid~~ **DONE: all 42 concepts in
   all four languages carry the deep tier, outputs/verdicts verified.**
5. More Python BANK drills (2-3 per concept; `while` loops and string
   formatting underrepresented).
6. Gamification follow-ups the owner has NOT asked for, so do not add
   unprompted: locked chapter progression (the path deliberately does not gate),
   streak-freeze spending UI, and any leaderboard (there is no backend, and a
   fabricated one would be dishonest — the weekly chart is the owner's own
   history on purpose).

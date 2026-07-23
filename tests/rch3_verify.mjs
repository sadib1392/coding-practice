// Verify every executable claim in book/r03.js (R chapter 3, "Data transformation").
//
// Nothing here is written from memory. The script loads the chapter data file,
// pulls the code blocks and the output blocks straight out of it, runs the code
// in WebR (R 4.6.0 + dplyr, the same runtime the app uses), and diffs the real
// transcript against the text the chapter shows the learner. If a chapter block
// drifts from what R actually prints, this fails.
//
//   npm install webr      (dev-only, gitignored)
//   node tests/rch3_verify.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// The chapter file is a plain browser script, so give it a window to attach to.
global.window = {};
require(path.join(here, '..', 'book', 'r03.js'));
const CH = global.window.BOOK_R.chapters.r03;

const { check, checkTrue, done } = makeChecker('rch3');

// blk(section, item) -> the text of a body block, so every expectation below is
// literally the string the learner reads. No second copy to keep in sync.
const blk = (s, i) => {
  const item = CH.sections[s].body[i];
  if (!item) throw new Error(`no block at S${s}[${i}]`);
  return item[1];
};

// The chapter defines `harvest` in S0[8]; that block ends by printing it. Strip
// the print and reuse the definition verbatim as the setup for every later
// snippet, so the verified data is the data the chapter shows.
const DATA = blk(0, 8).replace(/\n+harvest\s*$/, '');
const SETUP = 'suppressMessages(library(dplyr))\n' + DATA + '\n';

const R = await makeR(['dplyr']);

// Run a chapter code block with the chapter's own data in scope.
const run = (code) => R.run(SETUP + code);
// Section check: block `ci` is the code, block `oi` is what it prints.
const sec = async (label, s, ci, oi) => check(label, await run(blk(s, ci)), blk(s, oi));

/* ---------- S0: dplyr and the harvest log ---------- */

// Must run before anything attaches dplyr: the banner only prints on first attach.
check('S0 library(dplyr) banner', await R.run(blk(0, 4)), blk(0, 5));

// The tibble definition block prints the whole table.
check('S0 harvest prints', await R.run('suppressMessages(library(dplyr))\n' + blk(0, 8)), blk(0, 9));
await sec('S0 filter squash + harvest untouched', 0, 12, 13);

/* ---------- S1: filter() and its two traps ---------- */
await sec('S1 filter kg > 5', 1, 1, 2);
await sec('S1 filter two conditions', 1, 4, 5);
await sec('S1 filter %in%', 1, 7, 8);
await sec('S1 filter with = errors', 1, 10, 11);
await sec('S1 NA comparisons', 1, 14, 15);
await sec('S1 filter drops the NA row', 1, 17, 18);
await sec('S1 filter is.na', 1, 20, 21);

/* ---------- S2: arrange() and distinct() ---------- */
await sec('S2 arrange kg', 2, 1, 2);
await sec('S2 arrange desc(kg)', 2, 4, 5);
await sec('S2 arrange two keys', 2, 7, 8);
await sec('S2 distinct one and two columns', 2, 10, 11);
await sec('S2 distinct .keep_all', 2, 13, 14);

/* ---------- S3: mutate() and select() ---------- */
await sec('S3 mutate kg_per_hour', 3, 1, 2);
await sec('S3 mutate .before = 1', 3, 5, 6);
await sec('S3 mutate .keep = used', 3, 7, 8);
await sec('S3 select three columns', 3, 10, 11);
await sec('S3 select range, drop, where', 3, 12, 13);

/* ---------- S4: rename() and relocate() ---------- */
await sec('S4 rename', 4, 1, 2);
await sec('S4 backwards rename is a bare Error', 4, 4, 5);
await sec('S4 relocate .before', 4, 8, 9);
await sec('S4 relocate .after last_col', 4, 10, 11);

/* ---------- S5: the pipe ---------- */
await sec('S5 nested calls', 5, 1, 2);
await sec('S5 piped chain', 5, 4, 5);

// S5 note claims a line that STARTS with |> is a syntax error.
{
  const err = await R.runErr(SETUP + 'harvest\n|> filter(crop == "kale")');
  checkTrue("S5 note: leading |> is a syntax error", /unexpected '\|>'/.test(err || ''), String(err));
}

/* ---------- S6: group_by(), summarise(), n() ---------- */
await sec('S6 group_by prints Groups line', 6, 1, 2);
await sec('S6 summarise sum(kg) -> NA', 6, 4, 5);
await sec('S6 sum with and without na.rm', 6, 7, 8);
await sec('S6 summarise na.rm = TRUE', 6, 10, 11);
await sec('S6 summarise n() and mean', 6, 13, 14);
await sec('S6 count shorthand', 6, 16, 17);

// S6 claims count() is shorthand for group_by() + summarise(n = n()).
check('S6 note: count == group_by + summarise(n())',
  await run('identical(count(harvest, crop), summarise(group_by(harvest, crop), n = n()))'),
  '[1] TRUE');

/* ---------- S7: slice_ helpers, ungrouping, .by ---------- */
await sec('S7 slice_max one per group', 7, 1, 2);
await sec('S7 slice_min returns ties', 7, 4, 5);
await sec('S7 two groups: regroup message', 7, 7, 8);
await sec('S7 .groups = drop silences it', 7, 10, 11);
await sec('S7 second summarise sees whole table', 7, 13, 14);
await sec('S7 .by per-operation grouping', 7, 16, 17);

// S7 claims the beans tie is why slice_min returned four rows, not three.
check('S7 note: two beans rows tie on hours',
  await run('nrow(filter(harvest, crop == "beans", hours == min(hours)))'),
  '[1] 2');

/* ---------- questions: every executable claim ---------- */

check('Q1 ten rows, five columns', await run('nrow(harvest)\nncol(harvest)'), '[1] 10\n[1] 5');

check('Q2 harvest unchanged by filter',
  await run('invisible(filter(harvest, crop == "squash"))\nnrow(harvest)'), '[1] 10');

check('Q3 named-input error text',
  await R.runErr(SETUP + 'filter(harvest, plot = "north")'), 'Error: We detected a named input.');

check('Q4 kg > 1 gives 9, with is.na gives 10',
  await run('nrow(filter(harvest, kg > 1))\nnrow(filter(harvest, kg > 1 | is.na(kg)))'),
  '[1] 9\n[1] 10');

check('Q5 NA == NA is NA', await run('NA == NA'), '[1] NA');

check('Q6 desc(kg) still sorts NA last',
  await run('identical(tail(arrange(harvest, desc(kg)), 1), filter(harvest, is.na(kg)))'),
  '[1] TRUE');

check('Q7 .before = 1 moves the new column to the front',
  await run('names(mutate(harvest, kg_per_hour = kg / hours, .before = 1))[1]'),
  '[1] "kg_per_hour"');
check('Q7 default puts it last',
  await run('tail(names(mutate(harvest, kg_per_hour = kg / hours)), 1)'),
  '[1] "kg_per_hour"');

check('Q8 rename reads new = old',
  await run('names(rename(harvest, weight_kg = kg))'),
  '[1] "plot"      "crop"      "week"      "weight_kg" "hours"    ');
// Q8 claims the backwards form fails, and that this runner shows a bare Error
// with no detail. Both halves are asserted: it must error, and the text must be
// exactly the empty-detail line — if a future dplyr/WebR surfaces the real
// message, this fails and the chapter's disclosure has to be rewritten.
check('Q8 backwards rename gives a detail-free error',
  await R.runErr(SETUP + 'rename(harvest, kg = weight_kg)'), 'Error:');

check('Q9 select keeps only what you name',
  await run('ncol(select(harvest, kg))\nncol(relocate(harvest, kg))'), '[1] 1\n[1] 5');

check('Q10 south is NA without na.rm',
  await run('pull(filter(summarise(group_by(harvest, plot), t = sum(kg)), plot == "south"), t)'),
  '[1] NA');
check('Q10 south is 9.9 with na.rm',
  await run('pull(filter(summarise(group_by(harvest, plot), t = sum(kg, na.rm = TRUE)), plot == "south"), t)'),
  '[1] 9.9');

/* ---------- exercises: reference solutions must equal `o` ---------- */

const SOLUTIONS = {
  "Heavy beds first": `suppressMessages(library(dplyr))
beds <- tibble(
  bed = c("a", "b", "c", "d", "e", "f"),
  kg  = c(3.5, 8.1, 5.2, 2.2, 9.4, 6.7)
)
beds |>
  filter(kg >= 5) |>
  arrange(desc(kg))`,

  "Kilometres per hour": `suppressMessages(library(dplyr))
runs <- tibble(
  route = c("ridge", "creek", "loop", "flats"),
  km    = c(12, 5, 8, 10),
  mins  = c(90, 30, 56, 48)
)
runs |>
  mutate(kmh = km / (mins / 60)) |>
  select(route, kmh) |>
  arrange(desc(kmh))`,

  "Market stall totals": `suppressMessages(library(dplyr))
sales <- tibble(
  stall = c("bread", "bread", "jam", "jam", "jam", "honey"),
  items = c(4L, 6L, 3L, 5L, 2L, 7L)
)
sales |>
  group_by(stall) |>
  summarise(orders = n(), total = sum(items)) |>
  arrange(stall)`,

  "What the shelf is worth": `suppressMessages(library(dplyr))
stock <- tibble(
  item  = c("flour", "sugar", "yeast", "salt"),
  units = c(12L, 3L, 25L, 8L),
  price = c(1.2, 0.8, 0.5, 0.4)
)
stock |>
  mutate(value = units * price) |>
  filter(value > 5) |>
  rename(product = item) |>
  arrange(desc(value))`,
};

// norm() in the app collapses whitespace before diffing; compare on that basis
// so column padding can never be the reason a learner's correct answer fails.
const norm = (s) => String(s ?? '').replace(/\r/g, '').split('\n')
  .map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\s+/g, ' ').trim();

checkTrue('exercise count is 4', CH.exercises.length === 4, String(CH.exercises.length));

for (const ex of CH.exercises) {
  const src = SOLUTIONS[ex.t];
  if (!src) { checkTrue(`solution exists for "${ex.t}"`, false); continue; }
  const got = await R.run(src);
  check(`EX "${ex.t}" reference solution`, got, ex.o);
  checkTrue(`EX "${ex.t}" grades PASS under norm()`, norm(got) === norm(ex.o), norm(got));
  checkTrue(`EX "${ex.t}" has a non-null expected output`, typeof ex.o === 'string' && ex.o.length > 0);
  checkTrue(`EX "${ex.t}" has 3 hints`, Array.isArray(ex.h) && ex.h.length === 3);
  // Tier 3 may name the verbs but must not hand over a runnable program: no
  // data construction, no multi-line code, and shorter than the solution.
  checkTrue(`EX "${ex.t}" tier-3 hint is not the whole answer`,
    !ex.h[2].includes('tibble(') && !ex.h[2].includes('\n') && ex.h[2].length < src.length,
    ex.h[2]);
}

/* ---------- shape ---------- */
checkTrue('9 sections, last is Summary',
  CH.sections.length === 9 && CH.sections[8].t === 'Summary');
checkTrue('exactly 10 questions', CH.questions.length === 10, String(CH.questions.length));
checkTrue('chapter declares dplyr', Array.isArray(CH.pkgs) && CH.pkgs.includes('dplyr'));
checkTrue('every exercise is tagged book:r03', CH.exercises.every((e) => e.book === 'r03'));
{
  const CONCEPTS = ["vectors","data types","data frames","indexing","apply family","functions",
    "tibbles & pipes","ggplot2 basics","dplyr verbs","grouping & summaries","tidy data","joins",
    "strings & regex","factors & dates","iteration"];
  checkTrue('every exercise concept is a real R ladder concept',
    CH.exercises.every((e) => CONCEPTS.includes(e.c)), CH.exercises.map((e) => e.c).join(', '));
  const cs = CH.exercises.map((e) => e.c);
  checkTrue('at least two "dplyr verbs" exercises',
    cs.filter((c) => c === 'dplyr verbs').length >= 2);
  checkTrue('at least one "grouping & summaries" exercise',
    cs.includes('grouping & summaries'));
}
{
  // Register: no exclamation marks in anything the learner reads as prose.
  // Code blocks are exempt because ! is R's negation operator (select(!hours),
  // filter(!is.na(x))) — that is syntax, not shouting.
  const prose = [CH.blurb];
  CH.sections.forEach((s) => {
    prose.push(s.t);
    s.body.forEach(([kind, text]) => { if (kind !== 'code') prose.push(text); });
  });
  CH.questions.forEach((q) => prose.push(q.q, q.a));
  CH.exercises.forEach((e) => prose.push(e.t, e.b, ...e.h));
  const shouty = prose.filter((t) => t.includes('!'));
  checkTrue('no exclamation marks in prose', shouty.length === 0, shouty.join(' | '));
}

await R.close();
done();

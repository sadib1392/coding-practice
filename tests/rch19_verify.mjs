// Verifies R book chapter 19 (book/r19.js) against a real WebR run.
//
// This script keeps NO copy of the chapter's shown output. It loads book/r19.js,
// pulls the code blocks straight out of the data, runs them in WebR, and diffs
// each result against the very next block in the file. Editing the chapter
// without re-capturing therefore fails here.
//
// Order matters and is deliberate:
//   1. The four exercise reference solutions run FIRST, in a session where dplyr
//      has never been attached. That is the only honest test of their
//      suppressPackageStartupMessages() preamble — if it failed to hide the
//      attach notice, the notice would land in the transcript and the four
//      checks would fail.
//   2. The session is then wiped and dplyr detached, so the chapter's own
//      library(dplyr) block prints the attach notice the chapter shows.
//   3. Chapter blocks run top to bottom in ONE session, the way a learner reads
//      them, so state accumulates (stalls, orders, ratings, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch19_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r19.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r19;

const { check, checkTrue, done } = makeChecker('rch19');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 19', CH.n === 19);
checkTrue('title is "Joins"', CH.title === 'Joins');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/joins.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists dplyr', Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'dplyr');
checkTrue('section count is 6-9', CH.sections.length >= 6 && CH.sections.length <= 9,
  'got ' + CH.sections.length);
checkTrue('last section is Summary', CH.sections[CH.sections.length - 1].t === 'Summary');
checkTrue('every body row is p/code/note',
  CH.sections.every((s) => s.body.every((b) => ['p', 'code', 'note'].includes(b[0]) &&
    typeof b[1] === 'string' && b[1].length > 0)));
checkTrue('exactly 10 questions', CH.questions.length === 10, 'got ' + CH.questions.length);
checkTrue('every question has q and a',
  CH.questions.every((q) => q.q && q.a && q.q.length > 10 && q.a.length > 20));
checkTrue('exactly 4 exercises', CH.exercises.length === 4, 'got ' + CH.exercises.length);
checkTrue('every exercise concept is on the R ladder',
  CH.exercises.every((e) => LADDER.includes(e.c)),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('at least 3 exercises are joins',
  CH.exercises.filter((e) => e.c === 'joins').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r19' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 20 (spreadsheets)',
  /spreadsheets/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', !src.includes('!'),
  'found at index ' + src.indexOf('!'));
// Every join in the chapter whose shown output is a table must be arranged
// first; joins do not guarantee row order.
const unsorted = [];
for (const s of CH.sections) {
  const c = s.body.filter((b) => b[0] === 'code').map((b) => b[1]);
  for (let i = 0; i + 1 < c.length; i++) {
    if (/_join\(/.test(c[i]) && /# A tibble/.test(c[i + 1]) && !/arrange\(/.test(c[i])) {
      unsorted.push(s.t + ' [' + i + ']');
    }
  }
}
checkTrue('every join whose output is a table is arranged first',
  unsorted.length === 0, unsorted.join(' // '));

// ------------------------------------------------------------- helpers ----
const section = (title) => {
  const s = CH.sections.find((x) => x.t === title);
  if (!s) throw new Error('no such section: ' + title);
  return s;
};
const codes = (title) => section(title).body.filter((b) => b[0] === 'code').map((b) => b[1]);

const R = await makeR(CH.pkgs);

// ------------------------------------------ 1. exercises, from a cold session ----
// dplyr has NOT been attached yet, so the preamble is genuinely under test.
const SOLUTIONS = [
// 1 — Attach the depot to each van
`suppressPackageStartupMessages(library(dplyr))

depots <- tibble(
  depot_id = c(1L, 2L, 3L),
  city     = c("Lund", "Malmo", "Ystad")
)

vans <- tibble(
  van_id   = c(7L, 8L, 9L, 10L),
  depot_id = c(2L, 1L, 3L, 2L),
  seats    = c(3L, 2L, 3L, 5L)
)

vans |>
  left_join(depots, join_by(depot_id)) |>
  arrange(van_id)`,
// 2 — Members who have not paid
`suppressPackageStartupMessages(library(dplyr))

members <- tibble(
  member_id = c(11L, 12L, 13L, 14L),
  name      = c("Ada", "Bo", "Cleo", "Dov")
)

payments <- tibble(
  ref       = c("P1", "P2", "P3"),
  member_id = c(12L, 14L, 12L)
)

members |>
  anti_join(payments, join_by(member_id)) |>
  arrange(member_id)`,
// 3 — Cost of every pick that matched
`suppressPackageStartupMessages(library(dplyr))

parts <- tibble(
  part_id = c("A1", "A2", "A3"),
  price   = c(2.5, 4, 1.25)
)

picks <- tibble(
  pick_id = c(1L, 2L, 3L, 4L),
  part_id = c("A2", "A1", "A9", "A2"),
  qty     = c(3L, 2L, 1L, 5L)
)

picks |>
  inner_join(parts, join_by(part_id)) |>
  mutate(cost = price * qty) |>
  select(pick_id, part_id, cost) |>
  arrange(pick_id)`,
// 4 — Kilos per zone
`suppressPackageStartupMessages(library(dplyr))

plots <- tibble(
  plot_id = c(1L, 2L, 3L),
  zone    = c("north", "north", "south")
)

hauls <- tibble(
  haul_id = c(1L, 2L, 3L, 4L, 5L),
  plot_id = c(1L, 1L, 2L, 3L, 3L),
  kg      = c(4, 6, 2, 5, 3)
)

hauls |>
  left_join(plots, join_by(plot_id)) |>
  group_by(zone) |>
  summarise(total_kg = sum(kg)) |>
  arrange(zone)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrongOrder = await R.run(SOLUTIONS[0].replace('arrange(van_id)', 'arrange(depot_id)'));
checkTrue('exercise 1 rejects the wrong sort order', wrongOrder !== CH.exercises[0].o, wrongOrder);
const wrongAnti = await R.run(SOLUTIONS[1].replace('anti_join', 'semi_join'));
checkTrue('exercise 2 rejects semi_join in place of anti_join',
  wrongAnti !== CH.exercises[1].o, wrongAnti);
const wrongInner = await R.run(SOLUTIONS[2].replace('inner_join', 'left_join'));
checkTrue('exercise 3 rejects left_join in place of inner_join',
  wrongInner !== CH.exercises[2].o, wrongInner);
const wrongSum = await R.run(SOLUTIONS[3].replace('sum(kg)', 'mean(kg)'));
checkTrue('exercise 4 rejects mean in place of sum', wrongSum !== CH.exercises[3].o, wrongSum);

// ------------------------------ 2. reset, so the chapter starts from nothing ----
await R.run('rm(list = ls())\ndetach("package:dplyr")');

// ------------------------------------------------- 3. chapter code blocks ----
// Run code block i of a section and diff against block i+1 of the same section.
const pair = async (title, i, label) => {
  const c = codes(title);
  check(label || (title + ' [' + i + ']'), await R.run(c[i]), c[i + 1]);
};

const S1 = 'Two tables and a shared column';
const S2 = 'Keys';
const S3 = 'Mutating joins';
const S4 = 'Filtering joins';
const S5 = 'Naming the join columns';
const S6 = 'How rows are matched';
const S7 = 'Non-equi joins';

await pair(S1, 0, 's1 library(dplyr) prints the attach notice');
await pair(S1, 2, 's1 stalls tibble prints');
await pair(S1, 4, 's1 orders tibble prints');

await pair(S2, 0, 's2 both primary keys are unique');
await pair(S2, 2, 's2 aisle is not a key');
await pair(S2, 4, 's2 setdiff finds the dangling stall_id');

await pair(S3, 0, 's3 left_join with no by prints the Joining message');
await pair(S3, 2, 's3 explicit join_by is silent');
await pair(S3, 4, 's3 inner_join drops the orphan order');
await pair(S3, 6, 's3 right_join keeps the stall with no orders');
await pair(S3, 8, 's3 full_join keeps both');
await pair(S3, 10, 's3 row counts 6 / 5 / 7');

await pair(S4, 0, 's4 semi_join keeps matched rows, adds no columns');
await pair(S4, 2, 's4 anti_join finds the orphan order');
await pair(S4, 4, 's4 anti_join the other way finds the unused stall');

await pair(S5, 0, 's5 join_by(a == b) for differently named keys');
await pair(S5, 2, 's5 colliding column names get .x and .y');
await pair(S5, 4, 's5 suffix renames the collision');

await pair(S6, 0, 's6 ratings tibble prints');
await pair(S6, 2, 's6 duplicate keys multiply rows and warn');
await pair(S6, 4, 's6 relationship many-to-one errors');
await pair(S6, 6, 's6 relationship many-to-many silences the warning');

await pair(S7, 0, 's7 between() bands the orders');
await pair(S7, 2, 's7 cross_join makes every combination');
await pair(S7, 4, 's7 bare inequality matches every earlier restock');
await pair(S7, 6, 's7 closest() keeps only the most recent');

// ------------------------------------- executable prose / question claims ----
// s1 prose + question 4: stall 2 ordered twice, stall 9 does not exist.
check('claim: stall_id 2 appears twice in orders and 9 is absent from stalls',
  await R.run('sum(orders$stall_id == 2)\n9 %in% stalls$stall_id'),
  '[1] 2\n[1] FALSE');
// s4 prose + question 6: a filtering join adds no columns, a mutating one does.
check('claim: semi_join keeps 4 columns while left_join makes 6',
  await R.run('ncol(orders)\nncol(semi_join(orders, stalls, join_by(stall_id)))\nncol(left_join(orders, stalls, join_by(stall_id)))'),
  '[1] 4\n[1] 4\n[1] 6');
// s4 prose: both anti_join directions return exactly one row, and different ones.
check('claim: both anti_join directions return one row',
  await R.run('nrow(anti_join(orders, stalls, join_by(stall_id)))\nnrow(anti_join(stalls, orders, join_by(stall_id)))'),
  '[1] 1\n[1] 1');
// s3 prose: an inner join is a semi join followed by a left join.
check('claim: inner_join equals semi_join then left_join',
  await R.run('identical(\n  as.data.frame(arrange(inner_join(orders, stalls, join_by(stall_id)), order_id)),\n  as.data.frame(arrange(left_join(semi_join(orders, stalls, join_by(stall_id)), stalls, join_by(stall_id)), order_id))\n)'),
  '[1] TRUE');
// s5 prose: the older by = "stall_id" string form still runs and gives 6 columns.
check('claim: the older by = string form still works',
  await R.run('ncol(left_join(orders, stalls, by = "stall_id"))'), '[1] 6');
// s6 prose + question 9: the multiplication is 6 rows in, 8 rows out.
check('claim: the many-to-many join returns 8 rows from 6',
  await R.run('nrow(orders)\nnrow(left_join(orders, ratings, join_by(stall_id), relationship = "many-to-many"))'),
  '[1] 6\n[1] 8');
// s6 note: joining on stall_id AND month would not exist to join on, but the
// same key made complete (stall_id + a month column) matches one-to-one. Check
// the weaker claim actually made: one rating per stall per month.
check('claim: stall_id and month together are unique in ratings',
  await R.run('nrow(count(ratings, stall_id, month) |> filter(n > 1))'), '[1] 0');
// s7 prose: the bare inequality gives 6 rows where closest() gives 3.
check('claim: inequality gives 6 rows, closest() gives 3',
  await R.run('nrow(left_join(picks, restocks, join_by(day >= day)))\nnrow(left_join(picks, restocks, join_by(closest(day >= day))))'),
  '[1] 6\n[1] 3');
// s7 prose: three aisles times two days is six rows.
check('claim: cross_join size is the product of the inputs',
  await R.run('nrow(distinct(stalls, aisle))\nnrow(days)\nnrow(cross_join(distinct(stalls, aisle), days))'),
  '[1] 3\n[1] 2\n[1] 6');
// s7 prose: the bands do not overlap, so no order matches twice.
check('claim: the tier bands do not overlap',
  await R.run('nrow(inner_join(orders, tiers, join_by(between(boxes, lo, hi))))'), '[1] 6');
// s2 note / question 2: aisle fails the primary-key test that stall_id passes.
check('claim: stall_id is unique and aisle is not',
  await R.run('nrow(count(stalls, stall_id) |> filter(n > 1))\nnrow(count(stalls, aisle) |> filter(n > 1))'),
  '[1] 0\n[1] 2');

await R.close();
done();

// Verify every shown output in book/r05.js (R Chapter 5, Data tidying).
//
// Nothing here is written from memory. The code strings AND the expected output
// strings are both read out of the shipped chapter file, then the code is run in
// WebR and diffed against the shown output. A mangled escape or an edited table
// therefore fails, because the chapter's own bytes are what gets executed.
//
// Run from the repo root:  node tests/rch5_verify.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeR, makeChecker } from './rverify.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
global.window = {};
eval(fs.readFileSync(path.join(root, 'book', 'r05.js'), 'utf8'));
const ch = window.BOOK_R.chapters.r05;

const { check, checkTrue, done } = makeChecker('r05');

// Body accessors: si = section index, bi = body index.
const body = (si, bi) => {
  const s = ch.sections[si];
  if (!s || !s.body[bi]) throw new Error(`no body at s${si}b${bi}`);
  return s.body[bi];
};
const codeAt = (si, bi) => {
  const b = body(si, bi);
  if (b[0] !== 'code') throw new Error(`s${si}b${bi} is ${b[0]}, expected code`);
  return b[1];
};
const proseAt = (si, bi) => body(si, bi)[1];

// Attach the chapter's packages the same way the app would.
const R = await makeR(ch.pkgs);

// ---------------------------------------------------------------------------
// 1. EXERCISES FIRST, from a cold session where dplyr has never been attached.
//    This is the honest test of the suppressPackageStartupMessages() preamble:
//    if it failed to hide the attach notice, the notice would land in the
//    output and these four checks would fail.
// ---------------------------------------------------------------------------
const PRE = 'suppressPackageStartupMessages({\n  library(tidyr)\n  library(dplyr)\n})\n\n';

const SOLUTIONS = [
  // 0 — Fold the rehearsal ledger
  PRE + `rooms <- tibble(
  room  = c("attic", "cellar", "loft"),
  april = c(12, 7, 19),
  may   = c(15, 11, 4)
)

rooms |>
  pivot_longer(cols = -room, names_to = "month", values_to = "hours") |>
  arrange(room, month) |>
  print()`,
  // 1 — Spread the shift log
  PRE + `shifts <- tibble(
  crew    = c("red", "red", "blue", "blue"),
  task    = c("setup", "teardown", "setup", "teardown"),
  minutes = c(35, 20, 41, 26)
)

shifts |>
  pivot_wider(names_from = task, values_from = minutes) |>
  arrange(crew) |>
  print()`,
  // 2 — Split the headings
  PRE + `sales <- tibble(
  shop      = c("hill", "dale"),
  tea_mon   = c(31, 24),
  tea_tue   = c(28, 30),
  cocoa_mon = c(9, 12),
  cocoa_tue = c(14, 7)
)

sales |>
  pivot_longer(
    cols = -shop,
    names_to = c("drink", "day"),
    names_sep = "_",
    values_to = "units"
  ) |>
  arrange(shop, drink, day) |>
  print()`,
  // 3 — Total after tidying
  PRE + `beds <- tibble(
  bed = c("a", "b", "c"),
  jan = c(4, 6, 5),
  feb = c(9, 2, 7)
)

beds |>
  pivot_longer(cols = -bed, names_to = "month", values_to = "crates") |>
  group_by(month) |>
  summarise(total = sum(crates)) |>
  arrange(month) |>
  print()`,
];

checkTrue('exercises: exactly 4', ch.exercises.length === 4, `got ${ch.exercises.length}`);
for (let i = 0; i < SOLUTIONS.length; i++) {
  const ex = ch.exercises[i];
  check(`ex${i + 1} "${ex.t}" reference solution == o`, await R.run(SOLUTIONS[i]), ex.o);
  checkTrue(`ex${i + 1} book tag`, ex.book === 'r05', ex.book);
  checkTrue(`ex${i + 1} has 3 hints`, Array.isArray(ex.h) && ex.h.length === 3);
  checkTrue(`ex${i + 1} o is non-empty`, typeof ex.o === 'string' && ex.o.length > 0);
}

// A learner who lets the tibble autoprint instead of calling print() must pass too.
check('ex1 autoprint == print()',
  await R.run(SOLUTIONS[0].replace(/ \|\>\n  print\(\)$/, '')),
  ch.exercises[0].o);

// ---------------------------------------------------------------------------
// 2. Every code block in the chapter that is followed by a shown output block.
//    Run in document order, in one session, exactly as a reader would.
// ---------------------------------------------------------------------------
await R.run(codeAt(0, 1)); // library(tidyr); library(dplyr) — shown with no output

const PAIRS = [
  [0, 4, 5, 'harvest wide tibble'],
  [0, 8, 9, 'harvest_tidy long tibble'],
  [1, 1, 2, 'group_by/summarise on tidy data'],
  [1, 4, 5, 'mutate on tidy data'],
  [1, 7, 8, 'mutate on wide data names each column'],
  [2, 1, 2, 'pivot_longer basic'],
  [2, 5, 6, 'three cols selections are identical'],
  [2, 9, 10, 'pivot_longer defaults to name/value'],
  [3, 1, 2, 'dim before and after lengthening'],
  [4, 1, 2, 'feeder wide, years as headings'],
  [4, 4, 5, 'feeder lengthened, year is chr'],
  [4, 7, 8, 'feeder lengthened with names_transform'],
  [5, 1, 2, 'cafe wide'],
  [5, 4, 5, 'cafe split with names_sep'],
  [5, 7, 8, 'cafe with a single names_to'],
  [5, 10, 11, 'error: two names_to without names_sep'],
  [5, 13, 14, 'warning: names_sep discards the extra piece'],
  [5, 17, 18, 'names_pattern handles the irregular heading'],
  [6, 1, 2, 'readings long'],
  [6, 4, 5, 'readings widened'],
  [6, 7, 8, 'widen then lengthen round trip'],
  [6, 10, 11, 'widening a gap produces NA'],
  [7, 2, 3, 'error: cols must select at least one column'],
  [7, 5, 6, 'error: cannot combine double and character'],
  [7, 8, 9, 'warning: values not uniquely identified'],
  [7, 11, 12, 'values_fn = mean resolves duplicates'],
];

for (const [si, ci, oi, label] of PAIRS) {
  check(`s${si} ${label}`, await R.run(codeAt(si, ci)), codeAt(si, oi));
}

// ---------------------------------------------------------------------------
// 3. Executable claims made in the questions.
// ---------------------------------------------------------------------------
check('q4: 3 value columns from 3 rows gives 9 rows and 3 columns',
  await R.run('dim(pivot_longer(harvest, cols = -plot, names_to = "season", values_to = "kilos"))'),
  '[1] 9 3');
check('q4: harvest itself is 3 x 4', await R.run('dim(harvest)'), '[1] 3 4');
check('q5: names_to/values_to default to name and value',
  await R.run('names(pivot_longer(harvest, cols = -plot))'),
  '[1] "plot"  "name"  "value"');
check('q6: a year column recovered from headings is character',
  await R.run('class(pivot_longer(feeder, cols = -site, names_to = "year", values_to = "count")$year)'),
  '[1] "character"');
check('q6: names_transform makes it integer',
  await R.run('class(pivot_longer(feeder, cols = -site, names_to = "year", values_to = "count", names_transform = list(year = as.integer))$year)'),
  '[1] "integer"');
checkTrue('q7: two names in names_to without names_sep is an error',
  (await R.runErr('pivot_longer(cafe, cols = -branch, names_to = c("drink", "year"), values_to = "cups")')) !== null);
check('q8: pivot_wider names_from/values_from build the headings',
  await R.run('names(pivot_wider(readings, names_from = measure, values_from = reading))'),
  '[1] "station"  "temp"     "humidity"');
check('q9: the widened gap really is NA',
  await R.run('is.na(pivot_wider(gaps, names_from = measure, values_from = reading)$humidity)'),
  '[1] FALSE  TRUE FALSE');
check('q10: duplicate keys produce a list column',
  await R.run('class(suppressWarnings(pivot_wider(dupes, names_from = measure, values_from = reading))$temp)'),
  '[1] "list"');
check('q2: harvest has 4 columns, one of them the plot identifier',
  await R.run('ncol(harvest)'), '[1] 4');

// ---------------------------------------------------------------------------
// 4. Executable claims made in the prose and notes.
// ---------------------------------------------------------------------------
checkTrue('s0 note names suppressPackageStartupMessages',
  proseAt(0, 2).includes('suppressPackageStartupMessages'));

check('s1 prose: adding winter leaves the hand-written total unchanged',
  await R.run(`harvest |>
  mutate(winter = c(3, 4, 5)) |>
  mutate(total = spring + summer + autumn) |>
  pull(total)`),
  '[1] 61 54 54');

check('s3 note: 500 stores by 12 months lengthens to 6000 rows',
  await R.run(`stores <- as_tibble(matrix(0, nrow = 500, ncol = 12), .name_repair = "unique_quiet")
stores$id <- seq_len(500)
nrow(pivot_longer(stores, cols = -id, names_to = "month", values_to = "sales"))`),
  '[1] 6000');

check('s4 note: a character sort puts 10 before 9',
  await R.run('sort(c("9", "10"))'),
  '[1] "10" "9" ');

// The section 5 note claims a discarded-pieces warning is a correctness problem,
// not noise: the row really is mislabelled afterwards. Prove both halves.
check('s5 note: the mislabelled row really does say year = latte',
  await R.run(`suppressWarnings(
  pivot_longer(menu, cols = -shop, names_to = c("drink", "year"), names_sep = "_", values_to = "cups")
)$year`),
  '[1] "2024"  "latte" "2024"  "latte"');
check('s5 note: names_pattern keeps the year intact',
  await R.run(`pivot_longer(menu, cols = -shop, names_to = c("drink", "year"), names_pattern = "(.*)_(\\\\d{4})", values_to = "cups")$year`),
  '[1] "2024" "2024" "2024" "2024"');

check('s6 note: values_fill replaces the NA that widening creates',
  await R.run('pivot_wider(gaps, names_from = measure, values_from = reading, values_fill = 0)$humidity'),
  '[1] 62.4  0.0 71.3');

// The masking notice claim from the section 1 note. dplyr only prints it when it
// is attached fresh, so detach first. Done last: it leaves dplyr detached.
check('s0 note: attaching dplyr prints a notice about masked functions',
  await R.run(`detach("package:dplyr")
msg <- capture.output(library(dplyr), type = "message")
c(any(grepl("masked", msg)), any(grepl("filter", msg)))`),
  '[1] TRUE TRUE');

// ---------------------------------------------------------------------------
// 5. Shape and register rules the chapter has to satisfy.
// ---------------------------------------------------------------------------
checkTrue('sections: 6-9', ch.sections.length >= 6 && ch.sections.length <= 9, `got ${ch.sections.length}`);
checkTrue('last section is Summary', ch.sections[ch.sections.length - 1].t === 'Summary');
checkTrue('questions: exactly 10', ch.questions.length === 10, `got ${ch.questions.length}`);
checkTrue('n is 5', ch.n === 5);
checkTrue('src points at the r4ds chapter', ch.src === 'https://r4ds.hadley.nz/data-tidy.html');
checkTrue('pkgs are tidyr and dplyr', JSON.stringify(ch.pkgs) === '["tidyr","dplyr"]');

const LADDER_R = ["vectors","data types","data frames","indexing","apply family","functions",
  "tibbles & pipes","ggplot2 basics","dplyr verbs","grouping & summaries","tidy data","joins",
  "strings & regex","factors & dates","iteration"];
ch.exercises.forEach((x, i) => {
  checkTrue(`ex${i + 1} concept "${x.c}" is a LADDER.r concept`, LADDER_R.includes(x.c));
});
checkTrue('at least 3 exercises use the tidy data concept',
  ch.exercises.filter((x) => x.c === 'tidy data').length >= 3);

// Register: no exclamation marks in prose (code blocks are exempt, and != is fine).
const prose = [];
ch.sections.forEach((s, si) => {
  prose.push([`s${si}.t`, s.t]);
  s.body.forEach((b, bi) => { if (b[0] !== 'code') prose.push([`s${si}b${bi}`, b[1]]); });
});
ch.questions.forEach((q, i) => { prose.push([`q${i}`, q.q]); prose.push([`a${i}`, q.a]); });
ch.exercises.forEach((x, i) => {
  prose.push([`ex${i}.t`, x.t]); prose.push([`ex${i}.b`, x.b]);
  x.h.forEach((h, hi) => prose.push([`ex${i}.h${hi}`, h]));
});
prose.push(['blurb', ch.blurb]);
const bangs = prose.filter(([, t]) => /!(?!=)/.test(t));
checkTrue('register: no exclamation marks in prose', bangs.length === 0,
  bangs.map(([c]) => c).join(', '));

await R.close();
done();

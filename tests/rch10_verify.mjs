// Verifies R book chapter 10 (book/r10.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r10.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (samples, clean, fit, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch10_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r10.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r10;

const { check, checkTrue, done } = makeChecker('rch10');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 10', CH.n === 10);
checkTrue('title is "Exploratory data analysis"', CH.title === 'Exploratory data analysis');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/EDA.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists ggplot2, tibble and dplyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'ggplot2,tibble,dplyr');
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
checkTrue('every exercise is a dplyr verbs or grouping & summaries drill',
  CH.exercises.every((e) => e.c === 'dplyr verbs' || e.c === 'grouping & summaries'),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r10' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 11 (communication)',
  /communication/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', src.indexOf('!') === -1,
  'found at index ' + src.indexOf('!'));

// ------------------------------------------------------------- helpers ----
const section = (title) => {
  const s = CH.sections.find((x) => x.t === title);
  if (!s) throw new Error('no such section: ' + title);
  return s;
};
const codes = (title) => section(title).body.filter((b) => b[0] === 'code').map((b) => b[1]);

const R = await makeR(CH.pkgs);

// Run code block i of a section and diff against block i+1 of the same section.
const pair = async (title, i, label) => {
  const c = codes(title);
  check(label || (title + ' [' + i + ']'), await R.run(c[i]), c[i + 1]);
};
// Run a code block that is shown with no output block after it.
const silent = async (title, i, label) => {
  const c = codes(title);
  check(label || (title + ' [' + i + '] silent'), await R.run(c[i]), '');
};

// ------------------------------------------------- chapter code blocks ----
const S1 = 'Questions worth asking';
const S2 = 'Variation';
const S3 = 'Typical values';
const S4 = 'Unusual values';
const S5 = 'Missing values';
const S6 = 'Covariation: a category and a number';
const S7 = 'Two categories, and two numbers';
const S8 = 'Patterns and models';

await silent(S1, 0, 's1 suppressed library() calls print nothing');
await pair(S1, 1, 's1 samples tibble prints 10 of 30 rows');
await pair(S1, 3, 's1 glimpse turns the table on its side');

await pair(S2, 0, 's2 count of a categorical column');
await pair(S2, 2, 's2 numeric summary exposes two impossible values');
await pair(S2, 4, 's2 one outlier makes 19 bins, 15 of them empty');

await pair(S3, 0, 's3 cut_width bins drop the empty intervals');
await pair(S3, 2, 's3 .drop = FALSE keeps all 19 levels');
await pair(S3, 4, 's3 narrower window shows three clumps');

await pair(S4, 0, 's4 five-number summary');
await pair(S4, 2, 's4 whole rows of the unusual values');
await pair(S4, 4, 's4 faults replaced with NA, median unmoved');

await pair(S5, 0, 's5 mean is NA until na.rm');
await pair(S5, 2, 's5 gaps counted per group');
await pair(S5, 4, 's5 complementary filters do not add up to nrow');
await pair(S5, 6, 's5 ggplot warns about the rows it removed');

await pair(S6, 0, 's6 grouped median and IQR');
await pair(S6, 2, 's6 boxplot stat computes the same medians');
await pair(S6, 4, 's6 groups ordered by the thing measured');

await pair(S7, 0, 's7 cross-tabulation in tidy form');
await pair(S7, 2, 's7 counts turned into within-group shares');
await pair(S7, 4, 's7 correlation of the two numeric columns');
await pair(S7, 6, 's7 binned cross-count leaves two cells empty');

await pair(S8, 0, 's8 line coefficients and r squared');
await pair(S8, 2, 's8 residuals still carry a group effect');
await pair(S8, 4, 's8 range of the residuals');

// ------------------------------------------- executable prose/question claims ----
// s1 note: a plot object printed on its own produces no text in this runtime.
check('claim: a plot with nothing to warn about prints no text',
  await R.run('ggplot(samples, aes(x = pond)) + geom_bar()'), '');
// s2 note / question 2: 19 bins, 14 empty, and 25 of the 30 samples in two bars.
check('claim: 19 bins, 14 empty, two bars holding 25 of the 30 samples',
  await R.run('nrow(ggplot_build(h)$data[[1]])\nsum(ggplot_build(h)$data[[1]]$count == 0)\nsum(sort(ggplot_build(h)$data[[1]]$count, decreasing = TRUE)[1:2])'),
  '[1] 19\n[1] 14\n[1] 25');
// s4 prose / question 5: the median is unchanged by removing the two faults.
check('claim: the median survives the faults, the mean and range do not',
  await R.run('identical(median(samples$temp_c), median(clean$temp_c, na.rm = TRUE))\nidentical(mean(samples$temp_c), mean(clean$temp_c, na.rm = TRUE))'),
  '[1] TRUE\n[1] FALSE');
// s5 prose / question 6: the 4 rows missing from both filters are the NAs.
check('claim: the rows in neither filter are exactly the missing ones',
  await R.run('nrow(samples) - nrow(filter(samples, clarity_cm > 60)) -\n  nrow(filter(samples, clarity_cm <= 60))\nsum(is.na(samples$clarity_cm))'),
  '[1] 4\n[1] 4');
// s5 prose: the 2 rows ggplot removed are the two sensor faults.
check('claim: the 2 removed rows are the NA temperatures',
  await R.run('sum(is.na(clean$temp_c))'), '[1] 2');
// s6 prose: the boxplot middles equal the grouped medians.
check('claim: boxplot middles equal the summarise medians',
  await R.run('suppressWarnings(identical(\n  ggplot_build(b)$data[[1]]$middle,\n  as.numeric((clean |> group_by(pond) |>\n    summarise(m = median(temp_c, na.rm = TRUE)) |> arrange(pond))$m)\n))'),
  '[1] TRUE');
// s6 prose: the gaps between ponds are three to four times the spread within one.
check('claim: between-pond gaps are 3-4x the within-pond IQRs',
  await R.run('meds <- (clean |> group_by(pond) |>\n  summarise(m = median(temp_c, na.rm = TRUE)) |> arrange(pond))$m\nround(diff(meds), 1)\nround(max((clean |> group_by(pond) |>\n  summarise(i = IQR(temp_c, na.rm = TRUE)))$i), 3)'),
  '[1] 4.0 3.4\n[1] 1.1');
// s7 prose: the weather shares span a narrow range across the three ponds.
check('claim: clear-weather shares run from 0.417 to 0.5',
  await R.run('shares <- samples |> count(pond, weather) |> group_by(pond) |>\n  mutate(s = round(n / sum(n), 3)) |> ungroup() |> filter(weather == "clear")\nrange(shares$s)'),
  '[1] 0.417 0.500');
// s7 prose: 24 rows have both readings, and all of them fall on the diagonal.
check('claim: all 24 complete rows agree on both thresholds',
  await R.run('ok <- filter(clean, complete.cases(temp_c, clarity_cm))\nnrow(ok)\nsum((ok$temp_c > 16) == (ok$clarity_cm > 60))'),
  '[1] 24\n[1] 24');
// s8 note: lm() drops the incomplete rows, so residuals are shorter than the table.
check('claim: residuals are shorter than the table lm was given',
  await R.run('length(residuals(fit))\nnrow(clean)'), '[1] 24\n[1] 30');
// s8 prose: the group means are small next to the spread of the residuals.
check('claim: group residual means are far smaller than the residual range',
  await R.run('gm <- (resids |> group_by(pond) |> summarise(m = mean(resid)))$m\nround(max(abs(gm)), 2)\nround(diff(range(residuals(fit))), 2)'),
  '[1] 0.89\n[1] 16.6');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Two readings that do not belong
`suppressMessages(library(dplyr))
library(tibble)

gauges <- tibble(
  station = c("A1", "A2", "A3", "B1", "B2", "B3",
              "C1", "C2", "C3", "D1", "D2", "D3"),
  reading = c(4.2, 4.6, 4.1, 5.0, 4.8, 512.0, 4.4, 4.9, 0.0, 5.2, 4.7, 4.5)
)

gauges |>
  filter(reading > 10 | reading < 1) |>
  arrange(reading)`,
// 2 — Middle and spread per field
`suppressMessages(library(dplyr))
library(tibble)

harvest <- tibble(
  field = c("east", "east", "east", "east", "north", "north",
            "north", "west", "west", "west", "west", "west"),
  tonnes = c(3.2, 4.1, 3.8, 3.5, 5.6, 5.1, 6.0, 2.4, 2.9, 2.2, 3.1, 2.6)
)

harvest |>
  group_by(field) |>
  summarise(n = n(), med = median(tonnes), iqr = IQR(tonnes)) |>
  arrange(field)`,
// 3 — Counts that cannot be compared
`suppressMessages(library(dplyr))
library(tibble)

tickets <- tibble(
  line = c("blue", "blue", "blue", "blue", "blue",
           "green", "green", "green", "red", "red"),
  fare = c("adult", "adult", "child", "child", "adult",
           "adult", "child", "adult", "child", "adult")
)

tickets |>
  count(line, fare) |>
  group_by(line) |>
  mutate(share = round(n / sum(n), 3)) |>
  ungroup() |>
  arrange(line, fare)`,
// 4 — Where the gaps are
`suppressMessages(library(dplyr))
library(tibble)

loggers <- tibble(
  site = c("dune", "dune", "dune", "dune", "fen", "fen", "fen", "fen"),
  humidity = c(62, NA, 58, 65, 81, 79, NA, NA)
)

loggers |>
  group_by(site) |>
  summarise(
    n = n(),
    gaps = sum(is.na(humidity)),
    mean_ok = round(mean(humidity, na.rm = TRUE), 2)
  ) |>
  arrange(site)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// The reference solution above lives in this file, so a drifting exercise BRIEF
// would otherwise go unnoticed: the solution would still produce o while telling
// the learner to build something else. Bind the two by requiring every number the
// solution puts in a c() vector or a named argument to be named in the brief.
const solutionNumbers = (code) => {
  const nums = new Set();
  for (const m of code.matchAll(/\bc\(([^()]*)\)/g))
    for (const n of m[1].matchAll(/-?\d+(?:\.\d+)?/g)) nums.add(n[0]);
  for (const m of code.matchAll(/\b[a-zA-Z._][\w.]*\s*=\s*(-?\d+(?:\.\d+)?)/g)) nums.add(m[1]);
  return [...nums];
};
for (let i = 0; i < CH.exercises.length; i++) {
  const missing = solutionNumbers(SOLUTIONS[i]).filter((n) => !CH.exercises[i].b.includes(n));
  checkTrue('exercise ' + (i + 1) + ' brief names every number its solution uses',
    missing.length === 0, 'missing from the brief: ' + missing.join(', '));
}

// A grader that only ever passes is worthless: prove wrong answers miss.
// Exercise 1: and instead of or keeps nothing.
const wrong1 = await R.run(SOLUTIONS[0].replace('reading > 10 | reading < 1', 'reading > 10 & reading < 1'));
checkTrue('exercise 1 rejects and in place of or', wrong1 !== CH.exercises[0].o, wrong1);
// Exercise 2: mean is not median.
const wrong2 = await R.run(SOLUTIONS[1].replace('med = median(tonnes)', 'med = mean(tonnes)'));
checkTrue('exercise 2 rejects the mean', wrong2 !== CH.exercises[1].o, wrong2);
// Exercise 3: forgetting group_by divides by the table total, not the line total.
const wrong3 = await R.run(SOLUTIONS[2].replace('  group_by(line) |>\n', ''));
checkTrue('exercise 3 rejects shares taken over the whole table', wrong3 !== CH.exercises[2].o, wrong3);
// Exercise 4: without na.rm every mean collapses to NA.
const wrong4 = await R.run(SOLUTIONS[3].replace('mean(humidity, na.rm = TRUE)', 'mean(humidity)'));
checkTrue('exercise 4 rejects a mean without na.rm', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

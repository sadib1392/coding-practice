// Verifies R book chapter 18 (book/r18.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r18.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (moisture, inspections, plot_owner, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch18_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r18.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r18;

const { check, checkTrue, done } = makeChecker('rch18');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 18', CH.n === 18);
checkTrue('title is "Missing values"', CH.title === 'Missing values');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/missing-values.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists tibble, dplyr and tidyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'tibble,dplyr,tidyr');
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
checkTrue('every exercise concept is data types or tidy data',
  CH.exercises.every((e) => e.c === 'data types' || e.c === 'tidy data'),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r18' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 19 (joins)',
  /joins/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', src.includes('!') === false,
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
const S1 = 'Two kinds of missing';
const S2 = 'What NA does to a calculation';
const S3 = 'Carrying the last observation forward';
const S4 = 'Sentinels, defaults, and NaN';
const S5 = 'Implicit missing values';
const S6 = 'Completing the grid';
const S7 = 'Missing rows in joins, and empty groups';

await silent(S1, 0, 's1 attaching the three packages prints nothing');
await pair(S1, 1, 's1 the moisture tibble prints');
await pair(S1, 3, 's1 row count, NA count, and rows per plot');

await pair(S2, 0, 's2 NA propagates through arithmetic and comparison');
await pair(S2, 2, 's2 comparing a column against NA gives NA');
await pair(S2, 4, 's2 na.rm drops missing values first');
await pair(S2, 6, 's2 is.na, its sum, and its positions');
await pair(S2, 8, 's2 typed NA values');
await pair(S2, 10, 's2 finding and dropping missing rows');
await pair(S2, 12, 's2 sort discards NA, arrange parks it last');

await pair(S3, 0, 's3 the inspections tibble prints NA in angle brackets');
await pair(S3, 2, 's3 fill carries the last observation forward');
await pair(S3, 4, 's3 filling upward gives a different table');

await pair(S4, 0, 's4 na_if converts a sentinel');
await pair(S4, 2, 's4 coalesce takes the first non-missing value');
await pair(S4, 4, 's4 replace_na inside a data frame');
await pair(S4, 6, 's4 NaN is separate but counts as missing');
await pair(S4, 8, 's4 an all-missing sum returns 0');

await pair(S5, 0, 's5 pivot_wider exposes the implicit gap');
await pair(S5, 2, 's5 pivoting back gives nine rows');
await pair(S5, 4, 's5 values_drop_na throws the gaps away');

await pair(S6, 0, 's6 complete adds the missing combination');
await pair(S6, 2, 's6 complete with a fill value');
await pair(S6, 4, 's6 full_seq covers values absent from the data');

await pair(S7, 0, 's7 anti_join both ways finds both unmatched sides');
await pair(S7, 2, 's7 left_join turns a mismatch into an explicit NA');
await pair(S7, 4, 's7 table reports the empty factor level');
await pair(S7, 6, 's7 count drops the empty level unless .drop is FALSE');
await pair(S7, 8, 's7 group_by takes the same argument');

// ------------------------------------------- executable prose/question claims ----
// s1 note / question 1: the implicit gap is invisible to a count of NA values.
check('claim: 8 rows, 2 explicit NA, but 9 combinations expected',
  await R.run('nrow(moisture)\nsum(is.na(moisture$reading))\nlength(unique(moisture$plot)) * length(unique(moisture$week))'),
  '[1] 8\n[1] 2\n[1] 9');
// s5 prose / question 7: pivoting takes the NA count from two to three.
check('claim: pivoting wider raises the NA count from 2 to 3',
  await R.run('sum(is.na(moisture$reading))\nsum(is.na(pivot_wider(moisture, names_from = week, values_from = reading)))'),
  '[1] 2\n[1] 3');
// s6 prose: complete() turns 8 rows into 9.
check('claim: complete turns 8 rows into 9',
  await R.run('nrow(moisture)\nnrow(complete(moisture, plot, week))'), '[1] 8\n[1] 9');
// s2 prose / question 2: filtering on == NA selects no rows and does not error.
const eqNA = await R.runRaw('nrow(filter(moisture, reading == NA))');
checkTrue('claim: filtering on == NA selects no rows without erroring',
  eqNA.errored === false && eqNA.output === '[1] 0', eqNA.output);
// s2 note: arrange parks NA last in BOTH directions, sort needs na.last to keep it.
check('claim: arrange puts NA last regardless of direction',
  await R.run('arrange(tibble(x = c(3, NA, 1)), desc(x))$x'), '[1]  3  1 NA');
check('claim: sort keeps NA only when told to',
  await R.run('sort(c(3, NA, 1))\nsort(c(3, NA, 1), na.last = TRUE)'), '[1] 1 3\n[1]  1  3 NA');
// s4 prose: the raw sentinel mean is a large negative number nobody would spot as invalid.
check('claim: the unconverted sentinel mean is badly wrong',
  await R.run('mean(c(12, -99, 8, -99, 15))'), '[1] -32.6');
// s4 prose / question 4: na.rm over an all-missing vector differs between sum and mean.
check('claim: sum returns 0 and mean returns NaN on all-missing input',
  await R.run('sum(c(NA, NA), na.rm = TRUE)\nmean(c(NA_real_, NA_real_), na.rm = TRUE)'),
  '[1] 0\n[1] NaN');
// s5 note: values_drop_na loses the explicit gaps as well as the implicit one.
check('claim: values_drop_na leaves 6 rows from an original 8',
  await R.run('moisture |>\n  pivot_wider(names_from = week, values_from = reading) |>\n  pivot_longer(cols = c("1", "2", "3"), names_to = "week", values_to = "reading", values_drop_na = TRUE) |>\n  nrow()'),
  '[1] 6');
// s6 note / question 8: complete() produces the product of the distinct values.
check('claim: completing 40 by 500 distinct values gives 20000 rows',
  await R.run('sparse <- tibble(a = c(1, 40), b = c(1, 500))\nnrow(complete(sparse, a = full_seq(c(1, 40), 1), b = full_seq(c(1, 500), 1)))'),
  '[1] 20000');
// s7 prose / question 9: the two anti_joins answer two different questions.
check('claim: anti_join each way returns a different single row',
  await R.run('anti_join(distinct(moisture, plot), plot_owner, by = "plot")$plot\nanti_join(plot_owner, distinct(moisture, plot), by = "plot")$plot'),
  '[1] "C"\n[1] "D"');
// s7 note / question 10: table keeps the empty level, count drops it.
check('claim: table keeps the empty level that count drops',
  await R.run('as.numeric(table(soil))\nnrow(count(beds, soil))\nnrow(count(beds, soil, .drop = FALSE))'),
  '[1] 2 1 0\n[1] 2\n[1] 3');
// s3 note: fill() depends on row order, so an arrange() first changes the answer.
check('claim: fill after a reordering gives a different column',
  await R.run('inspections |>\n  arrange(desc(bay)) |>\n  fill(inspector) |>\n  arrange(bay) |>\n  pull(inspector)'),
  '[1] "Nadia" "Omar"  "Omar"  "Omar"  "Priya" "Priya"');

// ------------------------------------------------ exercise reference solutions ----
// dplyr prints an attach banner on the FIRST attach in a session and nothing
// afterwards, so any solution that needs it uses suppressMessages() and the
// transcript is the same on a resubmission. tibble and tidyr attach silently.
const SOLUTIONS = [
// 1 — What NA does to arithmetic
`depths <- c(18, NA, 24, NA, 30)

sum(depths)
sum(depths, na.rm = TRUE)
sum(is.na(depths))
depths > 20
is.na(depths)`,
// 2 — Carry the crew forward
`library(tibble)
library(tidyr)

shifts <- tibble(
  crew = c("Ada", NA, NA, "Bo", NA),
  bay = c(1, 2, 3, 4, 5)
)

fill(shifts, crew)`,
// 3 — Every hive, every week
`library(tibble)
library(tidyr)
suppressMessages(library(dplyr))

counts <- tibble(
  hive = c("north", "north", "south"),
  week = c(1, 2, 2),
  bees = c(120, 135, 98)
)

counts |>
  complete(hive, week) |>
  arrange(hive, week)`,
// 4 — Sentinel to missing
`suppressMessages(library(dplyr))

rainfall <- c(7.5, -999, 6.2, -999, 8.1)
clean <- na_if(rainfall, -999)

clean
sum(is.na(clean))
mean(clean, na.rm = TRUE)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// Exercises must also be idempotent: submitting the same answer twice in one
// WebR session has to produce the identical transcript.
for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' is idempotent on resubmission',
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[0].replace('sum(depths)\n', ''));
checkTrue('exercise 1 rejects a missing first line', wrong1 !== CH.exercises[0].o, wrong1);
const wrong2 = await R.run(SOLUTIONS[1].replace('fill(shifts, crew)', 'fill(shifts, crew, .direction = "up")'));
checkTrue('exercise 2 rejects filling in the wrong direction', wrong2 !== CH.exercises[1].o, wrong2);
const wrong3 = await R.run(SOLUTIONS[2].replace('complete(hive, week)', 'complete(hive, week, fill = list(bees = 0))'));
checkTrue('exercise 3 rejects filling the new row with 0', wrong3 !== CH.exercises[2].o, wrong3);
const wrong4 = await R.run(SOLUTIONS[3].replace('mean(clean, na.rm = TRUE)', 'mean(rainfall)'));
checkTrue('exercise 4 rejects the mean of the unconverted vector', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

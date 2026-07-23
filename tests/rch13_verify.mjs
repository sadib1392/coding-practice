// Verifies R book chapter 13 (book/r13.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r13.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (pool, daily, scores, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch13_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r13.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r13;

const { check, checkTrue, done } = makeChecker('rch13');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 13', CH.n === 13);
checkTrue('title is "Numbers"', CH.title === 'Numbers');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/numbers.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists readr, dplyr and tibble',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'readr,dplyr,tibble', String(CH.pkgs));
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
checkTrue('every exercise is vectors or grouping & summaries',
  CH.exercises.every((e) => e.c === 'vectors' || e.c === 'grouping & summaries'),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('both concepts are represented',
  CH.exercises.some((e) => e.c === 'vectors') &&
  CH.exercises.some((e) => e.c === 'grouping & summaries'));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r13' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 14 (Strings)',
  /Strings/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', !src.includes('!'),
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
const S1 = 'Numbers that arrive as text';
const S2 = 'Counting';
const S3 = 'Arithmetic and recycling';
const S4 = 'Integer division, remainders, and logarithms';
const S5 = 'Rounding';
const S6 = 'Cutting numbers into bins';
const S7 = 'Cumulative aggregates, ranks, and offsets';
const S8 = 'Numeric summaries';

await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 parse_double');
await pair(S1, 3, 's1 parse_number strips symbols');
await pair(S1, 5, 's1 both parsers return numeric');
await pair(S1, 7, 's1 as.numeric warns and gives NA');

await pair(S2, 0, 's2 pool tibble prints');
await pair(S2, 2, 's2 count by session');
await pair(S2, 4, 's2 count with sort');
await pair(S2, 6, 's2 count with wt');
await pair(S2, 8, 's2 group_by and summarise');
await pair(S2, 10, 's2 n_distinct');

await pair(S3, 0, 's3 elementwise product');
await pair(S3, 2, 's3 recycling a length-one vector');
await pair(S3, 4, 's3 recycling a whole multiple is silent');
await pair(S3, 6, 's3 recycling a non-multiple warns');
await pair(S3, 8, 's3 pmin/pmax versus min');

await pair(S4, 0, 's4 integer division and remainder');
await pair(S4, 2, 's4 negative integer division');
await pair(S4, 4, 's4 remainder takes the sign of the divisor');
await pair(S4, 6, 's4 dividing by zero gives Inf and NaN');
await pair(S4, 8, 's4 logarithms');

await pair(S5, 0, 's5 round halves to even');
await pair(S5, 2, 's5 the whole run of halves');
await pair(S5, 4, 's5 digits, negative digits, and 2.675');
await pair(S5, 6, 's5 floating point equality');
await pair(S5, 8, 's5 floor, ceiling, trunc');
await pair(S5, 10, 's5 rounding to the nearest five');

await pair(S6, 0, 's6 cut with default labels');
await pair(S6, 2, 's6 cut with labels, class, and table');
await pair(S6, 4, 's6 right = FALSE flips the intervals');
await pair(S6, 6, 's6 include.lowest rescues the lowest break');

await pair(S7, 0, 's7 cumulative sum, max, min');
await pair(S7, 2, 's7 three ranking functions over ties');
await pair(S7, 4, 's7 ranking largest first with desc');
await pair(S7, 6, 's7 lag, lead, and row-to-row change');
await pair(S7, 8, 's7 lag with n and default');
await pair(S7, 10, 's7 consecutive_id numbers runs');

await pair(S8, 0, 's8 centre and spread');
await pair(S8, 2, 's8 quantile');
await pair(S8, 4, 's8 NA stops a summary until na.rm');
await pair(S8, 6, 's8 sum and mean over a comparison');
await pair(S8, 8, 's8 grouped summary');

// ------------------------------------------- executable prose/question claims ----
// s1 prose / question 1: parse_number keeps 18, it does not make a proportion.
check('claim: parse_number("18%") is 18', await R.run('parse_number("18%")'), '[1] 18');
// s1 note / question 2: as.numeric turns unreadable text into NA rather than stopping.
check('claim: as.numeric on a currency string is NA',
  await R.run('suppressWarnings(is.na(as.numeric("£3.50")))'), '[1] TRUE');
// s2 note: n() outside a dplyr verb is an error, not a number.
checkTrue('claim: n() at the console errors', (await R.runErr('n()')) !== null);
// s2 prose / question 3: count with wt totals the column instead of counting rows.
check('claim: wt turns the tally into a total',
  await R.run('sum(count(pool, session, wt = swimmers)$n)\nsum(pool$swimmers)'),
  '[1] 112\n[1] 112');
// s3 prose / question 4: a whole-multiple recycle keeps the longer length and stays quiet.
check('claim: recycling returns the longer length',
  await R.run('length(c(1, 2, 3, 4, 5, 6) * c(10, 100))'), '[1] 6');
// s4 note / question 5: the R remainder makes the odd-number test work on negatives.
check('claim: -7 %% 2 is 1, so the odd test holds for negatives',
  await R.run('(-7) %% 2 == 1'), '[1] TRUE');
// s4 prose: the whole part times the divisor plus the remainder returns the value.
check('claim: quotient times divisor plus remainder rebuilds the value',
  await R.run('(-7 %/% 2) * 2 + (-7 %% 2)'), '[1] -7');
// s5 prose / question 6: negative digits round left of the decimal point.
check('claim: round(1234.567, -2) is 1200', await R.run('round(1234.567, -2)'), '[1] 1200');
// s5 note / question 7: == fails on computed doubles, near() does not.
check('claim: == fails and near() succeeds on the same comparison',
  await R.run('0.1 + 0.2 == 0.3\nnear(0.1 + 0.2, 0.3)'), '[1] FALSE\n[1] TRUE');
// s5 prose: trunc matches floor going up and ceiling going down.
check('claim: trunc matches floor for positives and ceiling for negatives',
  await R.run('trunc(2.7) == floor(2.7)\ntrunc(-2.7) == ceiling(-2.7)'), '[1] TRUE\n[1] TRUE');
// s6 prose: four breaks make three intervals.
check('claim: four break points produce three levels',
  await R.run('nlevels(cut(depth_cm, breaks = c(0, 100, 150, 250)))'), '[1] 3');
// s6 note / question 8: values outside the break range become NA silently.
check('claim: a value past the top break becomes NA',
  await R.run('is.na(cut(300, breaks = c(0, 100, 150, 250)))'), '[1] TRUE');
// s7 prose / question 9: row_number never ties, so it permutes 1..n.
check('claim: row_number is a permutation of 1 to n',
  await R.run('all(sort(row_number(scores)) == 1:5)'), '[1] TRUE');
// s7 prose: cumsum ends where sum lands.
check('claim: the last cumulative sum equals the total',
  await R.run('cumsum(daily)[length(daily)] == sum(daily)\nsum(daily)'), '[1] TRUE\n[1] 112');
// s7 prose / question 10: the first row-to-row change is NA.
check('claim: the first difference is NA',
  await R.run('is.na((daily - lag(daily))[1])'), '[1] TRUE');
// s8 note: the printed 21.7 is a display width, not the stored value.
check('claim: the stored evening mean is not 21.7',
  await R.run('round(mean(pool$swimmers[pool$session == "evening"]), 5)'), '[1] 21.66667');
// s8 prose: mean over a comparison is the proportion satisfying it.
check('claim: mean of a comparison is a proportion',
  await R.run('mean(pool$swimmers > 10) == sum(pool$swimmers > 10) / nrow(pool)'), '[1] TRUE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Minutes and seconds
`elapsed <- c(95, 240, 61, 3725)

elapsed %/% 60
elapsed %% 60`,
// 2 — Running totals and standings
`suppressMessages(library(dplyr))

points <- c(6, 11, 6, 14, 9)

cumsum(points)
min_rank(desc(points))
dense_rank(points)`,
// 3 — Parcels per depot
`suppressMessages(library(dplyr))
library(tibble)

deliveries <- tibble(
  depot = c("north", "south", "north", "east", "south", "north"),
  parcels = c(12L, 9L, 4L, 21L, 15L, 8L)
)

deliveries |>
  count(depot, wt = parcels) |>
  arrange(depot)`,
// 4 — Firing time by glaze
`suppressMessages(library(dplyr))
library(tibble)

kiln <- tibble(
  glaze = c("ash", "ash", "ash", "salt", "salt", "tin", "tin"),
  hours = c(9.5, 11.25, 8.75, 14, 12.5, 6.5, 7.25)
)

kiln |>
  group_by(glaze) |>
  summarise(firings = n(), mean_hours = round(mean(hours), 1)) |>
  arrange(glaze)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[0].replace('%/% 60', '/ 60'));
checkTrue('exercise 1 rejects plain division', wrong1 !== CH.exercises[0].o, wrong1);
const wrong2 = await R.run(SOLUTIONS[1].replace('min_rank(desc(points))', 'min_rank(points)'));
checkTrue('exercise 2 rejects ranking the wrong way round', wrong2 !== CH.exercises[1].o, wrong2);
const wrong3 = await R.run(SOLUTIONS[2].replace('count(depot, wt = parcels)', 'count(depot)'));
checkTrue('exercise 3 rejects a tally instead of a total', wrong3 !== CH.exercises[2].o, wrong3);
const wrong4 = await R.run(SOLUTIONS[3].replace('round(mean(hours), 1)', 'mean(hours)'));
checkTrue('exercise 4 rejects the unrounded mean', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

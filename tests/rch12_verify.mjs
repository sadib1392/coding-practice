// Verifies R book chapter 12 (book/r12.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r12.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (readings above all). Every code block in this
// chapter is executed — nothing is shown output-free.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch12_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r12.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r12;

const { check, checkTrue, done } = makeChecker('rch12');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 12', CH.n === 12);
checkTrue('title is "Logical vectors"', CH.title === 'Logical vectors');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/logicals.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists dplyr and tibble',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'dplyr,tibble');
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
checkTrue('at least 3 exercises are vectors or data types',
  CH.exercises.filter((e) => e.c === 'vectors' || e.c === 'data types').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r12' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 13 (numbers)',
  /next chapter is numbers/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code. This
// chapter teaches negation with == FALSE and is.na() precisely so the file can
// hold to that; a note in section 1 names the two operators it avoids.
checkTrue('no exclamation marks anywhere in the chapter file', src.indexOf('!') === -1,
  'found at index ' + src.indexOf('!'));
checkTrue('section 1 discloses the negation and not-equal operators it avoids',
  CH.sections[0].body.some((b) => b[0] === 'note' && /negation operator/.test(b[1]) &&
    /not-equal operator/.test(b[1])));

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

// ------------------------------------------------- chapter code blocks ----
const S1 = 'Comparisons make logical vectors';
const S2 = 'Floating point comparison';
const S3 = 'Missing values';
const S4 = 'Boolean algebra';
const S5 = 'Summaries';
const S6 = 'Logical subsetting';
const S7 = 'Conditional transformations';

await pair(S1, 0, 's1 attaching dplyr prints the masking notice');
await pair(S1, 2, 's1 readings tibble prints');
await pair(S1, 4, 's1 two comparisons, NA where the input was NA');
await pair(S1, 6, 's1 mutate keeps the condition beside the data');
await pair(S1, 8, 's1 filter keeps the TRUE rows');
await pair(S1, 10, 's1 comparing to FALSE flips the vector and leaves NA');

await pair(S2, 0, 's2 0.1 plus 0.2 is not 0.3');
await pair(S2, 2, 's2 eighteen digits show the gap');
await pair(S2, 4, 's2 sqrt(2) squared is not 2');
await pair(S2, 6, 's2 near() answers close enough');
await pair(S2, 8, 's2 whole numbers compare exactly, decimals may not');

await pair(S3, 0, 's3 anything with NA in it is NA');
await pair(S3, 2, 's3 is.na finds the missing value');
await pair(S3, 4, 's3 filtering for the missing row');
await pair(S3, 6, 's3 keeping the matches and the unknowns');
await pair(S3, 8, 's3 comparing to NA gives zero rows and no error');

await pair(S4, 0, 's4 and/or with NA');
await pair(S4, 2, 's4 xor is exactly one of the two');
await pair(S4, 4, 's4 two columns combined element by element');
await pair(S4, 6, 's4 the bare number on the right of | makes everything TRUE');
await pair(S4, 8, 's4 both sides written out as comparisons');
await pair(S4, 10, 's4 %in% says the same thing once');
await pair(S4, 12, 's4 %in% matches NA where == cannot');

await pair(S5, 0, 's5 any and all over a vector with NA');
await pair(S5, 2, 's5 NA survives when it could decide the answer');
await pair(S5, 4, 's5 na.rm answers about the recorded values');
await pair(S5, 6, 's5 sum counts and mean gives a proportion');
await pair(S5, 8, 's5 the denominator is the recorded values');
await pair(S5, 10, 's5 count, share, and the missing count together');

await pair(S6, 0, 's6 bracket subsetting keeps an NA placeholder');
await pair(S6, 2, 's6 which() removes the ambiguity');
await pair(S6, 4, 's6 dropping the unknowns first');
await pair(S6, 6, 's6 filter already does what which does');

await pair(S7, 0, 's7 if_else leaves the unknown unknown');
await pair(S7, 2, 's7 the missing argument labels it');
await pair(S7, 4, 's7 case_when default sweeps up the NA row');
await pair(S7, 6, 's7 an is.na branch first fixes it');
await pair(S7, 8, 's7 if_else refuses mixed types');
await pair(S7, 10, 's7 case_when refuses mixed types');
await pair(S7, 12, 's7 case_when in a pipeline, ordered by station');

// ------------------------------------------- executable prose/question claims ----
// s1 prose / q1: a comparison keeps the length and the type is logical.
check('claim: a comparison returns six logical values',
  await R.run('length(readings$rain_mm > 5)\nclass(readings$rain_mm > 5)'),
  '[1] 6\n[1] "logical"');
// s1 prose: three rows leave the filter, only two of them are FALSE.
check('claim: of the three rows filter dropped, two are FALSE and one is NA',
  await R.run('sum(readings$rain_mm > 5, na.rm = TRUE)\nsum((readings$rain_mm > 5) == FALSE, na.rm = TRUE)\nsum(is.na(readings$rain_mm > 5))'),
  '[1] 3\n[1] 2\n[1] 1');
// q3: == cannot test for missingness, is.na can.
check('claim: NA == NA is unknown while is.na(NA) is TRUE',
  await R.run('is.na(NA == NA)\nis.na(NA)'), '[1] TRUE\n[1] TRUE');
// q5: the rule for when NA stops spreading.
check('claim: NA & FALSE is FALSE and NA | TRUE is TRUE',
  await R.run('NA & FALSE\nNA | TRUE\nNA & TRUE\nNA | FALSE'),
  '[1] FALSE\n[1] TRUE\n[1] NA\n[1] NA');
// q7: row four differs between == and %in%.
check('claim: row four is NA under == and FALSE under %in%',
  await R.run('(readings$rain_mm == 0 | readings$rain_mm == 12)[4]\n(readings$rain_mm %in% c(0, 12))[4]'),
  '[1] NA\n[1] FALSE');
// s5 prose: nothing recorded is over 25, and every recorded temperature clears 10.
check('claim: no recorded temperature is above 25 and all are above 10',
  await R.run('sum(readings$temp_c > 25, na.rm = TRUE)\nsum(readings$temp_c > 10, na.rm = TRUE)\nsum(is.na(readings$temp_c))'),
  '[1] 0\n[1] 5\n[1] 1');
// q9: the na.rm mean is three out of five, not three out of six.
check('claim: the share is three fifths, not three sixths',
  await R.run('mean(readings$rain_mm > 5, na.rm = TRUE) == 3 / 5\nmean(readings$rain_mm > 5, na.rm = TRUE) == 3 / 6'),
  '[1] TRUE\n[1] FALSE');
// s5 prose: without na.rm the summary is unknown.
check('claim: without na.rm the count and the share are NA',
  await R.run('sum(readings$rain_mm > 5)\nmean(readings$rain_mm > 5)'), '[1] NA\n[1] NA');
// s6 note / q4: same condition, four elements from a vector and three rows from a frame.
check('claim: bracket subsetting yields four, filter yields three',
  await R.run('length(readings$rain_mm[readings$rain_mm > 5])\nnrow(filter(readings, rain_mm > 5))'),
  '[1] 4\n[1] 3');
// s7 prose: the default branch is what catches the missing row.
check('claim: without an is.na branch the missing station is labelled heavy',
  await R.run('case_when(readings$rain_mm == 0 ~ "none", readings$rain_mm < 10 ~ "light", readings$rain_mm < 30 ~ "steady", .default = "heavy")[4]'),
  '[1] "heavy"');
// q2: near() is what == cannot do.
check('claim: == is FALSE and near() is TRUE for the same pair',
  await R.run('0.1 + 0.2 == 0.3\nnear(0.1 + 0.2, 0.3)'), '[1] FALSE\n[1] TRUE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Counting the clear days
`sightings <- c(4, 0, 9, NA, 12, 3)

sightings > 3
sum(sightings > 3, na.rm = TRUE)
mean(sightings > 3, na.rm = TRUE)
length(sightings[which(sightings > 3)])
sort(sightings[which(sightings > 3)])`,
// 2 — Almost the same number
`suppressMessages(library(dplyr))

x <- 0.1 + 0.2

x == 0.3
near(x, 0.3)
print(x, digits = 18)`,
// 3 — Handling the unknowns
`depths <- c(12, NA, 7, 20, NA, 15)

is.na(depths)
sum(is.na(depths))
sort(depths[is.na(depths) == FALSE])
mean(depths, na.rm = TRUE)`,
// 4 — Band the plots
`suppressMessages(library(dplyr))
library(tibble)

plots <- tibble(
  plot_id = c("p1", "p2", "p3", "p4", "p5"),
  yield_kg = c(0, 6, NA, 18, 11)
)

plots |>
  mutate(band = case_when(
    is.na(yield_kg) ~ "unrecorded",
    yield_kg == 0 ~ "none",
    yield_kg < 12 ~ "light",
    .default = "heavy"
  )) |>
  arrange(plot_id)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
{
  // Dropping na.rm turns both summaries into NA.
  const wrong = await R.run(SOLUTIONS[0].replace(/, na\.rm = TRUE/g, ''));
  checkTrue('exercise 1 rejects the version without na.rm', wrong !== CH.exercises[0].o, wrong);
}
{
  // Subsetting with the raw condition keeps an NA placeholder, so the count is 4.
  const wrong = await R.run(SOLUTIONS[0].replace(/which\(sightings > 3\)/g, 'sightings > 3'));
  checkTrue('exercise 1 rejects subsetting without which()', wrong !== CH.exercises[0].o, wrong);
}
{
  // == is the wrong tool for two doubles that have been through arithmetic.
  const wrong = await R.run(SOLUTIONS[1].replace('near(x, 0.3)', 'x == 0.3'));
  checkTrue('exercise 2 rejects == in place of near()', wrong !== CH.exercises[1].o, wrong);
}
{
  // With no is.na branch at all, .default swallows the missing row as "heavy".
  const wrong = await R.run(SOLUTIONS[3].replace('    is.na(yield_kg) ~ "unrecorded",\n', ''));
  checkTrue('exercise 4 rejects a case_when with no is.na branch',
    wrong !== CH.exercises[3].o, wrong);
}

await R.close();
done();

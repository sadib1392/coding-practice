// Verifies R book chapter 16 (book/r16.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r16.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Factor output is unusually easy to get subtly wrong by hand — the Levels
// line, the column widths in a table(), the difference between <fct> and <ord>
// in a tibble — so nothing below is written from memory. Every expected string
// is the chapter's own output block, and the diff is byte for byte.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (sizes, sizes_f, commutes, grades, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch16_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r16.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r16;

const { check, checkTrue, done } = makeChecker('rch16');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 16', CH.n === 16);
checkTrue('title is "Factors"', CH.title === 'Factors');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/factors.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists forcats, tibble and dplyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'forcats,tibble,dplyr');
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
checkTrue('at least 3 exercises are factors & dates',
  CH.exercises.filter((e) => e.c === 'factors & dates').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r16' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('the three hints of each exercise are distinct',
  CH.exercises.every((e) => new Set(e.h).size === 3));
checkTrue('summary points forward to R chapter 17 (Dates and times)',
  /Dates and times/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const S1 = 'Why a factor is not a character vector';
const S2 = 'Creating a factor';
const S3 = 'Counting, and converting back';
const S4 = 'A survey worth ordering';
const S5 = 'Modifying factor order';
const S6 = 'Modifying factor levels';
const S7 = 'Lumping rare levels';
const S8 = 'Ordered factors';

await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 sorting a character vector is alphabetical');

await pair(S2, 0, 's2 factor() with explicit levels');
await pair(S2, 2, 's2 levels() and sorting by level');
await pair(S2, 4, 's2 a factor is integer codes underneath');
await pair(S2, 6, 's2 a value outside the levels becomes NA');
await pair(S2, 8, 's2 default levels are the sorted unique values');

await pair(S3, 0, 's3 table() counts in level order');
await pair(S3, 2, 's3 as.numeric returns codes, not labels');
await pair(S3, 4, 's3 assigning an unknown level warns and gives NA');

await pair(S4, 0, 's4 the survey tibble prints with an fct column');
await pair(S4, 2, 's4 count() follows the level order');

await pair(S5, 0, 's5 fct_infreq orders by frequency');
await pair(S5, 2, 's5 fct_reorder orders by a summary of another column');
await pair(S5, 4, 's5 the same order computed by hand');
await pair(S5, 6, 's5 fct_relevel moves named levels to the front');
await pair(S5, 8, 's5 fct_rev turns the list around');

await pair(S6, 0, 's6 fct_recode renames without moving');
await pair(S6, 2, 's6 fct_collapse folds many levels onto one');
await pair(S6, 4, 's6 recoding an unknown level warns and changes nothing');
await pair(S6, 6, 's6 filtering rows keeps every level');
await pair(S6, 8, 's6 droplevels removes the empty ones');
await pair(S6, 10, 's6 fct_drop agrees with droplevels');

await pair(S7, 0, 's7 fct_count sorted by frequency');
await pair(S7, 2, 's7 fct_lump_n keeps the n most common');
await pair(S7, 4, 's7 fct_lump_min lumps by threshold');

await pair(S8, 0, 's8 ordered factor prints with less-than signs');
await pair(S8, 2, 's8 comparison and sorting on an ordered factor');
await pair(S8, 4, 's8 comparison on a plain factor warns and gives NA');
await pair(S8, 6, 's8 a tibble reports an ordered factor as ord');

// ------------------------------------------- executable prose/question claims ----
// s2 prose / question 5: omitting levels gives the sorted unique values.
check('claim: default levels are exactly the sorted unique values',
  await R.run('identical(levels(factor(sizes)), sort(unique(sizes)))'), '[1] TRUE');
// question 3: a factor and its source character vector sort differently.
check('claim: sorting a factor differs from sorting its character vector',
  await R.run('identical(as.character(sort(sizes_f)), sort(sizes))'), '[1] FALSE');
// s2 prose / question 2: the typo is one missing value, not a fourth level.
check('claim: the typo produces exactly one NA and no extra level',
  await R.run('sum(is.na(factor(c("small", "mediun", "large"), levels = size_levels)))\n' +
    'nlevels(factor(c("small", "mediun", "large"), levels = size_levels))'),
  '[1] 1\n[1] 3');
// s3 prose / question 4: as.numeric hands back positions in the level list.
check('claim: as.numeric on a factor returns level positions',
  await R.run('identical(as.numeric(years), c(1, 3, 2))'), '[1] TRUE');
// s1 prose: sizes_f is an unordered factor with three levels; mode has five.
check('claim: a plain factor is a factor and is not ordered',
  await R.run('is.factor(sizes_f)\nis.ordered(sizes_f)\nnlevels(commutes$mode)'),
  '[1] TRUE\n[1] FALSE\n[1] 5');
// s6 prose / question 8: filtering keeps levels, dropping removes them.
check('claim: filtering keeps five levels and dropping leaves two',
  await R.run('nlevels(kept)\nnlevels(small)'), '[1] 5\n[1] 2');
// s7 prose / question 9: lumping to two names leaves three levels, Other last.
check('claim: fct_lump_n leaves three levels with Other last',
  await R.run('nlevels(fct_lump_n(commutes$mode, n = 2))\n' +
    'levels(fct_lump_n(commutes$mode, n = 2))'),
  '[1] 3\n[1] "bike"  "bus"   "Other"');
// s8 prose / question 10: ordered adds a class without removing factor.
check('claim: an ordered factor is still a factor',
  await R.run('is.factor(grades)\nis.ordered(grades)'), '[1] TRUE\n[1] TRUE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Three membership tiers
`library(forcats)

tiers_f <- factor(c("bronze", "gold", "silver", "gold", "bronze", "gold"),
                  levels = c("bronze", "silver", "gold"))

tiers_f
levels(tiers_f)
table(tiers_f)`,
// 2 — A typo becomes a hole
`library(forcats)

ranks_f <- factor(c("low", "high", "mid", "hgh", "low"),
                  levels = c("low", "mid", "high"))

ranks_f
sort(ranks_f)
sum(is.na(ranks_f))`,
// 3 — Two ways to order the same routes
`library(forcats)
library(tibble)
suppressMessages(library(dplyr))

trips <- tibble(
  route = factor(c("north", "south", "north", "east", "south",
                   "north", "east", "east", "east")),
  km = c(4, 30, 5, 12, 28, 6, 14, 11, 20)
)

levels(fct_infreq(trips$route))
levels(fct_reorder(trips$route, trips$km))
count(trips, route)`,
// 4 — Boxes per crew
`library(forcats)
library(tibble)
suppressMessages(library(dplyr))

shifts <- tibble(
  crew = factor(c("dawn", "dusk", "dawn", "night", "dusk", "night", "dawn", "night"),
                levels = c("dawn", "dusk", "night")),
  boxes = c(40, 55, 44, 61, 52, 66, 38, 70)
)

shifts |>
  group_by(crew) |>
  summarise(total = sum(boxes), mid = median(boxes)) |>
  arrange(desc(total))`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
// Omitting levels gives the alphabetical default the exercise exists to avoid.
const wrong1 = await R.run(SOLUTIONS[0]
  .replace(',\n                  levels = c("bronze", "silver", "gold")', ''));
checkTrue('exercise 1 rejects the default alphabetical levels', wrong1 !== CH.exercises[0].o, wrong1);
// Spelling the typo correctly removes the NA the exercise is about.
const wrong2 = await R.run(SOLUTIONS[1].replace('"hgh"', '"high"'));
checkTrue('exercise 2 rejects a corrected typo', wrong2 !== CH.exercises[1].o, wrong2);
// fct_infreq and fct_reorder disagree here, which is the point of the exercise.
const wrong3 = await R.run(SOLUTIONS[2]
  .replace('levels(fct_reorder(trips$route, trips$km))', 'levels(fct_infreq(trips$route))'));
checkTrue('exercise 3 rejects the same ordering twice', wrong3 !== CH.exercises[2].o, wrong3);
// Sorting the other way changes the row order.
const wrong4 = await R.run(SOLUTIONS[3].replace('arrange(desc(total))', 'arrange(total)'));
checkTrue('exercise 4 rejects the wrong sort direction', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

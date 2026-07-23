// Verifies R book chapter 27 (book/r27.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r27.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (tide_cm, crates, voyage, hauls, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch27_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r27.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r27;

const { check, checkTrue, done } = makeChecker('rch27');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 27', CH.n === 27);
checkTrue('title is "A field guide to base R"', CH.title === 'A field guide to base R');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/base-R.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists tibble only',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'tibble');
checkTrue('section count is 6-9', CH.sections.length >= 6 && CH.sections.length <= 9,
  'got ' + CH.sections.length);
checkTrue('every section has a title and a body',
  CH.sections.every((s) => typeof s.t === 'string' && s.t.length > 0 && Array.isArray(s.body) && s.body.length > 0));
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
checkTrue('at least 2 exercises are indexing',
  CH.exercises.filter((e) => e.c === 'indexing').length >= 2,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('at least 1 exercise is apply family',
  CH.exercises.filter((e) => e.c === 'apply family').length >= 1,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, a brief, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r27' && typeof e.b === 'string' && e.b.length > 40 &&
    typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('exercise titles are unique',
  new Set(CH.exercises.map((e) => e.t)).size === 4);
checkTrue('summary points forward to R chapter 28 (Quarto)',
  /Quarto/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const S1 = 'Why base R is still in front of you';
const S2 = 'Selecting many elements with [';
const S3 = 'Data frames, and the comma';
const S4 = 'Selecting one element with $ and [[';
const S5 = 'Lists, str(), and NULL';
const S6 = 'The apply family';
const S7 = 'for loops';
const S8 = 'Plots, and the errors you will hit';

// Guard the block layout so a reordered section cannot silently skip a check.
checkTrue('s2 has 14 code blocks', codes(S2).length === 14, 'got ' + codes(S2).length);
checkTrue('s3 has 14 code blocks', codes(S3).length === 14, 'got ' + codes(S3).length);
checkTrue('s4 has 8 code blocks', codes(S4).length === 8, 'got ' + codes(S4).length);
checkTrue('s5 has 14 code blocks', codes(S5).length === 14, 'got ' + codes(S5).length);
checkTrue('s6 has 16 code blocks', codes(S6).length === 16, 'got ' + codes(S6).length);
checkTrue('s7 has 9 code blocks', codes(S7).length === 9, 'got ' + codes(S7).length);
checkTrue('s8 has 9 code blocks', codes(S8).length === 9, 'got ' + codes(S8).length);

await silent(S1, 0, 's1 library(tibble) prints nothing');

await pair(S2, 0, 's2 positive indexes');
await pair(S2, 2, 's2 negative indexes');
await pair(S2, 4, 's2 mixed signs error');
await pair(S2, 6, 's2 logical index');
await pair(S2, 8, 's2 name index');
await pair(S2, 10, 's2 out of range and zero');
await pair(S2, 12, 's2 short logical index recycles');

await pair(S3, 0, 's3 crates data frame prints');
await pair(S3, 2, 's3 no comma means columns');
await pair(S3, 4, 's3 comma after means rows');
await pair(S3, 6, 's3 comma before means columns and drops');
await pair(S3, 8, 's3 both halves at once');
await pair(S3, 10, 's3 drop = FALSE keeps the frame');
await pair(S3, 12, 's3 str on a data frame');

await pair(S4, 0, 's4 dollar, double bracket, position');
await pair(S4, 2, 's4 partial matching versus NULL');
await pair(S4, 4, 's4 tibble warns instead of guessing');
await pair(S4, 6, 's4 data frame drops, tibble does not');

await pair(S5, 0, 's5 str on a nested list');
await pair(S5, 2, 's5 single bracket keeps the list');
await pair(S5, 4, 's5 double bracket reaches inside');
await pair(S5, 6, 's5 single bracket takes many names');
await pair(S5, 8, 's5 nested reach');
await pair(S5, 10, 's5 NULL deletes an element');
await pair(S5, 12, 's5 NULL versus NA in a vector');

await pair(S6, 0, 's6 mean on a list returns NA');
await pair(S6, 2, 's6 lapply returns a list');
await pair(S6, 4, 's6 sapply simplifies to a vector');
await pair(S6, 6, 's6 sapply simplifies to a matrix');
await pair(S6, 8, 's6 sapply gives up and returns a list');
await pair(S6, 10, 's6 sapply on an empty list');
await pair(S6, 12, 's6 vapply with a numeric(1) template');
await pair(S6, 14, 's6 vapply errors on a broken promise');

await pair(S7, 0, 's7 for loop over unique holds');
await pair(S7, 2, 's7 preallocate then fill');
await pair(S7, 4, 's7 seq_along versus 1:length on empty');
await pair(S7, 6, 's7 1:length loop runs twice on empty');
await silent(S7, 8, 's7 seq_along loop runs zero times');

await silent(S8, 0, 's8 base plots emit no text in this runtime');
await pair(S8, 1, 's8 comma on a vector errors');
await pair(S8, 3, 's8 third index is silently drop');
await pair(S8, 5, 's8 double bracket refuses several elements');
await pair(S8, 7, 's8 reading past the end gives NA');

// ------------------------------------------- executable prose/question claims ----
// s8 note / question 10: a base plot call produces no text at all here.
check('claim: a base plot call produces no text', await R.run('plot(1:3)'), '');
// s1/s5 prose and question 1: [ keeps the container, [[ reaches inside.
check('claim: [ on a list is a list, [[ is the element',
  await R.run('class(voyage["ship"])\nclass(voyage[["ship"]])'),
  '[1] "list"\n[1] "character"');
// s2 note / question 3: a short logical index is recycled, not rejected.
check('claim: c(TRUE, FALSE) over seven elements keeps four',
  await R.run('length(tide_cm[c(TRUE, FALSE)])'), '[1] 4');
// s3 prose / question 4: three shapes from one bracket.
check('claim: crates[1] is 1 column, crates[1, ] is 1 row, crates[, 1] is a vector',
  await R.run('ncol(crates[1])\nnrow(crates[1, ])\nis.vector(crates[, 1])'),
  '[1] 1\n[1] 1\n[1] TRUE');
// s3 prose: dropping is what makes [, 1] and [["id"]] agree.
check('claim: the dropped column equals the double-bracket column',
  await R.run('identical(crates[["mass_kg"]], crates[, "mass_kg"])\nidentical(crates[1], crates["id"])'),
  '[1] TRUE\n[1] TRUE');
// s4 note / question 5: $ partial matches silently, [[ does not.
check('claim: $ partial matches where [[ returns NULL',
  await R.run('identical(crates$mass, crates$mass_kg)\nis.null(crates[["mass"]])'),
  '[1] TRUE\n[1] TRUE');
// s4 prose / question 6: a tibble warns and never drops.
check('claim: tibble refuses the partial name',
  await R.run('tcrates$mass'),
  'Warning: Unknown or uninitialised column: `mass`.\nNULL');
check('claim: a one-column tibble subset stays a tibble',
  await R.run('class(tcrates[, "mass_kg"])[1]\nclass(crates[, "mass_kg"])[1]'),
  '[1] "tbl_df"\n[1] "numeric"');
// s5 prose / question 7: NULL vanishes, NA occupies a slot.
check('claim: NULL has length 0 and NA has length 1',
  await R.run('is.null(NULL)\nis.na(NA)\nlength(NULL)\nlength(NA)'),
  '[1] TRUE\n[1] TRUE\n[1] 0\n[1] 1');
// s6 prose / question 8: sapply's return type varies with the data.
check('claim: sapply returns numeric, matrix, then list from the same pattern',
  await R.run('class(sapply(hauls, mean))\nclass(sapply(hauls, range))[1]\nclass(sapply(hauls, function(v) v[v > 20]))\nclass(sapply(list(), mean))'),
  '[1] "numeric"\n[1] "matrix"\n[1] "list"\n[1] "list"');
// s7 prose / question 9: 1:0 is two elements counting down.
check('claim: 1:length of an empty vector counts down through zero',
  await R.run('1:length(empty)\nlength(1:length(empty))\nlength(seq_along(empty))'),
  '[1] 1 0\n[1] 2\n[1] 0');
// s8 prose / question 10: an extra index is read as drop, not rejected.
check('claim: the third index of a data frame bracket is drop',
  await R.run('crates[1, 2, 3]\nidentical(crates[1, 2, 3], crates[1, 2, drop = TRUE])'),
  '[1] 18.5\n[1] TRUE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Three ways to pick a depth
`depth_m <- c(quay = 4.2, jetty = 2.8, channel = 7.5, slip = 3.1, basin = 5.9)

depth_m["channel"]
depth_m[-2]
depth_m[depth_m > 4]`,
// 2 — Rows by condition, columns by name
`moorings <- data.frame(
  berth = c("A1", "A2", "B1", "B2", "C1"),
  fee = c(46, 22, 38, 61, 29),
  depth_m = c(3.4, 2.1, 5.0, 2.9, 4.2)
)

wanted <- moorings[moorings$depth_m >= 3, c("berth", "fee")]
wanted[order(wanted$fee), ]`,
// 3 — One number per boat, guaranteed
`catches <- list(
  Wren = c(12, 18, 9),
  Heron = c(41, 37),
  Snipe = c(8, 8, 8, 8),
  Egret = c(25, 30, 22)
)

boat_totals <- vapply(catches, sum, numeric(1))
sort(boat_totals)`,
// 4 — A loop that survives an empty element
`readings <- list(
  dawn = c(4, 9, 2),
  noon = c(11, 7),
  dusk = c(6, 6, 6, 3),
  night = numeric(0)
)

spans <- numeric(length(readings))
names(spans) <- names(readings)

for (i in seq_along(readings)) {
  spans[i] <- sum(readings[[i]])
}

spans`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[0].replace('depth_m[-2]', 'depth_m[2]'));
checkTrue('exercise 1 rejects a positive index where a negative was asked for',
  wrong1 !== CH.exercises[0].o, wrong1);

const wrong2 = await R.run(SOLUTIONS[1].replace('wanted[order(wanted$fee), ]', 'wanted'));
checkTrue('exercise 2 rejects an unordered answer', wrong2 !== CH.exercises[1].o, wrong2);

const wrong3 = await R.run(SOLUTIONS[2].replace('vapply(catches, sum, numeric(1))',
  'vapply(catches, mean, numeric(1))'));
checkTrue('exercise 3 rejects mean where sum was asked for', wrong3 !== CH.exercises[2].o, wrong3);

const wrong4 = await R.run(SOLUTIONS[3].replace('sum(readings[[i]])', 'length(readings[[i]])'));
checkTrue('exercise 4 rejects counting where summing was asked for',
  wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

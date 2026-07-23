// Verifies R book chapter 26 (book/r26.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r26.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (sensors, hauls, paths, all_runs, and so on) and
// section 6 writes real files into WebR's in-memory filesystem.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch26_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r26.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r26;

const { check, checkTrue, done } = makeChecker('rch26');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 26', CH.n === 26);
checkTrue('title is "Iteration"', CH.title === 'Iteration');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/iteration.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists dplyr, tibble and purrr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'dplyr,tibble,purrr');
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
checkTrue('at least 2 exercises are tagged iteration',
  CH.exercises.filter((e) => e.c === 'iteration').length >= 2,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('at least 1 exercise is tagged apply family',
  CH.exercises.filter((e) => e.c === 'apply family').length >= 1,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r26' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('no hint quotes the expected output',
  CH.exercises.every((e) => e.h.every((h) => e.o.split('\n').every((line) =>
    line.trim().length < 6 || h.indexOf(line.trim()) === -1))));
checkTrue('summary points forward to R chapter 27 (a field guide to base R)',
  /field guide to base R/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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

// Booting WebR needs the network the first time each package is fetched. If a
// package cannot be installed, report a skip and stop rather than fail.
let R = null;
try {
  R = await makeR(CH.pkgs);
} catch (e) {
  console.log('SKIP runtime checks — WebR could not start or install ' +
    CH.pkgs.join(', ') + ' (' + e.message + ')');
  done();
}
const missing = [];
for (const p of CH.pkgs) {
  const got = await R.run('cat(requireNamespace("' + p + '", quietly = TRUE))');
  if (got.trim() !== 'TRUE') missing.push(p);
}
if (missing.length) {
  console.log('SKIP runtime checks — package(s) not available in WebR: ' + missing.join(', '));
  await R.close();
  done();
}

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
const S1 = 'Three shapes of repetition';
const S2 = 'Choosing the columns for across()';
const S3 = 'Several functions, and the names they make';
const S4 = 'Lists and the map family';
const S5 = 'One type in, one type out';
const S6 = 'Reading many files';
const S7 = 'walk() and saving many outputs';
const S8 = 'The base R relatives';

await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 the sensors tibble prints');
await pair(S1, 3, 's1 four columns averaged the long way');
await pair(S1, 5, 's1 across(where(is.numeric), mean) matches');

await pair(S2, 0, 's2 starts_with selects the temperatures');
await pair(S2, 2, 's2 across inside mutate rewrites in place');
await pair(S2, 4, 's2 ends_with crosses the grain');

await pair(S3, 0, 's3 a named list of functions');
await pair(S3, 2, 's3 .names reorders the pieces');
await pair(S3, 4, 's3 if_any keeps a row on one match');
await pair(S3, 6, 's3 if_all needs every column');
await pair(S3, 8, 's3 an embraced selection inside a function');

await pair(S4, 0, 's4 the hauls list prints');
await pair(S4, 2, 's4 length, names, class, lengths');
await pair(S4, 4, 's4 map returns a list');
await pair(S4, 6, 's4 the four suffixed maps');

await pair(S5, 0, 's5 map_dbl over a two-value function fails');
await pair(S5, 2, 's5 the detail is on the parent condition');
await pair(S5, 4, 's5 plain map takes the same call');
await pair(S5, 6, 's5 map_chr refuses to coerce a number');
await pair(S5, 8, 's5 an anonymous function fixes the type');

await pair(S6, 0, 's6 three csv files written and listed');
await pair(S6, 2, 's6 full paths, sorted');
await pair(S6, 4, 's6 map over paths gives a list of frames');
await pair(S6, 6, 's6 list_rbind stacks them');
await pair(S6, 8, 's6 set_names names the paths');
await pair(S6, 10, 's6 names_to puts the filename in a column');
await pair(S6, 12, 's6 the stacked table summarises');

await pair(S7, 0, 's7 walk prints one line per element');
await pair(S7, 2, 's7 walk returns its input');
await pair(S7, 4, 's7 map collects the NULLs walk discards');
await pair(S7, 6, 's7 iwalk supplies the name');
await pair(S7, 8, 's7 walk2 writes one file per piece');
await pair(S7, 10, 's7 saveRDS and readRDS round-trip');

await pair(S8, 0, 's8 lapply is map');
await pair(S8, 2, 's8 sapply and vapply agree on one number');
await pair(S8, 4, 's8 sapply silently makes a matrix');
await pair(S8, 6, 's8 vapply refuses the same call');
await pair(S8, 8, 's8 an empty input still gives a list');

// ------------------------------------- executable prose/question claims ----
// s1 note / question 1: across() is not a standalone function.
checkTrue('claim: across() outside a verb is an error',
  (await R.runErr('across(sensors, mean)')) !== null, 'expected an error line');
// s2 note: where(is.numeric()) calls the predicate instead of passing it.
checkTrue('claim: where(is.numeric()) is an error',
  (await R.runErr('sensors |> summarise(across(where(is.numeric()), mean))')) !== null,
  'expected an error line');
// s3 note / question 4: across() inside filter() does not work.
checkTrue('claim: across() inside filter() is an error',
  (await R.runErr('sensors |> filter(across(starts_with("rain"), \\(x) x == 0))')) !== null,
  'expected an error line');
// s4 prose / question 5: map keeps the length and the names, and returns a list.
check('claim: map returns a list with the input names',
  await R.run('class(map(hauls, mean))\nlength(map(hauls, mean))\nidentical(names(map(hauls, mean)), names(hauls))'),
  '[1] "list"\n[1] 3\n[1] TRUE');
// question 5: the suffix decides the type that comes back.
check('claim: map_dbl gives numeric and map_int gives integer',
  await R.run('class(map_dbl(hauls, mean))\nclass(map_int(hauls, length))\nclass(map_chr(hauls, \\(x) paste(x, collapse = "-")))'),
  '[1] "numeric"\n[1] "integer"\n[1] "character"');
// s4 note: map over a data frame iterates over columns.
check('claim: map over a data frame walks its 5 columns',
  await R.run('length(map(sensors, class))\nidentical(names(map(sensors, class)), names(sensors))'),
  '[1] 5\n[1] TRUE');
// s5 note: 24.25 rounds to 24.2, not 24.3 — half goes to the even digit.
check('claim: round(24.25, 1) is 24.2', await R.run('round(24.25, 1)'), '[1] 24.2');
// s6 prose: the three depot totals account for every parcel read.
check('claim: the depot totals add up to every parcel',
  await R.run('sum(all_runs$parcels)\nnrow(all_runs)'), '[1] 158\n[1] 6');
// s7 prose / question 9: walk returns its input invisibly.
check('claim: walk returns invisibly',
  await R.run('cat(withVisible(walk(1:2, \\(i) i))$visible)'), 'FALSE');
// s8 prose / question 10: sapply simplifies to a matrix, vapply does not.
check('claim: sapply(hauls, range) is a matrix',
  await R.run('class(sapply(hauls, range))'), '[1] "matrix" "array" ');
// s3 prose: if_any and if_all disagree about the same selection.
check('claim: if_any keeps 2 rows where if_all keeps 0',
  await R.run('nrow(filter(sensors, if_any(starts_with("rain"), \\(x) x == 0)))\nnrow(filter(sensors, if_all(starts_with("rain"), \\(x) x == 0)))'),
  '[1] 2\n[1] 0');

// ---------------------------------------- exercise reference solutions ----
const SOLUTIONS = [
// 1 — Three summaries of one list
`library(purrr)

kilns <- list(
  east = c(940, 980, 1010),
  north = c(900, 950, 1000, 970),
  west = c(1120, 1080)
)

map_dbl(kilns, mean)
map_int(kilns, length)
map_chr(kilns, \\(x) paste(range(x), collapse = "-"))`,
// 2 — Print, do not collect
`library(purrr)

crates <- list(ash = c(4, 6), birch = c(9), cedar = c(2, 3, 5))

walk(names(crates), \\(nm) cat(nm, sum(crates[[nm]]), "\\n"))`,
// 3 — The same job three base ways
`readings <- list(a = c(3, 7, 5), b = c(10, 12), c = c(8, 8, 9, 11))

sapply(readings, max)
vapply(readings, mean, numeric(1))
unlist(lapply(readings, length))`,
// 4 — Every numeric column at once
`suppressMessages(library(dplyr))
library(tibble)

plots <- tibble(
  plot = c("a", "b", "c"),
  beans_kg = c(3.5, 4.2, 2.8),
  peas_kg = c(1.1, 0.9, 1.6),
  note = c("dry", "wet", "dry")
)

plots |> summarise(across(where(is.numeric), mean))
plots |> summarise(across(ends_with("_kg"), list(low = min, high = max)))`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrongSummary = await R.run(SOLUTIONS[0].replace('map_dbl(kilns, mean)', 'map_dbl(kilns, median)'));
checkTrue('exercise 1 rejects the wrong summary function',
  wrongSummary !== CH.exercises[0].o, wrongSummary);
const wrongWalk = await R.run(SOLUTIONS[1].replace('walk(names(crates)', 'map(names(crates)'));
checkTrue('exercise 2 rejects map in place of walk',
  wrongWalk !== CH.exercises[1].o, wrongWalk);
const wrongFns = await R.run(SOLUTIONS[3].replace('list(low = min, high = max)', 'list(low = min)'));
checkTrue('exercise 4 rejects a half-finished function list',
  wrongFns !== CH.exercises[3].o, wrongFns);

await R.close();
done();

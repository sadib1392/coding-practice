// Verifies R book chapter 23 (book/r23.js) against a real WebR run.
//
// This script keeps NO copy of the chapter's shown output. It loads book/r23.js,
// pulls the code blocks straight out of the data, runs them in WebR, and diffs
// each result against the very next block in the file. Editing the chapter
// without re-capturing therefore fails here.
//
// Order matters and is deliberate:
//   1. The four exercise reference solutions run FIRST, in a session where
//      nothing has been attached. That is the only honest test of their
//      suppressPackageStartupMessages() preamble — if it failed to hide dplyr's
//      attach notice, the notice would land in the transcript and the four
//      checks would fail.
//   2. The session is then wiped and the three packages detached, so the
//      chapter's own library() block prints the attach notice the chapter shows.
//   3. Chapter blocks run top to bottom in ONE session, the way a learner reads
//      them, so state accumulates (boxes, counts, visits, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch23_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r23.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r23;

const { check, checkTrue, done } = makeChecker('rch23');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 23', CH.n === 23);
checkTrue('title is "Hierarchical data"', CH.title === 'Hierarchical data');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/rectangling.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists tidyr, dplyr, tibble and jsonlite',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'tidyr,dplyr,tibble,jsonlite');
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
checkTrue('at least 2 exercises are tidy data',
  CH.exercises.filter((e) => e.c === 'tidy data').length >= 2,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r23' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 24 (web scraping)',
  /web scraping/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', !src.includes('!'),
  'found at index ' + src.indexOf('!'));
// The JSON section must parse an inline string, never fetch one: this app has
// no network access from R.
const allCode = CH.sections.flatMap((s) => s.body.filter((b) => b[0] === 'code').map((b) => b[1]));
checkTrue('no code block reaches the network',
  allCode.every((c) => !/https?:\/\/|url\(|download\.file|read_json\(/.test(c)),
  allCode.filter((c) => /https?:\/\/|url\(|download\.file|read_json\(/.test(c)).join(' // '));
checkTrue('fromJSON is always called with simplifyVector = FALSE',
  allCode.filter((c) => /fromJSON\(/.test(c)).every((c) => /simplifyVector = FALSE/.test(c)));

// ------------------------------------------------------------- helpers ----
const section = (title) => {
  const s = CH.sections.find((x) => x.t === title);
  if (!s) throw new Error('no such section: ' + title);
  return s;
};
const codes = (title) => section(title).body.filter((b) => b[0] === 'code').map((b) => b[1]);

const R = await makeR(CH.pkgs);

// ------------------------------------------ 1. exercises, from a cold session ----
// Nothing has been attached yet, so the preamble is genuinely under test.
const PRE = `suppressPackageStartupMessages({
  library(tidyr)
  library(dplyr)
})

`;

const SOLUTIONS = [
// 1 — Build a list-column
PRE + `kits <- tibble(
  kit   = c("K1", "K2", "K3"),
  parts = list(c("bolt", "nut"), c("washer"), c("bolt", "clip", "nut"))
)

kits
lengths(kits$parts)`,
// 2 — Readings into columns
PRE + `logs <- tibble(
  site    = c("S1", "S2", "S3"),
  reading = list(
    list(temp = 12, wind = 4),
    list(temp = 9,  wind = 7),
    list(temp = 15, wind = 2)
  )
)

logs |>
  unnest_wider(reading) |>
  arrange(site)`,
// 3 — One row per stop
PRE + `trips <- tibble(
  guide = c("Ines", "Omar", "Yuki"),
  stops = list(c("pier", "fort"), NULL, c("mill"))
)

trips |>
  unnest_longer(stops, keep_empty = TRUE) |>
  arrange(guide, stops)`,
// 4 — Rectangle a JSON string
`suppressPackageStartupMessages({
  library(tidyr)
  library(dplyr)
  library(jsonlite)
})

raw <- '[{"id": "A", "meta": {"grade": 3, "tag": "ash"}}, {"id": "B", "meta": {"grade": 5, "tag": "oak"}}]'

cores <- tibble(entry = fromJSON(raw, simplifyVector = FALSE))

cores |>
  hoist(entry, id = "id", grade = list("meta", "grade")) |>
  select(id, grade) |>
  arrange(id)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrongLengths = await R.run(SOLUTIONS[0].replace('lengths(kits$parts)', 'length(kits$parts)'));
checkTrue('exercise 1 rejects length() in place of lengths()',
  wrongLengths !== CH.exercises[0].o, wrongLengths);
const wrongWide = await R.run(SOLUTIONS[1].replace('unnest_wider', 'unnest_longer'));
checkTrue('exercise 2 rejects unnest_longer in place of unnest_wider',
  wrongWide !== CH.exercises[1].o, wrongWide);
const wrongEmpty = await R.run(SOLUTIONS[2].replace(', keep_empty = TRUE', ''));
checkTrue('exercise 3 rejects dropping the empty element',
  wrongEmpty !== CH.exercises[2].o, wrongEmpty);
const wrongPath = await R.run(SOLUTIONS[3].replace('list("meta", "grade")', '"grade"'));
checkTrue('exercise 4 rejects a one-level path to a nested field',
  wrongPath !== CH.exercises[3].o, wrongPath);

// ------------------------------ 2. reset, so the chapter starts from nothing ----
await R.run('rm(list = ls())\ndetach("package:jsonlite")\ndetach("package:dplyr")\ndetach("package:tidyr")');

// ------------------------------------------------- 3. chapter code blocks ----
// Run code block i of a section and diff against block i+1 of the same section.
const pair = async (title, i, label) => {
  const c = codes(title);
  check(label || (title + ' [' + i + ']'), await R.run(c[i]), c[i + 1]);
};

const S1 = 'Lists, and why they turn up in tables';
const S2 = 'List-columns';
const S3 = 'unnest_wider(): elements become columns';
const S4 = 'unnest_longer(): elements become rows';
const S5 = 'When the pieces do not match';
const S6 = 'hoist(), and going deeper';
const S7 = 'Rectangling parsed JSON';

await pair(S1, 0, 's1 the three library() calls print the dplyr notice');
await pair(S1, 2, 's1 str() of an unnamed list');
await pair(S1, 4, 's1 str() of a named list');

await pair(S2, 0, 's2 a list-column prints as <list>');
await pair(S2, 2, 's2 double bracket reaches one cell');
await pair(S2, 4, 's2 lengths() and names()');

await pair(S3, 0, 's3 unnest_wider makes columns');
await pair(S3, 2, 's3 a named vector widens too');
await pair(S3, 4, 's3 unnamed elements error');
await pair(S3, 6, 's3 names_sep supplies the names');

await pair(S4, 0, 's4 a list-column of vectors prints its lengths');
await pair(S4, 2, 's4 unnest_longer makes rows');
await pair(S4, 4, 's4 element names become an _id column');

await pair(S5, 0, 's5 mismatched names union with NA');
await pair(S5, 2, 's5 NULL elements are dropped');
await pair(S5, 4, 's5 keep_empty holds the row');

await pair(S6, 0, 's6 hoist pulls two fields by path');
await pair(S6, 2, 's6 unnesting one level at a time');
await pair(S6, 4, 's6 unnest handles a column of data frames');

await pair(S7, 0, 's7 fromJSON with simplifyVector FALSE');
await pair(S7, 2, 's7 a parsed list becomes a list-column');
await pair(S7, 4, 's7 two widenings give a rectangle');
await pair(S7, 6, 's7 longer then wider for arrays of records');

// ------------------------------------- executable prose / question claims ----
// s2 prose: a list-column really is a list.
check('claim: both list-columns are lists',
  await R.run('class(boxes$record)\nclass(visits$days)'),
  '[1] "list"\n[1] "list"');
// s3 / s4 prose + question 3: wider keeps the rows, longer keeps the columns.
check('claim: wider keeps 3 rows, longer turns 3 rows into 6',
  await R.run('nrow(boxes)\nnrow(unnest_wider(boxes, record))\nnrow(visits)\nnrow(unnest_longer(visits, days))'),
  '[1] 3\n[1] 3\n[1] 3\n[1] 6');
// s4 prose: the longer row count is the sum of the element lengths.
check('claim: the longer row count is sum(lengths())',
  await R.run('sum(lengths(visits$days))'), '[1] 6');
// s2 note / question 2: single and double brackets return different kinds.
check('claim: [ returns a list and [[ returns the element',
  await R.run('class(boxes$record[1])\nclass(boxes$record[[1]])\nlength(boxes$record[1])'),
  '[1] "list"\n[1] "list"\n[1] 1');
// s5 prose + question 6: the union of three different shapes is 4 columns.
check('claim: mismatched records union to 4 columns',
  await R.run('ncol(unnest_wider(mixed, record))'), '[1] 4');
// s5 prose + question 7: the NULL element costs a row unless kept.
check('claim: keep_empty is the difference between 3 rows and 4',
  await R.run('nrow(unnest_longer(gaps, days))\nnrow(unnest_longer(gaps, days, keep_empty = TRUE))'),
  '[1] 3\n[1] 4');
// s6 prose: hoist leaves the source column behind, holding what was not taken.
check('claim: hoist keeps the source column with the leftovers',
  await R.run('h <- hoist(deep, record, species = "species", eggs = list("clutch", "eggs"))\nnames(h)\nlengths(h$record)'),
  '[1] "box"     "species" "eggs"    "record" \n[1] 2 2');
// s7 prose + question 9: simplifyVector = FALSE gives plain lists, TRUE does not.
check('claim: simplifyVector FALSE yields a list, TRUE yields a data frame',
  await R.run('class(fromJSON(raw, simplifyVector = FALSE))\nclass(fromJSON(raw, simplifyVector = TRUE))'),
  '[1] "list"\n[1] "data.frame"');
// s7 prose + question 10: longer-then-wider turns 2 plots into 3 walks.
check('claim: longer then wider gives one row per walk',
  await R.run('nrow(rounds)\nnrow(unnest_longer(rounds, walks))'), '[1] 2\n[1] 3');
// s1 prose: a JSON object parses to a named list and an array to an unnamed one.
check('claim: JSON object becomes a named list, array becomes an unnamed list',
  await R.run('is.null(names(parsed))\nnames(parsed[[1]])'),
  '[1] TRUE\n[1] "box"     "species" "clutch" ');

await R.close();
done();

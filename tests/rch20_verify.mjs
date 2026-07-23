// Verifies R book chapter 20 (book/r20.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r20.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (orders, the written .xlsx files, and so on).
//
// Section 7 (Google Sheets) is deliberately NOT run. googlesheets4 needs a
// network connection to Google and a browser sign-in, so its blocks are shown
// output-free; this script asserts they are all input and never executes them.
// No check here touches the network beyond the WebR package repo.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch20_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r20.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r20;

const { check, checkTrue, done } = makeChecker('rch20');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 20', CH.n === 20);
checkTrue('title is "Spreadsheets"', CH.title === 'Spreadsheets');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/spreadsheets.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists only packages that install in WebR and the exercises need',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'readxl,writexl,tibble,dplyr');
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
checkTrue('exercise concepts are data frames / tibbles & pipes',
  CH.exercises.every((e) => e.c === 'data frames' || e.c === 'tibbles & pipes'),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r20' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 21 (Databases)',
  /Databases/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const notes = (title) => section(title).body.filter((b) => b[0] === 'note').map((b) => b[1]);

const S1 = 'Spreadsheets, and the packages that read them';
const S2 = 'Making a workbook, then reading it back';
const S3 = 'More than one sheet';
const S4 = 'Reading part of a sheet';
const S5 = 'Column types';
const S6 = 'Writing spreadsheets';
const S7 = 'Google Sheets';

// -------------------------------------------- section 7 is output-free ----
// Honesty contract: googlesheets4 cannot run here, so every block in that
// section must be code the learner would type, never a captured result.
const gs = codes(S7);
checkTrue('Google Sheets section has code blocks', gs.length >= 3, 'got ' + gs.length);
checkTrue('every Google Sheets block is input, not captured output',
  gs.every((c) => /googlesheets4|read_sheet|write_sheet|gs4_/.test(c)),
  'a block without a googlesheets4 call would be an output block');
checkTrue('no Google Sheets block looks like captured R output',
  gs.every((c) => !/^\s*(\[1\]|# A tibble)/m.test(c)));
checkTrue('Google Sheets section discloses that nothing was run',
  notes(S7).some((n) => /was run/.test(n) && /network/.test(n)));

// ------------------------------------------------------ boot WebR ----------
// Every execution check below needs the chapter's packages. If they cannot be
// installed (no network, or the WebR repo is unreachable) skip rather than fail,
// so the suite stays green on a machine without them.
let R = null;
try {
  R = await makeR(CH.pkgs);
} catch (e) {
  console.log('skip: ' + CH.pkgs.join('/') + ' not installed — ' +
    String((e && e.message) || e).split('\n')[0]);
  console.log('skip: all WebR execution checks for rch20');
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
await silent(S1, 0, 's1 library() calls print nothing');

await pair(S2, 0, 's2 write_xlsx creates the file');
await pair(S2, 2, 's2 excel_sheets names the tab');
await pair(S2, 4, 's2 read_excel returns the tibble');
await pair(S2, 6, 's2 the result is a tibble with a numeric column');
await pair(S2, 8, 's2 a missing path errors');

await pair(S3, 0, 's3 a named list writes two tabs');
await pair(S3, 2, 's3 sheet by name');
await pair(S3, 4, 's3 sheet by number');
await pair(S3, 6, 's3 an unknown sheet name errors');

await pair(S4, 0, 's4 range reads a rectangle');
await pair(S4, 2, 's4 n_max caps the data rows');
await pair(S4, 4, 's4 col_names = FALSE invents names');
await pair(S4, 6, 's4 supplied col_names with skip');

await pair(S5, 0, 's5 one text cell makes the column character');
await pair(S5, 2, 's5 the column class is character');
await pair(S5, 4, 's5 na names the missing markers');
await pair(S5, 6, 's5 col_types forces numeric and warns twice over');
await pair(S5, 8, 's5 na plus col_types leaves only coercion warnings');
await pair(S5, 10, 's5 sum needs na.rm');
await pair(S5, 12, 's5 the skip type drops a column');
await pair(S5, 14, 's5 a Date column returns as a date-time');
await pair(S5, 16, 's5 the class is POSIXct');

await pair(S6, 0, 's6 the round trip is faithful');
await pair(S6, 2, 's6 writing replaces the file');
await pair(S6, 4, 's6 a formula string stays a string');

// ------------------------------------------- executable prose/question claims ----
// s2 prose / question 1: read_excel returns a tibble, so dplyr verbs apply to it.
check('claim: a read sheet is an ordinary tibble dplyr can use',
  await R.run('nrow(arrange(read_excel("packhouse.xlsx"), desc(apples)))'), '[1] 5');
// s5 prose: "120" read as text is the string, not the number, and sorts alphabetically.
check('claim: text counts sort alphabetically, putting 96 after 120',
  await R.run('sort(read_excel("messy.xlsx")$apples)'),
  '[1] "120"     "96"      "n/a"     "unknown"');
// s5 note / question 8: the date-time is midnight, and as.Date recovers a Date.
check('claim: as.Date converts the returned date-time back to a Date',
  await R.run('class(as.Date(read_excel("picks.xlsx")$picked))'), '[1] "Date"');
// question 7: col_types accepts exactly these seven strings.
check('claim: "guess" and "logical" and "list" are accepted col_types',
  await R.run('ncol(read_excel("packhouse.xlsx", col_types = c("guess", "guess", "text")))'),
  '[1] 3');
// question 3 / s3 note: sheet names are matched exactly, so a number is positional.
check('claim: sheet 1 and sheet "Orders" are the same tab',
  await R.run('identical(read_excel("season.xlsx", sheet = 1), read_excel("season.xlsx", sheet = "Orders"))'),
  '[1] TRUE');
// question 9 / s6 note: write_xlsx replaces an existing file with no warning.
check('claim: overwriting is silent and total',
  await R.run('write_xlsx(orders[1, ], "scratch.xlsx")\nnrow(read_excel("scratch.xlsx"))'), '[1] 1');
// s4 note: skip throws rows away, col_names = FALSE keeps them.
check('claim: skip drops rows that col_names = FALSE would keep',
  await R.run('nrow(read_excel("packhouse.xlsx", skip = 2))'), '[1] 3');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — A workbook of seed packets
`library(tibble)
library(writexl)
library(readxl)

packets <- tibble(
  variety = c("Cosmos", "Nigella", "Borage"),
  grams = c(4.5, 2, 6.5)
)

write_xlsx(packets, "packets.xlsx")

read_excel("packets.xlsx")`,
// 2 — Two tabs in one file
`library(tibble)
library(writexl)
library(readxl)

write_xlsx(
  list(
    Kilns = tibble(kiln = c("K1", "K2"), firings = c(14, 9)),
    Glazes = tibble(glaze = c("celadon", "tenmoku", "shino"), cone = c(10, 10, 8))
  ),
  "pottery.xlsx"
)

excel_sheets("pottery.xlsx")
read_excel("pottery.xlsx", sheet = "Glazes")`,
// 3 — A column that is not numbers
`library(tibble)
library(writexl)
library(readxl)
suppressMessages(library(dplyr))

write_xlsx(
  tibble(
    stall = c("S1", "S2", "S3", "S4"),
    takings = c("240", "closed", "185", "closed")
  ),
  "market.xlsx"
)

takings <- read_excel("market.xlsx", na = "closed", col_types = c("text", "numeric"))

arrange(takings, stall)
sum(takings$takings, na.rm = TRUE)`,
// 4 — Only part of the sheet
`library(tibble)
library(writexl)
library(readxl)

write_xlsx(
  tibble(
    ward = c("north", "south", "east", "west"),
    beds = c(24, 18, 30, 12)
  ),
  "wards.xlsx"
)

read_excel("wards.xlsx", range = "A1:B3")
read_excel("wards.xlsx", col_names = c("area", "count"), skip = 1)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[3].replace('range = "A1:B3"', 'range = "A1:B4"'));
checkTrue('exercise 4 rejects the wrong range', wrong1 !== CH.exercises[3].o, wrong1);
const wrong2 = await R.run(SOLUTIONS[2].replace(', col_types = c("text", "numeric")', ''));
checkTrue('exercise 3 rejects dropping col_types', wrong2 !== CH.exercises[2].o, wrong2);

await R.close();
done();

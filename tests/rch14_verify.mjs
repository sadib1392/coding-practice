// Verifies R book chapter 14 (book/r14.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r14.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (path, herbs, jam, and so on).
//
// This chapter is written with R string escapes inside JavaScript string
// literals, so every backslash in the data file is doubled. The check named
// "escaping survives the JS literal" below is the guard against getting that
// wrong: it asserts the rendered text the reader sees, not the file bytes.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch14_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r14.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r14;

const { check, checkTrue, done } = makeChecker('rch14');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 14', CH.n === 14);
checkTrue('title is "Strings"', CH.title === 'Strings');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/strings.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists stringr, tibble, tidyr and dplyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'stringr,tibble,tidyr,dplyr', String(CH.pkgs));
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
checkTrue('at least 3 exercises are strings & regex',
  CH.exercises.filter((e) => e.c === 'strings & regex').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r14' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 15 (Regular expressions)',
  /Regular expressions/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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

const S1 = 'Writing a string down';
const S2 = 'Escapes, and the two ways a string is shown';
const S3 = 'Raw strings and other special characters';
const S4 = 'Building many strings with str_c';
const S5 = 'str_glue and str_flatten';
const S6 = 'Pulling strings apart';
const S7 = 'Letters: length and subsetting';
const S8 = 'Non-English text';

// --------------------------------------------------- escaping contract ----
// The chapter is R code inside JS string literals. If a backslash were written
// once where it needed to be written twice, the reader would see the wrong
// source and WebR would run something else. Assert the RENDERED text.
{
  const c2 = codes(S2), c3 = codes(S3);
  // The path literal the reader sees has TWO backslashes (R source form)...
  checkTrue('escaping survives the JS literal: doubled backslash in the path literal',
    c2[4].includes('"C:\\\\field\\\\notes.txt"'), JSON.stringify(c2[4]));
  // ...and cat() output shows ONE.
  checkTrue('escaping survives the JS literal: cat output shows single backslashes',
    c2[5].includes('\nC:\\field\\notes.txt') && !c2[5].includes('\nC:\\\\field'),
    JSON.stringify(c2[5]));
  // The raw string literal is written with single backslashes.
  checkTrue('escaping survives the JS literal: raw string has single backslashes',
    c3[0].includes('r"(C:\\field\\notes.txt)"'), JSON.stringify(c3[0]));
  // The tab escape is two characters in the source form and one real tab in cat output.
  checkTrue('escaping survives the JS literal: source form shows backslash-t',
    c2[1].includes('[1] "gauge\\t14"'), JSON.stringify(c2[1]));
  checkTrue('escaping survives the JS literal: cat output holds a real tab',
    c2[1].includes('gauge\t14'), JSON.stringify(c2[1]));
  // The unicode escapes are written as backslash-u, not as the character itself.
  checkTrue('escaping survives the JS literal: unicode escapes are literal backslash-u',
    codes(S3)[4].includes('"\\u00e9"'), JSON.stringify(codes(S3)[4]));
}

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
await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 the two quote styles give one string');
await pair(S1, 3, 's1 choosing the quote the text lacks');
await pair(S1, 5, 's1 escaped double quotes give the same string');

await pair(S2, 0, 's2 tab: source form versus cat');
await pair(S2, 2, 's2 newline: source form versus cat');
await pair(S2, 4, 's2 a path needs doubled backslashes in source only');
await pair(S2, 6, 's2 str_view marks the invisible characters');

await pair(S3, 0, 's3 a raw string is the same string');
await pair(S3, 2, 's3 a raw string holding quotes and a backslash');
await pair(S3, 4, 's3 unicode escapes');

await pair(S4, 0, 's4 str_c with and without sep');
await pair(S4, 2, 's4 str_c recycles across a vector');
await pair(S4, 4, 's4 NA propagates through a join');
await pair(S4, 6, 's4 coalesce versus str_replace_na');
await pair(S4, 8, 's4 collapse folds the vector into one string');

await pair(S5, 0, 's5 str_glue substitutes a name');
await pair(S5, 2, 's5 str_glue evaluates an expression');
await pair(S5, 4, 's5 doubled braces write a literal brace');
await pair(S5, 6, 's5 str_glue inside mutate sees the columns');
await pair(S5, 8, 's5 str_flatten with and without last');
await pair(S5, 10, 's5 str_flatten inside summarise');

await pair(S6, 0, 's6 separate_longer_delim adds rows');
await pair(S6, 2, 's6 separate_wider_delim adds columns');
await pair(S6, 4, 's6 the wrong number of pieces is an error');
await pair(S6, 6, 's6 too_few aligns from the start');
await pair(S6, 8, 's6 too_many drops the surplus');
await pair(S6, 10, 's6 str_split returns a list');

await pair(S7, 0, 's7 str_length counts characters');
await pair(S7, 2, 's7 str_sub by position and from the end');
await pair(S7, 4, 's7 str_sub is vectorised');
await pair(S7, 6, 's7 str_sub on the left of an assignment');

await pair(S8, 0, 's8 composed and decomposed are not equal');
await pair(S8, 2, 's8 str_equal normalises first');
await pair(S8, 4, 's8 upper case depends on locale');
await pair(S8, 6, 's8 sorting depends on locale');
await pair(S8, 8, 's8 str_sort ignores case, base sort does not');
await pair(S8, 10, 's8 characters, not bytes');

// ------------------------------------------- executable prose/question claims ----
// s1 / question 1: the two quote styles are the same string.
check('claim: single and double quotes give one string',
  await R.run('identical(\'badger\', "badger")'), '[1] TRUE');
// s2 / question 2: the doubling is only in the writing.
check('claim: the path holds 18 characters and one backslash per separator',
  await R.run('str_length(path)\nstr_count(path, fixed("\\\\"))'), '[1] 18\n[1] 2');
// s3 / question 4: a raw string is the same value as the escaped literal.
check('claim: raw and escaped literals are identical',
  await R.run('identical(r"(C:\\field)", "C:\\\\field")'), '[1] TRUE');
// s3: a Unicode escape is one character.
check('claim: a unicode escape is one character', await R.run('str_length("\\u2713")'), '[1] 1');
// s4 / question 6: sep keeps the length, collapse reduces it to one.
check('claim: sep keeps the length, collapse reduces it',
  await R.run('length(str_c(herbs, " leaves"))\nlength(str_c(herbs, collapse = ", "))'),
  '[1] 3\n[1] 1');
// s4 / question 5: joining to NA gives NA.
check('claim: joining to NA gives NA',
  await R.run('is.na(str_c("plot ", c("north", NA, "east")))'), '[1] FALSE  TRUE FALSE');
// s5 prose: a glue result is its own class.
check('claim: str_glue returns a glue object',
  await R.run('class(str_glue("{jars} jars"))[1]'), '[1] "glue"');
// s5 prose / question 7: the loose variable is untouched; the column won inside mutate().
check('claim: the loose jars variable is still 3', await R.run('jars'), '[1] 3');
// s6 / question 8: longer adds rows, wider adds columns, and pieces are character.
check('claim: separate_longer_delim turned 2 rows into 5',
  await R.run('nrow(beds)\nnrow(separate_longer_delim(beds, planted, delim = ";"))'),
  '[1] 2\n[1] 5');
check('claim: split pieces come back as character',
  await R.run('class(separate_wider_delim(labels, code, delim = "-", names = c("region", "year", "week"))$year)'),
  '[1] "character"');
// s7 / question 9: str_sub with one position runs to the end.
check('claim: str_sub with one position runs to the end',
  await R.run('str_sub("rosemary", 2)\nstr_sub("rosemary", -4, -1)'),
  '[1] "osemary"\n[1] "mary"');
// s8 / question 10: same glyph, different storage, different length.
check('claim: composed and decomposed differ in length but read the same',
  await R.run('str_length(composed) == str_length(decomposed)\nstr_equal(composed, decomposed)'),
  '[1] FALSE\n[1] TRUE');
// s8 prose: str_sort and base sort disagree on case.
check('claim: str_sort and sort disagree on a capital letter',
  await R.run('identical(str_sort(c("apple", "Banana")), sort(c("apple", "Banana")))'),
  '[1] FALSE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Labels for the jars
`library(stringr)

fruit <- c("plum", "quince", "sloe")
jars <- c(4L, 2L, 7L)

str_c(jars, " jars of ", fruit)`,
// 2 — One line for the shelf
`library(stringr)

herbs <- c("sage", "bay", "dill")

str_flatten(sort(herbs), ", ", last = " and ")`,
// 3 — Codes from the station names
`library(stringr)

stations <- c("harbour", "quay", "lighthouse")

str_length(stations)
str_to_upper(str_sub(stations, 1, 3))`,
// 4 — Splitting the reference codes
`library(tibble)
library(tidyr)
suppressMessages(library(dplyr))

readings <- tibble(ref = c("NW-2024-11", "SE-2023-04", "NE-2024-03"))

readings |>
  separate_wider_delim(ref, delim = "-", names = c("region", "year", "week")) |>
  arrange(region)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[0].replace('" jars of "', '" jars of"'));
checkTrue('exercise 1 rejects a missing space', wrong1 !== CH.exercises[0].o, wrong1);
const wrong2 = await R.run(SOLUTIONS[1].replace('sort(herbs)', 'herbs'));
checkTrue('exercise 2 rejects the unsorted vector', wrong2 !== CH.exercises[1].o, wrong2);
const wrong3 = await R.run(SOLUTIONS[2].replace('str_sub(stations, 1, 3)', 'str_sub(stations, 1, 2)'));
checkTrue('exercise 3 rejects the wrong slice', wrong3 !== CH.exercises[2].o, wrong3);
const wrong4 = await R.run(SOLUTIONS[3].replace('arrange(region)', 'arrange(desc(region))'));
checkTrue('exercise 4 rejects the reversed order', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

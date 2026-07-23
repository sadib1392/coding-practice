// Verification for book/r08.js — R Chapter 8: Workflow: getting help.
//
// Every code block shown in the chapter is executed in WebR (R 4.6.0, the same
// runtime the app uses) and diffed against the output block the chapter prints
// next to it. Local R is a different version and is never consulted.
//
// The chapter is mostly about error and warning text, so the diffs here are
// literally the messages the learner will read. captureConditions:false in the
// shared harness is what makes that possible: an R error lands in the
// transcript as the line R prints rather than as a JS exception.
//
// Two directions of drift are caught:
//   1. The chapter's shown output no longer matches what R produces.
//   2. The chapter's code/output blocks were edited so a pair listed here is
//      no longer present, or no longer adjacent, in book/r08.js.
//
// Run from the repo root:  node tests/rch8_verify.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeR, makeChecker } from './rverify.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// --- load the chapter data the same way the browser would -------------------
global.window = {};
eval(fs.readFileSync(path.join(root, 'book', 'r08.js'), 'utf8'));
const CH = global.window.BOOK_R.chapters.r08;

// Flat list of every body block, in reading order, for adjacency checks.
const BODY = [];
CH.sections.forEach((s, si) => s.body.forEach((b, bi) => BODY.push({ si, bi, kind: b[0], text: b[1] })));

const { check, checkTrue, done } = makeChecker('r08');

// Assert the chapter really shows `code` immediately followed by `want`.
function shows(label, code, want) {
  const i = BODY.findIndex((b) => b.kind === 'code' && b.text === code);
  if (i < 0) return checkTrue(label + ' [in chapter]', false, 'code block not found in book/r08.js');
  const next = BODY[i + 1];
  const ok = next && next.kind === 'code' && next.text === want;
  return checkTrue(label + ' [in chapter]', ok,
    ok ? '' : 'block after this code is ' + JSON.stringify(next && next.text));
}

const R = await makeR(CH.pkgs || []);
const reset = () => R.run('rm(list = ls())');
await reset();

// --- shown code block -> shown output block ---------------------------------
// keep:true means the block continues the previous one's objects on purpose.
const PAIRS = [
  // s0 Read the error before you touch the code
  ['s0 non-numeric argument',
   'sqrt("16")',
   'Error: non-numeric argument to mathematical function'],
  ['s0 diagnose then convert',
   'reading <- "16"\nclass(reading)\nsqrt(as.numeric(reading))',
   '[1] "character"\n[1] 4'],

  // s1 What an R error message names
  ['s1 message and call from the condition',
   'e <- tryCatch(sqrt("16"), error = function(e) e)\nconditionMessage(e)\ndeparse(conditionCall(e))',
   '[1] "non-numeric argument to mathematical function"\n[1] "sqrt(\\"16\\")"'],
  ['s1 traceback has nothing here',
   'traceback()',
   'No traceback available '],

  // s2 Errors you will actually meet
  ['s2 binary operator',
   '"12" + 1',
   'Error: non-numeric argument to binary operator'],
  ['s2 subscript out of bounds',
   'readings <- list(12, 31, 7)\nreadings[[5]]',
   'Error: subscript out of bounds'],
  ['s2 missing value where TRUE/FALSE needed',
   'reading <- NA\nif (reading > 10) "high"',
   'Error: missing value where TRUE/FALSE needed'],
  ['s2 missing argument',
   'band <- function(reading, limit) if (reading > limit) "high" else "low"\nband(12)',
   'Error: argument "limit" is missing, with no default'],
  ['s2 unused argument',
   'band(12, limit = 10, units = "mm")',
   'Error: unused argument (units = "mm")', true],
  ['s2 no such package',
   'library(dplyrr)',
   'Error: there is no package called ‘dplyrr’'],

  // s3 Warnings are quieter and worse
  ['s3 NaNs produced',
   'log(-4)',
   'Warning in log(-4) : NaNs produced\n[1] NaN'],
  ['s3 mean of text',
   'mean(c("12", "31"))',
   'Warning in mean.default(c("12", "31")) :\n  argument is not numeric or logical: returning NA\n[1] NA'],
  ['s3 recycling warning',
   'c(1, 2, 3, 4, 5) + c(10, 20)',
   'Warning in c(1, 2, 3, 4, 5) + c(10, 20) :\n  longer object length is not a multiple of shorter object length\n[1] 11 22 13 24 15'],
  ['s3 NAs introduced by coercion',
   'to_number <- function(x) as.numeric(x)\nto_number(c("12", "twelve", "7"))',
   'Warning in to_number(c("12", "twelve", "7")) :\n  NAs introduced by coercion\n[1] 12 NA  7'],

  // s4 The failures that print nothing at all
  ['s4 missing column is NULL',
   'd <- data.frame(station = c("north", "south"), reading = c(12, 31))\nd$readings',
   'NULL'],
  ['s4 and sums to zero',
   'sum(d$readings)',
   '[1] 0', true],
  ['s4 misspelled argument disregarded',
   'seq(1, 10, step = 2)',
   'Warning: In seq.default(1, 10, step = 2) :\n extra argument ‘step’ will be disregarded\n [1]  1  2  3  4  5  6  7  8  9 10'],
  ['s4 NA spreads',
   'readings <- c(12, NA, 7)\nreadings > 10\nmean(readings)',
   '[1]  TRUE    NA FALSE\n[1] NA'],

  // s5 Asking R itself
  ['s5 args(round)',
   'args(round)',
   'function (x, digits = 0, ...) \nNULL'],
  ['s5 args(seq.default)',
   'args(seq.default)',
   'function (from = 1, to = 1, by = ((to - from)/(length.out - 1)), \n    length.out = NULL, along.with = NULL, ...) \nNULL'],
  ['s5 formals names',
   'names(formals(seq.default))',
   '[1] "from"       "to"         "by"         "length.out" "along.with"\n[6] "..."       '],
  ['s5 class and is.numeric',
   'reading <- "12"\nclass(reading)\nis.numeric(reading)',
   '[1] "character"\n[1] FALSE'],
  ['s5 str on a list',
   'rec <- list(station = "north", reading = 12)\nstr(rec)',
   'List of 2\n $ station: chr "north"\n $ reading: num 12'],
];

console.log('--- shown code blocks ---');
for (const [label, code, want, keep] of PAIRS) {
  shows(label, code, want);
  if (!keep) await reset();
  check(label, await R.run(code), want);
}

// --- the one deliberately output-free block ---------------------------------
console.log('');
console.log('--- output-free block ---');
{
  const i = BODY.findIndex((b) => b.kind === 'code' && /^# Expected: the mean/.test(b.text));
  checkTrue('s6 reprex template is present', i >= 0);
  const next = BODY[i + 1];
  checkTrue('s6 reprex template shows no output and is followed by a disclosure note',
    i >= 0 && next && next.kind === 'note' && /output-free on purpose/.test(next.text),
    'block after the reprex is ' + JSON.stringify(next && next.kind));
  // Nothing in the chapter claims a result for it, and readr is not among this
  // chapter's packages, so it is never executed here.
  checkTrue('s6 chapter declares no packages, so every run block is base R',
    Array.isArray(CH.pkgs) && CH.pkgs.length === 0, JSON.stringify(CH.pkgs));
}

// --- claims made in prose and notes -----------------------------------------
console.log('');
console.log('--- prose and note claims ---');

await reset();
checkTrue('s0 note: the same code produces the same error every time',
  (await R.run('sqrt("16")')) === (await R.run('sqrt("16")')));

await reset();
checkTrue('s1 note: WebR drops the "Error in <call> :" prefix',
  !/^Error in /.test(await R.runErr('sqrt("16")')), await R.runErr('sqrt("16")'));

await reset();
check('s2 prose: as.numeric on the quoted side fixes the binary operator error',
  await R.run('as.numeric("12") + 1'), '[1] 13');
await reset();
check('s2 prose: length() is the check behind subscript out of bounds',
  await R.run('readings <- list(12, 31, 7)\nlength(readings)'), '[1] 3');
await reset();
check('s2 prose: NA > 10 is NA, which is why if() refuses it',
  await R.run('NA > 10'), '[1] NA');
await reset();
check('s2 note: $ on a base R function name gives the closure error',
  await R.runErr('df$reading'), "Error: object of type 'closure' is not subsettable");
await reset();
check('s2 note: [ ] on a base R function name gives the same error',
  await R.runErr('data[1]'), "Error: object of type 'closure' is not subsettable");

await reset();
check('s3 prose: a warning does not stop the rest of the code',
  await R.run('x <- log(-4)\n"still running"'),
  'Warning in log(-4) : NaNs produced\n[1] "still running"');
await reset();
check('s3 prose: the recycled pairing is 10 20 10 20 10',
  await R.run('suppressWarnings(c(1, 2, 3, 4, 5) + c(10, 20))'), '[1] 11 22 13 24 15');
await reset();
check('s3 prose: recycling is silent when the lengths divide evenly',
  await R.run('c(1, 2, 3, 4) + c(10, 20)'), '[1] 11 22 13 24');

await reset();
check('s4 prose: names(d) shows the column that really exists',
  await R.run('d <- data.frame(station = c("north", "south"), reading = c(12, 31))\nnames(d)'),
  '[1] "station" "reading"');
await reset();
check('s4 prose: a missing column is NULL rather than an error',
  await R.run('d <- data.frame(station = c("north", "south"), reading = c(12, 31))\nis.null(d$readings)'),
  '[1] TRUE');
await reset();
check('s4 prose: the argument is called by, and five values were wanted',
  await R.run('seq(1, 10, by = 2)'), '[1] 1 3 5 7 9');
await reset();
check('s4 prose: na.rm = TRUE is what averages around the hole',
  await R.run('mean(c(12, NA, 7), na.rm = TRUE)'), '[1] 9.5');

await reset();
checkTrue('s5 note: args() answers in one line where a help page would not',
  (await R.run('args(round)')).startsWith('function (x, digits = 0, ...)'));

// --- question claims --------------------------------------------------------
console.log('');
console.log('--- question claims ---');

await reset();
check('q0: the message names what would satisfy the call',
  await R.runErr('sqrt("16")'), 'Error: non-numeric argument to mathematical function');

await reset();
checkTrue('q1: conditionCall recovers the call the console did not print',
  (await R.run('e <- tryCatch(sqrt("16"), error = function(e) e)\ndeparse(conditionCall(e))')) === '[1] "sqrt(\\"16\\")"');

await reset();
check('q2: traceback reports that none is available', await R.run('traceback()'), 'No traceback available ');

await reset();
check('q3: too few arguments names the missing one',
  await R.runErr('band <- function(reading, limit) if (reading > limit) "high" else "low"\nband(12)'),
  'Error: argument "limit" is missing, with no default');
check('q3: one too many names the surplus one',
  await R.runErr('band(12, limit = 10, units = "mm")'),
  'Error: unused argument (units = "mm")');
check('q3: the correct call works', await R.run('band(12, limit = 10)'), '[1] "high"');

await reset();
check('q4: df$reading is the classic closure error',
  await R.runErr('df$reading'), "Error: object of type 'closure' is not subsettable");

await reset();
check('q5: an error stops the next line, a warning does not',
  await R.run('x <- sqrt("16")\n"still running"'),
  'Error: non-numeric argument to mathematical function');

await reset();
check('q6: recycling invents the pairing past the second element',
  await R.run('suppressWarnings(c(1, 2, 3, 4, 5) + c(10, 20))'), '[1] 11 22 13 24 15');

await reset();
check('q7: a typo in a column name totals to zero with no message',
  await R.run('d <- data.frame(station = c("north", "south"), reading = c(12, 31))\nsum(d$readings)'),
  '[1] 0');

await reset();
// formals() is NULL for primitives such as round(), which is why the chapter
// demonstrates it on seq.default() — a closure — instead.
check('q8: args, formals, class and str all run here',
  await R.run('length(args(round)) > 0\nlength(names(formals(seq.default))) > 0\nclass("12")\nis.character(capture.output(str(list(a = 1))))'),
  '[1] TRUE\n[1] TRUE\n[1] "character"\n[1] TRUE');

// --- exercise reference solutions -------------------------------------------
console.log('');
console.log('--- exercise reference solutions ---');

const SOLUTIONS = {
  'The number that was text':
    'readings <- c("12", "31", "7")\n' +
    'class(readings)\n' +
    'numbers <- as.numeric(readings)\n' +
    'class(numbers)\n' +
    'max(numbers)',
  'Catch it and read it':
    'e <- tryCatch(sqrt("16"), error = function(e) e)\n' +
    'conditionMessage(e)\n' +
    'deparse(conditionCall(e))',
  'Fail early, in your own words':
    'safe_double <- function(x) {\n' +
    '  if (is.numeric(x)) x * 2 else stop("x must be numeric")\n' +
    '}\n' +
    'safe_double(21)\n' +
    'tryCatch(safe_double("21"), error = function(e) conditionMessage(e))',
  'What a missing value does':
    'readings <- c(12, NA, 7)\n' +
    'readings > 10\n' +
    'any(is.na(readings))\n' +
    'sum(readings, na.rm = TRUE)',
};

checkTrue('exercise count is 4', CH.exercises.length === 4, String(CH.exercises.length));
for (const ex of CH.exercises) {
  const src = SOLUTIONS[ex.t];
  if (!src) { checkTrue('solution for "' + ex.t + '"', false, 'no reference solution listed'); continue; }
  await reset();
  check('exercise: ' + ex.t, await R.run(src), ex.o);
  // The app's WebR session persists between submissions, so a rerun must agree.
  await reset();
  check('exercise rerun: ' + ex.t, await R.run(src), ex.o);
}

// --- data contract ----------------------------------------------------------
console.log('');
console.log('--- data contract ---');
const CONCEPTS = ["vectors","data types","data frames","indexing","apply family","functions",
  "tibbles & pipes","ggplot2 basics","dplyr verbs","grouping & summaries","tidy data","joins",
  "strings & regex","factors & dates","iteration"];
checkTrue('n is 8', CH.n === 8, String(CH.n));
checkTrue('title is the r4ds chapter title', CH.title === 'Workflow: getting help', CH.title);
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/workflow-help.html', CH.src);
checkTrue('sections between 6 and 9', CH.sections.length >= 6 && CH.sections.length <= 9, String(CH.sections.length));
checkTrue('last section is Summary', CH.sections[CH.sections.length - 1].t === 'Summary');
checkTrue('the summary points at R chapter 9, Layers',
  /next chapter is Layers/.test(CH.sections[CH.sections.length - 1].body.map((b) => b[1]).join(' ')));
checkTrue('exactly 10 questions', CH.questions.length === 10, String(CH.questions.length));
checkTrue('every question has a q and an a',
  CH.questions.every((q) => typeof q.q === 'string' && q.q && typeof q.a === 'string' && q.a));
checkTrue('every exercise concept is on the R ladder',
  CH.exercises.every((e) => CONCEPTS.includes(e.c)), CH.exercises.map((e) => e.c).join(', '));
checkTrue('exercise concepts are functions and data types only',
  CH.exercises.every((e) => e.c === 'functions' || e.c === 'data types'),
  CH.exercises.map((e) => e.c).join(', '));
checkTrue('every exercise has 3 hints and a non-empty o',
  CH.exercises.every((e) => Array.isArray(e.h) && e.h.length === 3 && typeof e.o === 'string' && e.o.length > 0));
checkTrue('every exercise is tagged book:r08', CH.exercises.every((e) => e.book === 'r08'));
checkTrue('every body block is p, code or note',
  BODY.every((b) => b.kind === 'p' || b.kind === 'code' || b.kind === 'note'));
const proseText = [CH.blurb,
  ...BODY.filter((b) => b.kind !== 'code').map((b) => b.text),
  ...CH.questions.flatMap((q) => [q.q, q.a]),
  ...CH.exercises.flatMap((e) => [e.t, e.b, ...e.h])].join('\n');
checkTrue('register: no exclamation marks in prose', !/!(?!=)/.test(proseText));

await R.close();
done();

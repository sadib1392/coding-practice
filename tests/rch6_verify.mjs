// R chapter 6 (Workflow: scripts and projects) — output verification.
//
// Everything asserted here is read out of book/r06.js and executed in WebR, the
// same R 4.6.0 build the app runs. Nothing is hardcoded twice: if a shown output
// in the chapter drifts from what WebR prints, this script fails.
//
// What it checks:
//   1. Chapter shape — counts, ids, concepts, register.
//   2. Every shown output. A ["code"] block immediately followed by another
//      ["code"] block is a source/expected pair; the first is run and the second
//      is diffed against the transcript. Code blocks with no following code
//      block are deliberately output-free and must match the allowlist below.
//   3. Every executable claim made in a reveal-answer question.
//   4. All four exercise reference solutions against their `o`.
//   5. Idempotence: every exercise solution is run twice and must print the
//      same thing both times, because the app's WebR filesystem and global
//      environment persist across submissions within one session.
//
// Run from the repo root:  node tests/rch6_verify.mjs
import { readFileSync } from 'node:fs';
import { makeR, makeChecker } from './rverify.mjs';

/* ---------- load the chapter data file the way the browser does ---------- */
const SRC = new URL('../book/r06.js', import.meta.url);
const win = {};
new Function('window', readFileSync(SRC, 'utf8'))(win);
const CH = win.BOOK_R.chapters.r06;

const { check, checkTrue, done } = makeChecker('r06');

// Trailing spaces from R's column padding are invisible on screen, so the
// chapter text drops them. Compare per-line with trailing whitespace removed.
const trimLines = (s) => String(s).split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');

/* ---------- 1. shape ---------- */
checkTrue('chapter id and number', CH.n === 6, 'n is ' + CH.n);
check('title', CH.title, 'Workflow: scripts and projects');
check('src', CH.src, 'https://r4ds.hadley.nz/workflow-scripts.html');
checkTrue('pkgs is empty', Array.isArray(CH.pkgs) && CH.pkgs.length === 0);
checkTrue('section count 6-9', CH.sections.length >= 6 && CH.sections.length <= 9, 'got ' + CH.sections.length);
check('last section is Summary', CH.sections[CH.sections.length - 1].t, 'Summary');
checkTrue('exactly 10 questions', CH.questions.length === 10, 'got ' + CH.questions.length);
checkTrue('exactly 4 exercises', CH.exercises.length === 4, 'got ' + CH.exercises.length);

const CONCEPTS = ['vectors', 'data types', 'data frames', 'indexing', 'apply family', 'functions',
  'tibbles & pipes', 'ggplot2 basics', 'dplyr verbs', 'grouping & summaries', 'tidy data',
  'joins', 'strings & regex', 'factors & dates', 'iteration'];
CH.exercises.forEach((ex, i) => {
  checkTrue('exercise ' + (i + 1) + ' concept is a ladder concept', CONCEPTS.includes(ex.c), 'got ' + ex.c);
  checkTrue('exercise ' + (i + 1) + ' book id', ex.book === 'r06', 'got ' + ex.book);
  checkTrue('exercise ' + (i + 1) + ' has non-null o', ex.o != null && ex.o !== '');
  checkTrue('exercise ' + (i + 1) + ' has 3 hints', Array.isArray(ex.h) && ex.h.length === 3);
});

// Register: the whole chapter, prose and code alike, is free of exclamation marks.
const ALL_TEXT = JSON.stringify(CH);
checkTrue('no exclamation marks anywhere', !ALL_TEXT.includes('!'), 'found one');

// The environment-honesty note has to be in the first section, not buried.
const firstNotes = CH.sections[0].body.filter((b) => b[0] === 'note').map((b) => b[1]).join(' ');
checkTrue('section 1 discloses the missing RStudio environment',
  /RStudio/.test(firstNotes) && /WebR/.test(firstNotes) && /\.Rproj/.test(firstNotes),
  'first-section note does not disclose');

/* ---------- 2. collect source/expected pairs and output-free blocks ---------- */
const pairs = [];
const outputFree = [];
CH.sections.forEach((sec, si) => {
  const body = sec.body;
  for (let i = 0; i < body.length; i++) {
    if (body[i][0] !== 'code') continue;
    if (body[i + 1] && body[i + 1][0] === 'code') {
      pairs.push({ label: `s${si + 1} "${sec.t}" block ${i}`, code: body[i][1], want: body[i + 1][1] });
      i++;
    } else {
      outputFree.push({ label: `s${si + 1} "${sec.t}" block ${i}`, code: body[i][1] });
    }
  }
});

// Only two blocks in the chapter are allowed to show no output, and both are
// about an environment this app does not have: an RStudio editor diagnostic,
// and a desktop project folder layout. Neither is R that can be run.
const EXPECTED_OUTPUT_FREE = [
  { why: 'RStudio margin diagnostic — an editor message, not R output', match: /RStudio marks this line in the margin/ },
  { why: 'desktop project folder layout — a directory tree, not code', match: /bike-counts\.Rproj/ },
];
checkTrue('exactly 2 output-free code blocks', outputFree.length === EXPECTED_OUTPUT_FREE.length,
  'got ' + outputFree.length + ': ' + outputFree.map((b) => b.label).join(', '));
EXPECTED_OUTPUT_FREE.forEach((expect, i) => {
  checkTrue('output-free block ' + (i + 1) + ' is the ' + expect.why,
    outputFree[i] && expect.match.test(outputFree[i].code),
    'got ' + JSON.stringify((outputFree[i] || {}).code || '').slice(0, 80));
});
checkTrue('at least 20 shown outputs are verified', pairs.length >= 20, 'got ' + pairs.length);

/* ---------- run everything ---------- */
const R = await makeR([]);

for (const p of pairs) {
  check(p.label, trimLines(await R.run(p.code)), trimLines(p.want));
}

/* ---------- 3. executable claims made in the questions ---------- */
const q = (i) => CH.questions[i].a;

const qCounts = await R.run('rm(list = ls())\ntotal <- sum(counts)\ncounts <- c(12, 31, 7, 22)');
check('Q3 claim: wrong order errors', trimLines(qCounts), "Error: object 'counts' not found");
checkTrue('Q3 answer quotes that error', q(2).includes("Error: object 'counts' not found"));

const qDates = await R.run('sort(c("11-02-2026 counts.csv", "9-1-2026 counts.csv", "30-01-2026 counts.csv"))');
checkTrue('Q5 claim: 9-1-2026 sorts after 30-01-2026',
  trimLines(qDates).indexOf('"9-1-2026') > trimLines(qDates).indexOf('"30-01-2026'), trimLines(qDates));
checkTrue('Q5 answer states that order', q(4).includes('9-1-2026 sorts after 30-01-2026'));

const qScripts = await R.run('sort(c("1-load.R", "2-clean.R", "10-report.R"))');
const s = trimLines(qScripts);
checkTrue('Q6 claim: 10-report.R lands between 1-load.R and 2-clean.R',
  s.indexOf('"1-load.R"') < s.indexOf('"10-report.R"') && s.indexOf('"10-report.R"') < s.indexOf('"2-clean.R"'), s);
const qPadded = await R.run('sort(c("01-load.R", "02-clean.R", "10-report.R"))');
check('Q6 claim: padding restores the order', trimLines(qPadded),
  '[1] "01-load.R"   "02-clean.R"  "10-report.R"');

check('Q7 claim: clean ls() prints character(0)', trimLines(await R.run('rm(list = ls())\nls()')), 'character(0)');
checkTrue('Q7 answer names character(0)', q(6).includes('character(0)'));

const qThreshold = await R.run('rm(list = ls())\nover_threshold <- function(values) values[values > threshold]\nover_threshold(c(2, 8, 5))');
check('Q9 claim: fresh session loses the global', trimLines(qThreshold), "Error: object 'threshold' not found");
checkTrue('Q9 answer quotes that error', q(8).includes("Error: object 'threshold' not found"));

// Q10 rests on there being a working directory that relative paths resolve
// against. Verified rather than asserted: getwd() is a real path, and a bare
// file name written there is found again by the same bare name.
const qWd = trimLines(await R.run('getwd()'));
checkTrue('Q10 claim: the session has a working directory', /^\[1\] "\/.+"$/.test(qWd), qWd);
check('Q10 claim: a relative name resolves against it',
  trimLines(await R.run('writeLines("probe", "wd-probe.txt")\nfile.exists(file.path(getwd(), "wd-probe.txt"))')), '[1] TRUE');

/* ---------- 4 + 5. exercise reference solutions, run twice ---------- */
// Written the way a learner would write them: <- for assignment, no for loops,
// relative paths only, and every write replaces the file rather than appending.
const SOLUTIONS = [
  'file_names <- c("2026-02-11-counts.csv", "2026-01-09-counts.csv", "2026-01-30-counts.csv")\nordered_names <- sort(file_names)\nordered_names\nordered_names[1]',
  'above <- function(values, limit) values[values > limit]\nabove(c(3, 12, 7, 20), 8)',
  'writeLines(c("north,12", "south,31", "east,7"), "station-readings.txt")\ncat(readLines("station-readings.txt"), sep = "\\n")',
  'stations <- data.frame(station = c("north", "south", "east"), count = c(12, 31, 7))\nwrite.csv(stations, "station-counts.csv", row.names = FALSE)\nread.csv("station-counts.csv")',
];

for (let i = 0; i < SOLUTIONS.length; i++) {
  const ex = CH.exercises[i];
  const first = trimLines(await R.run(SOLUTIONS[i]));
  check(`exercise ${i + 1} "${ex.t}" matches o`, first, trimLines(ex.o));
  const second = trimLines(await R.run(SOLUTIONS[i]));
  check(`exercise ${i + 1} "${ex.t}" is idempotent (second run)`, second, first);
}
// And once more after every solution has touched the filesystem and the global
// environment, to catch one that only survives being run back to back.
for (let i = 0; i < SOLUTIONS.length; i++) {
  check(`exercise ${i + 1} still matches o after the whole set has run`,
    trimLines(await R.run(SOLUTIONS[i])), trimLines(CH.exercises[i].o));
}

// The two file-writing exercises must leave a file behind that a rerun replaces
// rather than grows. Length is the tell an append would fail.
check('station-readings.txt holds exactly 3 lines after repeated runs',
  trimLines(await R.run('length(readLines("station-readings.txt"))')), '[1] 3');
check('station-counts.csv holds a header plus exactly 3 rows after repeated runs',
  trimLines(await R.run('length(readLines("station-counts.csv"))')), '[1] 4');

await R.close();
done();

// Verifies R book chapter 25 (book/r25.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r25.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (pct_of_total, deliveries, p, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch25_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r25.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r25;

const { check, checkTrue, done } = makeChecker('rch25');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 25', CH.n === 25);
checkTrue('title is "Functions"', CH.title === 'Functions');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/functions.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists dplyr, tibble and ggplot2',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'dplyr,tibble,ggplot2');
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
checkTrue('at least 3 exercises are tagged functions',
  CH.exercises.filter((e) => e.c === 'functions').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r25' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('no hint hands over a complete function definition',
  CH.exercises.every((e) => e.h.every((h) => h.indexOf('<- function(') === -1)));
checkTrue('summary points forward to R chapter 26 (iteration)',
  /iteration/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const S1 = 'When a function earns its place';
const S2 = 'Writing a vector function';
const S3 = 'Arguments, defaults, and returning early';
const S4 = 'Data frame functions and the indirection problem';
const S5 = 'Embracing more than one argument';
const S6 = 'Plot functions';
const S7 = 'Style and naming';

await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 the same idea written three times');

await pair(S2, 0, 's2 one definition, three answers');
await pair(S2, 2, 's2 formals names the arguments');
await pair(S2, 4, 's2 a body variable does not leak');

await pair(S3, 0, 's3 a default argument');
await pair(S3, 2, 's3 the default is stored in the definition');
await pair(S3, 4, 's3 one NA poisons every percentage');
await pair(S3, 6, 's3 na.rm passed through');
await pair(S3, 8, 's3 early return on a zero total');
await pair(S3, 10, 's3 a summary function returns one number');
await pair(S3, 12, 's3 partial argument matching works');

await pair(S4, 0, 's4 the deliveries tibble prints');
await pair(S4, 2, 's4 group_by(group_var) fails');
await pair(S4, 4, 's4 the full message names the argument');
await pair(S4, 6, 's4 embracing fixes it, for two columns');

await pair(S5, 0, 's5 two embraced column arguments');
await pair(S5, 2, 's5 an embraced tidy selection');
await pair(S5, 4, 's5 all_of() for string column names');
await pair(S5, 6, 's5 a plain numeric argument needs nothing');
await pair(S5, 8, 's5 an embraced string groups by the constant');

await pair(S6, 0, 's6 the plot a function returned, inspected');
await silent(S6, 2, 's6 printing a plot emits no text');
await pair(S6, 3, 's6 labels and counts of a built plot');
await pair(S6, 5, 's6 a required argument left out');

await pair(S7, 0, 's7 formals of the plot function');
await silent(S7, 2, 's7 a definition prints nothing');
await pair(S7, 3, 's7 calling the styled function');

// ------------------------------------- executable prose/question claims ----
// s2 prose / question 2: the last expression evaluated is the value.
check('claim: the last expression in the body is the value',
  await R.run('last_wins <- function(x) {\n  x + 1\n  x * 2\n}\n\nlast_wins(5)'), '[1] 10');
// s2 prose: a vector function returns a vector as long as its input.
check('claim: pct_of_total returns one value per input value',
  await R.run('length(pct_of_total(weekday_bins))\nlength(weekday_bins)'), '[1] 5\n[1] 5');
// question 3: the body variable is still absent after all of the above.
check('claim: running never entered the workspace', await R.run('exists("running")'), '[1] FALSE');
// question 4: the default is readable off the definition.
check('claim: the stored default of digits is 1',
  await R.run('formals(pct_of_total)$digits'), '[1] 1');
// question 6: return() leaves the call early.
check('claim: return() exits before the last expression',
  await R.run('sign_of <- function(x) {\n  if (x > 0) {\n    return("pos")\n  }\n  "other"\n}\n\nsign_of(1)\nsign_of(-1)'),
  '[1] "pos"\n[1] "other"');
// question 7: the full dplyr message names the parameter, not the column.
check('claim: the masking error names group_var',
  await R.run('broken_by <- function(df, group_var) {\n  df |> group_by(group_var) |> summarise(n = sum(parcels), .groups = "drop")\n}\n\ncat(tryCatch(broken_by(deliveries, depot), error = function(e) conditionMessage(e)))'),
  'Must group by variables found in `.data`.\n✖ Column `group_var` is not found.'),
// question 9: all_of() given a bare name is an error, unlike an embraced string.
checkTrue('claim: all_of() on a bare name errors',
  (await R.runErr('col_means_str(deliveries, c(parcels, km))')) !== null,
  'expected an error line');
check('claim: an embraced string still works in a tidy selection',
  await R.run('col_means(deliveries, "parcels")'),
  '# A tibble: 1 × 1\n  parcels\n    <dbl>\n1    26.8');
// s5 note: grouping by a constant sums every parcel in the table.
check('claim: 241 is every parcel in the table', await R.run('sum(deliveries$parcels)'), '[1] 241');
// s6 prose: the bar counts 4 3 2 belong to east, north and south.
check('claim: the counted depots are east, north, south',
  await R.run('names(table(deliveries$depot))\nas.integer(table(deliveries$depot))'),
  '[1] "east"  "north" "south"\n[1] 4 3 2');
// s6 note / question 10: a bare plot object still emits nothing at the end.
check('claim: printing q emits no text', await R.run('q'), '');

// ---------------------------------------- exercise reference solutions ----
const SOLUTIONS = [
// 1 — A share above a cutoff
`pct_above <- function(x, cutoff = 10) {
  round(100 * mean(x > cutoff), 1)
}

readings <- c(4, 12, 8, 15, 3, 21, 9)

pct_above(readings)
pct_above(readings, cutoff = 5)`,
// 2 — Three bands, two early exits
`band <- function(score, top = 90, mid = 70) {
  if (score >= top) {
    return("top")
  }
  if (score >= mid) {
    return("mid")
  }
  "low"
}

band(94)
band(71)
band(40)
band(71, mid = 75)`,
// 3 — Grouping by whichever column
`suppressMessages(library(dplyr))
library(tibble)

stalls <- tibble(
  market = c("quay", "quay", "hill", "hill", "hill", "gate"),
  trader = c("Ada", "Bo", "Ada", "Cyd", "Bo", "Cyd"),
  crates = c(6, 4, 9, 5, 7, 3)
)

crate_totals <- function(df, group_var) {
  df |>
    group_by({{ group_var }}) |>
    summarise(crates = sum(crates), .groups = "drop") |>
    arrange({{ group_var }})
}

crate_totals(stalls, market)
crate_totals(stalls, trader)`,
// 4 — A histogram function you can inspect
`library(ggplot2)
library(tibble)

hauls <- tibble(
  boat = c("Ren", "Sol", "Vim", "Kip", "Ash", "Nim"),
  kg = c(12, 18, 9, 24, 15, 21)
)

kg_hist <- function(df, var, binwidth = 5) {
  ggplot(df, aes(x = {{ var }})) +
    geom_histogram(binwidth = binwidth)
}

p <- kg_hist(hauls, kg)

length(p$layers)
class(p$layers[[1]]$geom)[1]
p$layers[[1]]$stat_params$binwidth
get_labs(p)$x`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrongEmbrace = await R.run(SOLUTIONS[2].replace(/\{\{ group_var \}\}/g, 'group_var'));
checkTrue('exercise 3 rejects the unembraced argument',
  wrongEmbrace !== CH.exercises[2].o, wrongEmbrace);
const wrongDefault = await R.run(SOLUTIONS[0].replace('cutoff = 10', 'cutoff = 5'));
checkTrue('exercise 1 rejects the wrong default',
  wrongDefault !== CH.exercises[0].o, wrongDefault);

await R.close();
done();

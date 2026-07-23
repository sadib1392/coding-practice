// Verifies R book chapter 22 (book/r22.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r22.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (gauges, readings, the files on disk, and so on).
//
// HONESTY: the arrow package cannot be installed in WebR — installPackages()
// reports no error but packageVersion("arrow") then fails with "there is no
// package called 'arrow'". Every arrow block in the chapter is therefore shown
// with no output, and this script asserts that is still true rather than
// running them. The parquet work that IS shown with output uses nanoparquet,
// which does install, and every one of those blocks is executed below.
//
// NETWORK: nothing here touches the network beyond WebR's own package
// downloads. The guard below asserts that no executed block contains a URL.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch22_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r22.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r22;

const { check, checkTrue, done } = makeChecker('rch22');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 22', CH.n === 22);
checkTrue('title is "Arrow"', CH.title === 'Arrow');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/arrow.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists nanoparquet and dplyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'nanoparquet,dplyr');
checkTrue('pkgs does NOT list arrow (it cannot install in WebR)',
  CH.pkgs.indexOf('arrow') === -1);
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
checkTrue('exercise concepts stay within the chapter 22 set',
  CH.exercises.every((e) => ['data frames', 'tibbles & pipes', 'grouping & summaries'].includes(e.c)),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r22' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 23 (hierarchical data)',
  /hierarchical data/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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

const S1 = 'Where csv gives out';
const S2 = 'Writing and reading a parquet file';
const S3 = 'Types that survive the trip';
const S4 = 'Size, and reading only the columns you need';
const S5 = 'One dataset, many files';
const S6 = 'dplyr over data you have not loaded';
const S7 = 'What goes wrong';

// ------------------------------------------------------------- honesty ----
// The arrow blocks must stay output-free: an arrow block may never be followed
// by a block claiming to be its output.
// "Output-free" means structurally: the body row right after an arrow code row
// is never another code row, so nothing in the file can be read as its output.
const isArrow = (s) => /library\(arrow\)|open_dataset|write_dataset|levels_ds/.test(s);
let arrowSeen = 0;
for (const s of CH.sections) {
  s.body.forEach((row, i) => {
    if (row[0] !== 'code' || !isArrow(row[1])) return;
    arrowSeen++;
    const next = s.body[i + 1];
    checkTrue('arrow block in "' + s.t + '" is followed by no output block',
      next === undefined || next[0] !== 'code',
      next ? next[0] + ': ' + next[1].slice(0, 50) : 'end of section');
  });
}
checkTrue('the arrow blocks were found', arrowSeen === 3, 'got ' + arrowSeen);
// Nothing else in the chapter may mention arrow inside a code block, or the
// claim "every arrow block is output-free" would be false.
const allCode = CH.sections.flatMap((s) => s.body.filter((b) => b[0] === 'code').map((b) => b[1]));
const arrowCode = allCode.filter((c) => /library\(arrow\)|open_dataset|write_dataset|levels_ds/.test(c));
checkTrue('exactly 3 code blocks mention arrow', arrowCode.length === 3, 'got ' + arrowCode.length);
// The chapter must disclose that arrow does not run here.
checkTrue('a note discloses that arrow cannot be installed in this app',
  CH.sections.some((s) => s.body.some((b) => b[0] === 'note' &&
    /arrow package cannot be installed/i.test(b[1]))));
// And the measured file sizes must be flagged as measurements, not laws.
checkTrue('a note flags the byte counts as measured rather than fixed',
  CH.sections.some((s) => s.body.some((b) => b[0] === 'note' &&
    /real measurements/i.test(b[1]))));

const R = await makeR(CH.pkgs);

// Every block this script executes is checked for a URL first: this chapter
// must not reach the network, and a stray URL is how that would happen.
const noNetwork = (code, label) => {
  if (/https?:\/\//.test(code)) {
    console.log('FAIL ' + label + ' — executed block contains a URL');
    process.exit(1);
  }
};

// Run code block i of a section and diff against block i+1 of the same section.
const pair = async (title, i, label) => {
  const c = codes(title);
  const lbl = label || (title + ' [' + i + ']');
  noNetwork(c[i], lbl);
  check(lbl, await R.run(c[i]), c[i + 1]);
};
// Run a code block that is shown with no output block after it.
const silent = async (title, i, label) => {
  const c = codes(title);
  const lbl = label || (title + ' [' + i + '] silent');
  noNetwork(c[i], lbl);
  check(lbl, await R.run(c[i]), '');
};

// The chapter starts from a clean slate; the WebR filesystem persists between
// runs, so the files written below are all overwritten idempotently.
await R.run('rm(list = ls())');

// ------------------------------------------------- chapter code blocks ----
checkTrue('section 1 shows no code', codes(S1).length === 0);

await silent(S2, 0, 's2 library() calls print nothing');
await pair(S2, 1, 's2 write_parquet then file.exists');
await pair(S2, 3, 's2 reading the file back');
await pair(S2, 5, 's2 class is tbl and data.frame');
await pair(S2, 7, 's2 read_parquet_info');

await pair(S3, 0, 's3 types survive parquet');
await pair(S3, 2, 's3 types do not survive csv');
await pair(S3, 4, 's3 the schema records the types');

await pair(S4, 0, 's4 csv is more than ten times larger');
await pair(S4, 2, 's4 col_select reads two columns of three');

await pair(S5, 0, 's5 partitioned directory listing');
await pair(S5, 2, 's5 reading one partition file');
await pair(S5, 4, 's5 the partition column is not in the file');

await pair(S6, 1, 's6 dplyr over the in-memory frame');
await pair(S6, 3, 's6 col_select then group and summarise');

await pair(S7, 0, 's7 missing file errors at the open');
await pair(S7, 2, 's7 unknown column errors at the schema');

// ------------------------------------------- executable prose/question claims ----
// s2 prose: 751 bytes for four rows, larger than the same data as csv.
check('claim: the four-row parquet file is larger than the same data as csv',
  await R.run('write.csv(gauges, "gauges.csv", row.names = FALSE)\nfile.size("gauges.parquet") > file.size("gauges.csv")'),
  '[1] TRUE');
// s2 note / question 3: the tbl class is what supplies the compact header, so
// the plain data frame printing is what the same object gives without it.
check('claim: without tibble printing the same object prints in the plain style',
  await R.run('print.data.frame(back)'),
  '  station river level_m\n1   Alder  Ouse    1.24\n2    Birk   Wye    0.87\n3  Cotton  Ouse    2.05\n4  Dunlin   Wye    1.61');
// s3 prose / question 5: only the integer survived the csv round trip.
check('claim: exactly one of the three columns keeps its class through csv',
  await R.run('sum(sapply(read.csv("mixed.csv"), class) == sapply(mixed, class))'),
  '[1] 1');
// s4 prose: the ratio is above ten, and the station column is the repetitive one.
check('claim: csv is more than 16 times the size of the parquet file',
  await R.run('file.size("readings.csv") > 16 * file.size("readings.parquet")'), '[1] TRUE');
check('claim: the station column holds five distinct values over 60000 rows',
  await R.run('length(unique(readings$station))\nnrow(readings)'), '[1] 5\n[1] 60000');
// s4 prose / question 2: col_select changes the columns, never the rows.
check('claim: col_select keeps every row', await R.run('nrow(narrow) == nrow(readings)'), '[1] TRUE');
// s5 prose / question 7: the partition value lives only in the directory name.
check('claim: river is absent from both partition files',
  await R.run('"river" %in% unlist(lapply(parts, function(p) names(read_parquet(p))))'),
  '[1] FALSE');
check('claim: the two partition files hold two rows each',
  await R.run('as.integer(sapply(parts, function(p) nrow(read_parquet(p))))'), '[1] 2 2');
// question 6: read_parquet_info answers from metadata alone.
check('claim: read_parquet_info reports 4 rows and 3 columns for the gauges file',
  await R.run('info <- read_parquet_info("gauges.parquet")\ninfo$num_rows\ninfo$num_cols'),
  '[1] 4\n[1] 3');
// question 10: both packages export read_parquet, so attach order decides.
check('claim: read_parquet is exported by nanoparquet',
  await R.run('"read_parquet" %in% getNamespaceExports("nanoparquet")'), '[1] TRUE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Types out and back
`library(nanoparquet)
suppressMessages(library(dplyr))

kilns <- data.frame(
  fired_on = as.Date(c("2026-05-16", "2026-05-02", "2026-05-09")),
  glaze = factor(c("matte", "gloss", "matte")),
  pots = c(19L, 24L, 31L)
)

write_parquet(kilns, "kilns.parquet")
back <- read_parquet("kilns.parquet")

sapply(back, class)
arrange(back, fired_on)`,
// 2 — Only the columns you asked for
`library(nanoparquet)
suppressMessages(library(dplyr))

hives <- data.frame(
  apiary = c("Ridge", "Marsh", "Ridge", "Fen", "Marsh", "Fen"),
  hive = c("h1", "h2", "h3", "h4", "h5", "h6"),
  honey_kg = c(14.2, 9.8, 17.5, 11.1, 12.4, 8.3)
)

write_parquet(hives, "hives.parquet")

read_parquet("hives.parquet", col_select = c("apiary", "honey_kg")) |>
  arrange(desc(honey_kg)) |>
  head(3)`,
// 3 — Crates by port
`library(nanoparquet)
suppressMessages(library(dplyr))

hauls <- data.frame(
  port = c("Rye", "Hoy", "Rye", "Fowey", "Hoy", "Rye"),
  crates = c(12L, 7L, 15L, 9L, 11L, 6L)
)

write_parquet(hauls, "hauls.parquet")

read_parquet("hauls.parquet") |>
  group_by(port) |>
  summarise(trips = n(), total = sum(crates)) |>
  arrange(port)`,
// 4 — Two files, one table
`library(nanoparquet)
suppressMessages(library(dplyr))

north <- data.frame(plot = c("n1", "n2"), yield_t = c(3.4, 2.9))
south <- data.frame(plot = c("s1", "s2"), yield_t = c(4.1, 3.7))

write_parquet(north, "north.parquet")
write_parquet(south, "south.parquet")

both <- rbind(read_parquet("north.parquet"), read_parquet("south.parquet"))

nrow(both)
arrange(both, plot)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  noNetwork(SOLUTIONS[i], 'exercise ' + (i + 1));
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrongSort = await R.run(SOLUTIONS[0].replace('arrange(back, fired_on)', 'arrange(back, pots)'));
checkTrue('exercise 1 rejects the wrong sort column', wrongSort !== CH.exercises[0].o, wrongSort);
const wrongCols = await R.run(SOLUTIONS[1].replace('c("apiary", "honey_kg")', 'c("apiary", "hive")'));
checkTrue('exercise 2 rejects the wrong col_select', wrongCols !== CH.exercises[1].o, wrongCols);
const wrongAgg = await R.run(SOLUTIONS[2].replace('sum(crates)', 'max(crates)'));
checkTrue('exercise 3 rejects the wrong summary', wrongAgg !== CH.exercises[2].o, wrongAgg);
const wrongBind = await R.run(SOLUTIONS[3].replace('arrange(both, plot)', 'arrange(both, desc(plot))'));
checkTrue('exercise 4 rejects the reversed order', wrongBind !== CH.exercises[3].o, wrongBind);

await R.close();
done();

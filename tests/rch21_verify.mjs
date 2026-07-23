// Verifies R book chapter 21 (book/r21.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r21.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (con, the hives table, the lazy tbl, and so on).
// The database is SQLite ":memory:", so nothing here touches the network beyond
// the WebR package repo.
//
// One block is deliberately NOT run: the RPostgres connection in section 1.
// It needs a database server on a network this app cannot reach, so it is shown
// output-free and this script asserts it is input rather than executing it.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch21_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r21.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r21;

const { check, checkTrue, done } = makeChecker('rch21');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 21', CH.n === 21);
checkTrue('title is "Databases"', CH.title === 'Databases');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/databases.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists only packages that install in WebR and the exercises need',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'DBI,RSQLite,dbplyr,dplyr,tibble');
checkTrue('pkgs does not claim a driver that was never installed',
  !CH.pkgs.includes('RPostgres') && !CH.pkgs.includes('RMariaDB') && !CH.pkgs.includes('duckdb'));
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
checkTrue('exercise concepts are dplyr verbs / grouping & summaries / joins',
  CH.exercises.every((e) => ['dplyr verbs', 'grouping & summaries', 'joins'].includes(e.c)),
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r21' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('every exercise closes its connection',
  CH.exercises.every((e) => /[Dd]isconnect/.test(e.b) || /[Dd]isconnect/.test(e.h.join(' '))),
  'a leaked connection prints a GC warning into a later exercise');
checkTrue('summary points forward to R chapter 22 (Arrow)',
  /Arrow/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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

const S1 = 'Tables that live outside R';
const S2 = 'Connecting, and putting a table in';
const S3 = 'Asking in SQL';
const S4 = 'GROUP BY, and the clauses in order';
const S5 = 'dbplyr: dplyr verbs that become SQL';
const S6 = 'When the query actually runs';
const S7 = 'Joins, changes, and closing up';

// ------------------------------- the server connection is output-free ----
// Honesty contract: no database server is reachable from this app, so the
// RPostgres block must be input the learner would type, never a captured result.
const s1 = codes(S1);
checkTrue('section 1 shows a server connection block', s1.length >= 2, 'got ' + s1.length);
checkTrue('the server connection block is input, not captured output',
  /RPostgres::Postgres\(\)/.test(s1[1]) && /dbConnect/.test(s1[1]));
checkTrue('the server connection block shows no output',
  !/^\s*(\[1\]|# A tibble|<SQL>)/m.test(s1[1]));
checkTrue('section 1 discloses that the server block was not run',
  notes(S1).some((n) => /environment variable/.test(n)) &&
  section(S1).body.some((b) => b[0] === 'p' && /was not run/.test(b[1])));
checkTrue('no password is written into the chapter as a literal',
  /Sys\.getenv/.test(s1[1]) && !/password = "/.test(s1[1]));

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
  console.log('skip: all WebR execution checks for rch21');
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
// s1 code block 1 (RPostgres) is deliberately never run — see the note above.

await pair(S2, 0, 's2 a fresh in-memory database has no tables');
await pair(S2, 2, 's2 dbWriteTable creates the table');
await pair(S2, 4, 's2 dbReadTable returns a base data frame');

await pair(S3, 0, 's3 SELECT * with ORDER BY');
await pair(S3, 2, 's3 naming columns');
await pair(S3, 4, 's3 WHERE filters rows');
await pair(S3, 6, 's3 AND with a quoted text value');
await pair(S3, 8, 's3 the result is a data frame');
await pair(S3, 10, 's3 an unknown table errors');

await pair(S4, 0, 's4 GROUP BY with COUNT and SUM');
await pair(S4, 2, 's4 a parameterised query');

await pair(S5, 0, 's5 tbl returns a lazy table');
await pair(S5, 2, 's5 printing a lazy table shows ?? rows');
await pair(S5, 4, 's5 three verbs become one statement');
await pair(S5, 6, 's5 collect runs it and returns a tibble');
await pair(S5, 8, 's5 group_by and summarise become GROUP BY');
await pair(S5, 10, 's5 the grouped result');
await pair(S5, 12, 's5 mutate becomes a computed column');

await pair(S6, 0, 's6 nrow on a lazy table is NA');
await pair(S6, 2, 's6 head becomes LIMIT');
await pair(S6, 4, 's6 the limited result');
await pair(S6, 6, 's6 toupper translates to UPPER');
await pair(S6, 8, 's6 an untranslatable function fails at collect');

await pair(S7, 0, 's7 a second table');
await pair(S7, 2, 's7 a SQL join');
await pair(S7, 4, 's7 left_join translates to a subquery');
await pair(S7, 6, 's7 the joined result');
await pair(S7, 8, 's7 dbExecute returns rows affected');
await pair(S7, 10, 's7 disconnecting invalidates the connection');

// ------------------------------------------- executable prose/question claims ----
// The chapter disconnected at the end of section 7, so claims get a fresh
// database of their own. It is closed again at the bottom of this block.
await R.run(`con <- dbConnect(RSQLite::SQLite(), ":memory:")
dbWriteTable(con, "hives", hives)
dbWriteTable(con, "apiaries", apiaries)`);

// s2 note / question 3: DBI returns a base data frame; as_tibble converts it.
check('claim: as_tibble turns a DBI result into a tibble',
  await R.run('class(as_tibble(dbGetQuery(con, "SELECT * FROM hives")))'),
  '[1] "tbl_df"     "tbl"        "data.frame"');
// s4 prose / question 4: the clauses have to be written in one fixed order.
check('claim: GROUP BY after ORDER BY is a syntax error',
  await R.run('dbGetQuery(con, "SELECT apiary FROM hives ORDER BY apiary GROUP BY apiary")'),
  'Error: near "GROUP": syntax error');
// s3 note / question 6: SQLite accepts == and bare double quotes, so the wrong
// spellings appear to work — which is exactly why they are worth avoiding.
check('claim: SQLite accepts == as a synonym for =',
  await R.run('nrow(dbGetQuery(con, "SELECT hive FROM hives WHERE apiary == \'Birch\'"))'), '[1] 3');
// s3 note / question 6: with a column of that name present, double quotes name
// the COLUMN and the query silently returns different rows.
check('claim: double quotes compare two columns when such a column exists',
  await R.run(`dbWriteTable(con, "trap", tibble(
  apiary = c("Rowan", "Birch", "Alder"),
  Birch = c("Rowan", "Rowan", "Alder"),
  n = c(1L, 2L, 3L)
))
dbGetQuery(con, "SELECT n FROM trap WHERE apiary = \\"Birch\\" ORDER BY n")
dbGetQuery(con, "SELECT n FROM trap WHERE apiary = 'Birch' ORDER BY n")`),
  '  n\n1 1\n2 3\n  n\n1 2');
// s4 note / question 7: a value with an apostrophe goes through params safely.
check('claim: params carries a value containing a quote without breaking the statement',
  await R.run('nrow(dbGetQuery(con, "SELECT hive FROM hives WHERE apiary = ? ORDER BY hive", params = list("O\'Brien")))'),
  '[1] 0');
// s5 prose: mean() translates to AVG, alongside the n()/COUNT and sum()/SUM shown.
check('claim: mean translates to AVG',
  await R.run('show_query(tbl(con, "hives") |> group_by(apiary) |> summarise(a = mean(honey_kg, na.rm = TRUE)))'),
  '<SQL>\nSELECT `apiary`, AVG(`honey_kg`) AS `a`\nFROM `hives`\nGROUP BY `apiary`');
// s6 prose / question 9: show_query sends nothing, so an unknown function is
// happily written into the SQL and only collect() finds out.
check('claim: show_query passes an unknown function straight through',
  await R.run('show_query(tbl(con, "hives") |> mutate(z = my_own_fn(frames)))'),
  '<SQL>\nSELECT `hives`.*, my_own_fn(`frames`) AS `z`\nFROM `hives`');
// question 2: an in-memory database starts empty.
check('claim: a second in-memory connection is a separate, empty database',
  await R.run(`other <- dbConnect(RSQLite::SQLite(), ":memory:")
dbListTables(other)
dbDisconnect(other)`), 'character(0)');
// s7 prose: dbExecute reports rows affected rather than returning data.
check('claim: dbExecute returns a count, not a data frame',
  await R.run('class(dbExecute(con, "DELETE FROM hives WHERE frames < 7"))'), '[1] "integer"');

await R.run('dbDisconnect(con)');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — A first query
`library(DBI)
library(RSQLite)
library(tibble)

con <- dbConnect(RSQLite::SQLite(), ":memory:")

boats <- tibble(
  boat = c("Aoife", "Brendan", "Ciara", "Donal", "Eimear"),
  port = c("Dingle", "Howth", "Dingle", "Kinsale", "Howth"),
  catch_kg = c(310, 145, 260, 480, 95)
)

dbWriteTable(con, "boats", boats)

dbGetQuery(con, "SELECT boat, catch_kg FROM boats WHERE catch_kg > 150 ORDER BY boat")

dbDisconnect(con)`,
// 2 — One row per port
`library(DBI)
library(RSQLite)
library(tibble)

con <- dbConnect(RSQLite::SQLite(), ":memory:")

dbWriteTable(con, "boats", tibble(
  boat = c("Aoife", "Brendan", "Ciara", "Donal", "Eimear"),
  port = c("Dingle", "Howth", "Dingle", "Kinsale", "Howth"),
  catch_kg = c(310, 145, 260, 480, 95)
))

dbGetQuery(con, "SELECT port, COUNT(*) AS boats, SUM(catch_kg) AS total FROM boats GROUP BY port ORDER BY port")

dbDisconnect(con)`,
// 3 — Verbs that become SQL
`library(DBI)
library(RSQLite)
library(tibble)
suppressMessages(library(dplyr))
suppressMessages(library(dbplyr))

con <- dbConnect(RSQLite::SQLite(), ":memory:")

dbWriteTable(con, "boats", tibble(
  boat = c("Aoife", "Brendan", "Ciara", "Donal", "Eimear"),
  port = c("Dingle", "Howth", "Dingle", "Kinsale", "Howth"),
  catch_kg = c(310, 145, 260, 480, 95)
))

q <- tbl(con, "boats") |>
  filter(catch_kg > 150) |>
  select(boat, port) |>
  arrange(boat)

show_query(q)
collect(q)

dbDisconnect(con)`,
// 4 — Two tables, one answer
`library(DBI)
library(RSQLite)
library(tibble)
suppressMessages(library(dplyr))
suppressMessages(library(dbplyr))

con <- dbConnect(RSQLite::SQLite(), ":memory:")

dbWriteTable(con, "boats", tibble(
  boat = c("Aoife", "Brendan", "Ciara", "Donal"),
  port = c("Dingle", "Howth", "Dingle", "Kinsale")
))
dbWriteTable(con, "ports", tibble(
  port = c("Dingle", "Howth", "Kinsale"),
  county = c("Kerry", "Dublin", "Cork")
))

joined <- tbl(con, "boats") |>
  left_join(tbl(con, "ports"), by = "port") |>
  select(boat, county) |>
  arrange(boat)

collect(joined)

dbDisconnect(con)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
// The guard matters as much as the check — a replace() whose pattern does not
// match would leave the correct solution in place and "prove" nothing.
const drift = async (i, from, to, label) => {
  const bad = SOLUTIONS[i].replace(from, to);
  if (!checkTrue(label + ' (drift was actually planted)', bad !== SOLUTIONS[i],
    'replace() did not match: ' + from)) return;
  const got = await R.run(bad);
  checkTrue(label, got !== CH.exercises[i].o, got);
};

await drift(0, 'catch_kg > 150', 'catch_kg > 100', 'exercise 1 rejects the wrong threshold');
await drift(1, 'SUM(catch_kg)', 'AVG(catch_kg)', 'exercise 2 rejects the wrong aggregate');
await drift(2, 'filter(catch_kg > 150)', 'filter(catch_kg > 200)', 'exercise 3 rejects the wrong filter');
await drift(3, 'arrange(boat)', 'arrange(desc(boat))', 'exercise 4 rejects the wrong order');

await R.close();
done();

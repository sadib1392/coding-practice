// Verification for book/r07.js — R Chapter 7: Data import.
//
// Every code block shown in the chapter is executed in WebR (R 4.6.0, the same
// runtime the app uses) and diffed against the output block the chapter prints
// next to it. Local R is a different version, with different readr, and is
// never consulted.
//
// Two directions of drift are caught:
//   1. The chapter's shown output no longer matches what R produces.
//   2. The chapter's code/output blocks were edited so a pair listed here is
//      no longer present, or no longer adjacent, in book/r07.js.
//
// Run from the repo root:  node tests/rch7_verify.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeR, makeChecker } from './rverify.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// --- load the chapter data the same way the browser would -------------------
global.window = {};
eval(fs.readFileSync(path.join(root, 'book', 'r07.js'), 'utf8'));
const CH = global.window.BOOK_R.chapters.r07;

// Flat list of every body block, in reading order, for adjacency checks.
const BODY = [];
CH.sections.forEach((s, si) => s.body.forEach((b, bi) => BODY.push({ si, bi, kind: b[0], text: b[1] })));

const { check, checkTrue, done } = makeChecker('r07');

// Assert the chapter really shows `code` immediately followed by `want`.
function shows(label, code, want) {
  const i = BODY.findIndex((b) => b.kind === 'code' && b.text === code);
  if (i < 0) return checkTrue(label + ' [in chapter]', false, 'code block not found in book/r07.js');
  const next = BODY[i + 1];
  const ok = next && next.kind === 'code' && next.text === want;
  return checkTrue(label + ' [in chapter]', ok,
    ok ? '' : 'block after this code is ' + JSON.stringify(next && next.text));
}

const R = await makeR(CH.pkgs || []);
// rm() clears objects only; attached packages and written files survive it,
// which is exactly how a reader moving down the chapter experiences it.
const reset = () => R.run('rm(list = ls())');
await reset();

// --- shown code block -> shown output block ---------------------------------
// keep:true means the block continues the previous one's objects on purpose.
const PAIRS = [
  // s0 Reading a csv file
  ['s0 write the file and show it',
   'library(readr)\nwriteLines(c("station,reading,taken_on",\n             "north,12,2026-03-01",\n             "south,31,2026-03-01",\n             "east,7,2026-03-02"), "readings.csv")\ncat(readLines("readings.csv"), sep = "\\n")',
   'station,reading,taken_on\nnorth,12,2026-03-01\nsouth,31,2026-03-01\neast,7,2026-03-02'],
  ['s0 read_csv with the column specification message',
   'readings <- read_csv("readings.csv")\nreadings',
   'Rows: 3 Columns: 3\n── Column specification ────────────────────────────────────────────────────────\nDelimiter: ","\nchr  (1): station\ndbl  (1): reading\ndate (1): taken_on\n\nℹ Use `spec()` to retrieve the full column specification for this data.\nℹ Specify the column types or set `show_col_types = FALSE` to quiet this message.\n# A tibble: 3 × 3\n  station reading taken_on  \n  <chr>     <dbl> <date>    \n1 north        12 2026-03-01\n2 south        31 2026-03-01\n3 east          7 2026-03-02'],
  ['s0 message silenced',
   'read_csv("readings.csv", show_col_types = FALSE)',
   '# A tibble: 3 × 3\n  station reading taken_on  \n  <chr>     <dbl> <date>    \n1 north        12 2026-03-01\n2 south        31 2026-03-01\n3 east          7 2026-03-02', true],
  ['s0 spec()',
   'spec(readings)',
   'cols(\n  station = col_character(),\n  reading = col_double(),\n  taken_on = col_date(format = "")\n)', true],

  // s1 When the first row is not the header
  ['s1 notes above the header',
   'writeLines(c("# Sensor export v3",\n             "# generated overnight",\n             "station,reading",\n             "north,12",\n             "south,31"), "export.csv")\nread_csv("export.csv", show_col_types = FALSE)',
   'Warning: One or more parsing issues, call `problems()` on your data frame for details,\ne.g.:\n  dat <- vroom(...)\n  problems(dat)\n# A tibble: 4 × 1\n  `# Sensor export v3` \n  <chr>                \n1 # generated overnight\n2 station,reading      \n3 north,12             \n4 south,31             '],
  ['s1 skip',
   'read_csv("export.csv", skip = 2, show_col_types = FALSE)',
   '# A tibble: 2 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31'],
  ['s1 comment',
   'read_csv("export.csv", comment = "#", show_col_types = FALSE)',
   '# A tibble: 2 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31'],
  ['s1 col_names',
   'writeLines(c("north,12", "south,31"), "headless.csv")\nread_csv("headless.csv", col_names = FALSE, show_col_types = FALSE)\nread_csv("headless.csv", col_names = c("station", "reading"), show_col_types = FALSE)',
   '# A tibble: 2 × 2\n  X1       X2\n  <chr> <dbl>\n1 north    12\n2 south    31\n# A tibble: 2 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31'],

  // s2 Other delimiters
  ['s2 read_tsv',
   'writeLines(c("station\\treading", "north\\t12", "south\\t31"), "readings.tsv")\nread_tsv("readings.tsv", show_col_types = FALSE)',
   '# A tibble: 2 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31'],
  ['s2 read_delim',
   'writeLines(c("station|reading", "north|12", "south|31"), "piped.txt")\nread_delim("piped.txt", delim = "|", show_col_types = FALSE)',
   '# A tibble: 2 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31'],
  ['s2 read_csv2',
   'writeLines(c("station;reading",\n             "north;12,5",\n             "south;31,25"), "euro.csv")\nread_csv2("euro.csv", show_col_types = FALSE)',
   'ℹ Using "\',\'" as decimal and "\'.\'" as grouping mark. Use `read_delim()` for more control.\n# A tibble: 2 × 2\n  station reading\n  <chr>     <dbl>\n1 north      12.5\n2 south      31.2'],

  // s3 Controlling column types
  ['s3 padded ids stay text',
   'writeLines(c("site_id,reading",\n             "007,12",\n             "018,31",\n             "042,7"), "padded.csv")\nread_csv("padded.csv", show_col_types = FALSE)',
   '# A tibble: 3 × 2\n  site_id reading\n  <chr>     <dbl>\n1 007          12\n2 018          31\n3 042           7'],
  ['s3 bare ids become numbers',
   'writeLines(c("site_id,reading",\n             "7,12",\n             "18,31",\n             "42,7"), "sites.csv")\nread_csv("sites.csv", show_col_types = FALSE)',
   '# A tibble: 3 × 2\n  site_id reading\n    <dbl>   <dbl>\n1       7      12\n2      18      31\n3      42       7'],
  ['s3 cols() override',
   'read_csv("sites.csv", col_types = cols(site_id = col_character()))',
   '# A tibble: 3 × 2\n  site_id reading\n  <chr>     <dbl>\n1 7            12\n2 18           31\n3 42            7'],
  ['s3 compact string',
   'read_csv("sites.csv", col_types = "cd")',
   '# A tibble: 3 × 2\n  site_id reading\n  <chr>     <dbl>\n1 7            12\n2 18           31\n3 42            7'],

  // s4 Missing values and parsing problems
  ['s4 one word makes the column text',
   'writeLines(c("station,reading",\n             "north,12",\n             "south,NA",\n             "east,unknown",\n             "west,7"), "gappy.csv")\nread_csv("gappy.csv", show_col_types = FALSE)',
   '# A tibble: 4 × 2\n  station reading\n  <chr>   <chr>  \n1 north   12     \n2 south   <NA>   \n3 east    unknown\n4 west    7      '],
  ['s4 forcing the type warns',
   'gappy <- read_csv("gappy.csv", col_types = cols(reading = col_double()))\ngappy',
   'Warning: One or more parsing issues, call `problems()` on your data frame for details,\ne.g.:\n  dat <- vroom(...)\n  problems(dat)\n# A tibble: 4 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        NA\n3 east         NA\n4 west          7'],
  ['s4 problems()',
   'problems(gappy)',
   '# A tibble: 1 × 5\n    row   col expected actual  file                    \n  <int> <int> <chr>    <chr>   <chr>                   \n1     4     2 a double unknown /home/web_user/gappy.csv', true],
  ['s4 na argument',
   'read_csv("gappy.csv", na = c("", "NA", "unknown"), show_col_types = FALSE)',
   '# A tibble: 4 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        NA\n3 east         NA\n4 west          7'],

  // s5 Reading several files at once
  ['s5 a vector of paths with id',
   'writeLines(c("station,reading", "north,12", "south,31"), "day-01.csv")\nwriteLines(c("station,reading", "north,9", "south,28"), "day-02.csv")\nread_csv(c("day-01.csv", "day-02.csv"), id = "file", show_col_types = FALSE)',
   '# A tibble: 4 × 3\n  file       station reading\n  <chr>      <chr>     <dbl>\n1 day-01.csv north        12\n2 day-01.csv south        31\n3 day-02.csv north         9\n4 day-02.csv south        28'],

  // s6 Writing to a file
  ['s6 write_csv',
   'sites <- read_csv("sites.csv", col_types = "cd")\nwrite_csv(sites, "sites-out.csv")\ncat(readLines("sites-out.csv"), sep = "\\n")',
   'site_id,reading\n7,12\n18,31\n42,7'],
  ['s6 reading it back re-guesses',
   'read_csv("sites-out.csv", show_col_types = FALSE)',
   '# A tibble: 3 × 2\n  site_id reading\n    <dbl>   <dbl>\n1       7      12\n2      18      31\n3      42       7', true],
  ['s6 rds keeps the type',
   'write_rds(sites, "sites.rds")\nread_rds("sites.rds")',
   '# A tibble: 3 × 2\n  site_id reading\n  <chr>     <dbl>\n1 7            12\n2 18           31\n3 42            7', true],

  // s7 Entering data by hand
  ['s7 tibble()',
   'library(tibble)\ntibble(station = c("north", "south", "east"),\n       reading = c(12, 31, 7))',
   '# A tibble: 3 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31\n3 east          7'],
  ['s7 tribble()',
   'tribble(\n  ~station, ~reading,\n  "north",  12,\n  "south",  31,\n  "east",   7\n)',
   '# A tibble: 3 × 2\n  station reading\n  <chr>     <dbl>\n1 north        12\n2 south        31\n3 east          7'],
];

console.log('--- shown code blocks ---');
for (const [label, code, want, keep] of PAIRS) {
  shows(label, code, want);
  if (!keep) await reset();
  check(label, await R.run(code), want);
}

// --- claims made in prose and notes -----------------------------------------
console.log('');
console.log('--- prose and note claims ---');

await reset();
check('s0 note: the working directory is /home/web_user', await R.run('getwd()'), '[1] "/home/web_user"');
check('s0 note: a missing plain name reports the directory searched',
  await R.runErr('read_csv("no-such-file.csv")'),
  "Error: 'no-such-file.csv' does not exist in current working directory: '/home/web_user'.");
check('s0 note: a desktop absolute path just does not exist',
  await R.runErr('read_csv("/Users/someone/readings.csv")'),
  "Error: '/Users/someone/readings.csv' does not exist.");

await reset();
checkTrue('s0 note: the column specification block is a message, not an error',
  await (async () => {
    const raw = await R.runRaw('read_csv("readings.csv")');
    return !raw.errored && /Column specification/.test(raw.output);
  })(), 'read_csv must not report an error');

await reset();
check('s1 note: skip = 1 on a real header loses the names and a row',
  await R.run('d <- read_csv("readings.csv", skip = 1, show_col_types = FALSE)\nnrow(d)\nnames(d)'),
  '[1] 2\n[1] "north"      "12"         "2026-03-01"');

await reset();
check('s2 note: a semicolon file read with read_csv gives one column',
  await R.run('suppressWarnings(ncol(read_csv("euro.csv", show_col_types = FALSE)))'), '[1] 1');
await reset();
check('s2 prose: 31,25 is stored as 31.25 even though it prints as 31.2',
  await R.run('e <- read_csv2("euro.csv", show_col_types = FALSE)\ne$reading[2] == 31.25'),
  'ℹ Using "\',\'" as decimal and "\'.\'" as grouping mark. Use `read_delim()` for more control.\n[1] TRUE');

await reset();
checkTrue('s3 note: supplying col_types silences the specification message',
  (await R.run('read_csv("sites.csv", col_types = "cd")')).startsWith('# A tibble'),
  'no message should precede the tibble');

await reset();
check('s4 note: as.numeric afterwards converts the bad values to NA',
  await R.run('suppressWarnings(as.numeric(c("12", NA, "unknown", "7")))'), '[1] 12 NA NA  7');

// runErr() returns only the first "Error" line; this message runs to three, so
// diff the whole transcript instead.
await reset();
check('s5 note: inconsistent column names stop the whole read',
  await R.run('writeLines(c("station,readings", "north,9", "south,28"), "day-03.csv")\nread_csv(c("day-01.csv", "day-03.csv"), show_col_types = FALSE)'),
  'Error: Files must have consistent column names:\n* File 1 column 2 is: reading\n* File 2 column 2 is: readings');

// --- question claims --------------------------------------------------------
console.log('');
console.log('--- question claims ---');

await reset();
checkTrue('q0: show_col_types = FALSE removes the message and nothing else',
  (await R.run('read_csv("readings.csv", show_col_types = FALSE)')) ===
  (await R.run('read_csv("readings.csv")')).split('# A tibble')[1].replace(/^/, '# A tibble'));

await reset();
check('q1: spec() returns the specification as cols() code',
  await R.run('r <- read_csv("readings.csv", show_col_types = FALSE)\nspec(r)'),
  'cols(\n  station = col_character(),\n  reading = col_double(),\n  taken_on = col_date(format = "")\n)');

await reset();
checkTrue('q2: skip = 2 and comment = "#" agree on export.csv',
  (await R.run('read_csv("export.csv", skip = 2, show_col_types = FALSE)')) ===
  (await R.run('read_csv("export.csv", comment = "#", show_col_types = FALSE)')));

await reset();
check('q3: no col_names consumes the first data row',
  await R.run('d <- read_csv("headless.csv", show_col_types = FALSE)\nnrow(d)\nnames(d)'),
  '[1] 1\n[1] "north" "12"   ');

// identical() would compare the stored spec attribute too, and the two calls
// record how they were written. The claim is about the table, so compare that.
await reset();
check('q5: the compact string form gives the same table as the cols() form',
  await R.run('a <- read_csv("sites.csv", col_types = "cd")\nb <- read_csv("sites.csv", col_types = cols(site_id = col_character()))\nidentical(as.data.frame(a), as.data.frame(b))'),
  '[1] TRUE');

await reset();
check('q6: padded ids come back as character without being asked',
  await R.run('class(read_csv("padded.csv", show_col_types = FALSE)$site_id)'), '[1] "character"');

await reset();
check('q7: NA counts as missing but unknown does not',
  await R.run('g <- read_csv("gappy.csv", show_col_types = FALSE)\nis.na(g$reading)'),
  '[1] FALSE  TRUE FALSE FALSE');

await reset();
check('q8: problems() names the row, the column and the value',
  await R.run('g <- read_csv("gappy.csv", col_types = cols(reading = col_double()))\np <- problems(g)\nc(p$row, p$col, p$actual)'),
  'Warning: One or more parsing issues, call `problems()` on your data frame for details,\ne.g.:\n  dat <- vroom(...)\n  problems(dat)\n[1] "4"       "2"       "unknown"');

await reset();
check('q9: a csv round trip loses the stated type, an rds does not',
  await R.run('s <- read_csv("sites.csv", col_types = "cd")\nwrite_csv(s, "sites-out.csv")\nwrite_rds(s, "sites.rds")\nclass(read_csv("sites-out.csv", show_col_types = FALSE)$site_id)\nclass(read_rds("sites.rds")$site_id)'),
  '[1] "numeric"\n[1] "character"');

// --- exercise reference solutions -------------------------------------------
console.log('');
console.log('--- exercise reference solutions ---');

const SOLUTIONS = {
  'A file and the tibble it becomes':
    'library(readr)\n' +
    'writeLines(c("plot,trees,planted_on",\n' +
    '             "ridge,48,2026-04-02",\n' +
    '             "hollow,12,2026-04-05",\n' +
    '             "bank,31,2026-04-09"), "plots.csv")\n' +
    'plots <- read_csv("plots.csv", show_col_types = FALSE)\n' +
    'plots',
  'An identifier that must stay text':
    'library(readr)\n' +
    'writeLines(c("code,trees",\n' +
    '             "0071,48",\n' +
    '             "0180,12",\n' +
    '             "0425,31"), "codes.csv")\n' +
    'codes <- read_csv("codes.csv", col_types = cols(code = col_character()))\n' +
    'codes',
  'The word that is not a number':
    'library(readr)\n' +
    'writeLines(c("plot,trees",\n' +
    '             "ridge,48",\n' +
    '             "hollow,none",\n' +
    '             "bank,31"), "counts.csv")\n' +
    'counts <- read_csv("counts.csv", na = c("", "NA", "none"), show_col_types = FALSE)\n' +
    'counts[order(counts$trees), ]',
  'Out to disk and back':
    'library(readr)\n' +
    'writeLines(c("plot,trees,planted_on",\n' +
    '             "ridge,48,2026-04-02",\n' +
    '             "hollow,12,2026-04-05",\n' +
    '             "bank,31,2026-04-09"), "plots.csv")\n' +
    'plots <- read_csv("plots.csv", show_col_types = FALSE)\n' +
    'write_csv(plots, "plots-out.csv")\n' +
    'cat(readLines("plots-out.csv"), sep = "\\n")',
};

checkTrue('exercise count is 4', CH.exercises.length === 4, String(CH.exercises.length));
for (const ex of CH.exercises) {
  const src = SOLUTIONS[ex.t];
  if (!src) { checkTrue('solution for "' + ex.t + '"', false, 'no reference solution listed'); continue; }
  await reset();
  check('exercise: ' + ex.t, await R.run(src), ex.o);
  // The chapter promises a rerun prints the same thing; the app's WebR
  // filesystem persists between submissions, so prove it rather than assume it.
  await reset();
  check('exercise rerun: ' + ex.t, await R.run(src), ex.o);
}

// --- data contract ----------------------------------------------------------
console.log('');
console.log('--- data contract ---');
const CONCEPTS = ["vectors","data types","data frames","indexing","apply family","functions",
  "tibbles & pipes","ggplot2 basics","dplyr verbs","grouping & summaries","tidy data","joins",
  "strings & regex","factors & dates","iteration"];
checkTrue('n is 7', CH.n === 7, String(CH.n));
checkTrue('title is the r4ds chapter title', CH.title === 'Data import', CH.title);
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/data-import.html', CH.src);
checkTrue('pkgs declares readr', (CH.pkgs || []).includes('readr'), JSON.stringify(CH.pkgs));
checkTrue('sections between 6 and 9', CH.sections.length >= 6 && CH.sections.length <= 9, String(CH.sections.length));
checkTrue('last section is Summary', CH.sections[CH.sections.length - 1].t === 'Summary');
checkTrue('the summary points at R chapter 8',
  /next chapter is getting help/.test(CH.sections[CH.sections.length - 1].body.map((b) => b[1]).join(' ')));
checkTrue('exactly 10 questions', CH.questions.length === 10, String(CH.questions.length));
checkTrue('every question has a q and an a',
  CH.questions.every((q) => typeof q.q === 'string' && q.q && typeof q.a === 'string' && q.a));
checkTrue('every exercise concept is on the R ladder',
  CH.exercises.every((e) => CONCEPTS.includes(e.c)), CH.exercises.map((e) => e.c).join(', '));
checkTrue('every exercise has 3 hints and a non-empty o',
  CH.exercises.every((e) => Array.isArray(e.h) && e.h.length === 3 && typeof e.o === 'string' && e.o.length > 0));
checkTrue('every exercise is tagged book:r07', CH.exercises.every((e) => e.book === 'r07'));
checkTrue('every body block is p, code or note',
  BODY.every((b) => b.kind === 'p' || b.kind === 'code' || b.kind === 'note'));
const proseText = [CH.blurb,
  ...BODY.filter((b) => b.kind !== 'code').map((b) => b.text),
  ...CH.questions.flatMap((q) => [q.q, q.a]),
  ...CH.exercises.flatMap((e) => [e.t, e.b, ...e.h])].join('\n');
checkTrue('register: no exclamation marks in prose', !/!(?!=)/.test(proseText));

await R.close();
done();

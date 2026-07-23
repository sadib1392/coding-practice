// Verifies R book chapter 17 (book/r17.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r17.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (launch_moment, sailings, lisbon, and so on).
//
// DETERMINISM: this chapter is about time, so anything derived from the current
// moment would change on every run. Every shown value is built from a fixed
// date, every date-time carries an explicit tz, and the one block that calls
// Sys.timezone()/now()/today() is deliberately shown with NO output block —
// asserted structurally below. The whole battery is byte-identical under any
// host timezone; check with:  TZ=Asia/Tokyo node tests/rch17_verify.mjs
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch17_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r17.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r17;

const { check, checkTrue, done } = makeChecker('rch17');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 17', CH.n === 17);
checkTrue('title is "Dates and times"', CH.title === 'Dates and times');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/datetimes.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists lubridate, tibble and dplyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'lubridate,tibble,dplyr');
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
checkTrue('at least 3 exercises are factors & dates',
  CH.exercises.filter((e) => e.c === 'factors & dates').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r17' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 18 (missing values)',
  /missing values/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', src.includes('!') === false,
  'found at index ' + src.indexOf('!'));

// DETERMINISM CONTRACT: no chapter text may hard-code a value that depends on
// when or where the code is run.
checkTrue('chapter never shows a captured Sys.time()/Sys.Date() result',
  /Sys\.time\(\)|Sys\.Date\(\)/.test(src) === false);
checkTrue('chapter never hard-codes the host timezone as an output',
  /America\/New_York"\]|\[1\] "America\/New_York"/.test(src) === false);

// ------------------------------------------------------------- helpers ----
const section = (title) => {
  const s = CH.sections.find((x) => x.t === title);
  if (!s) throw new Error('no such section: ' + title);
  return s;
};
const codes = (title) => section(title).body.filter((b) => b[0] === 'code').map((b) => b[1]);

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
const S1 = 'Dates, times, and date-times';
const S2 = 'Parsing a date out of text';
const S3 = 'Building one from components';
const S4 = 'Pulling components back out';
const S5 = 'Rounding and rewriting';
const S6 = 'Durations, periods, and intervals';
const S7 = 'Time zones';

// The masking banner is real output and is shown as such. It only appears on
// the FIRST attach in a session, which is what this line is.
await pair(S1, 0, 's1 library(lubridate) prints the masking banner');
await silent(S1, 2, 's1 tibble and suppressed dplyr print nothing');
await pair(S1, 3, 's1 a Date and a date-time print');
await pair(S1, 5, 's1 classes and the numbers underneath');

await pair(S2, 0, 's2 ymd/mdy/dmy all reach the same day');
await pair(S2, 2, 's2 clock readings default to UTC');
await pair(S2, 4, 's2 an explicit tz changes the abbreviation');
await pair(S2, 6, 's2 unparseable strings become NA with a count');
await pair(S2, 8, 's2 as.Date with and without a format');

await pair(S3, 0, 's3 make_date and make_datetime');
await pair(S3, 2, 's3 as_datetime/as_date convert numbers and classes');
await pair(S3, 4, 's3 the sailings tibble prints with a dttm column');

await pair(S4, 0, 's4 component accessors');
await pair(S4, 2, 's4 labelled month and weekday are ordered factors');
await pair(S4, 4, 's4 counting an ordered factor gives week order');

await pair(S5, 0, 's5 floor/round/ceiling to the hour');
await pair(S5, 2, 's5 coarser units');
await pair(S5, 4, 's5 accessors on the left of an assignment');
await pair(S5, 6, 's5 update() sets several components at once');
await pair(S5, 8, 's5 an out-of-range component rolls forward');

await pair(S6, 0, 's6 subtraction gives a difftime');
await pair(S6, 2, 's6 durations are exact seconds');
await pair(S6, 4, 's6 adding a duration');
await pair(S6, 6, 's6 periods are calendar units');
await pair(S6, 8, 's6 month-end needs %m+%');
await pair(S6, 10, 's6 duration vs period across a DST change');
await pair(S6, 12, 's6 intervals and %within%');
await pair(S6, 14, 's6 dividing an interval');

await pair(S7, 0, 's7 the zone name is in OlsonNames()');
await pair(S7, 2, 's7 with_tz versus force_tz');
await pair(S7, 4, 's7 only with_tz preserves the instant');
await pair(S7, 6, 's7 tz() reads the attribute back');

// ------------------------------------------- the deliberately output-free block ----
// Sys.timezone()/now()/today() depend on the machine and the moment, so the
// chapter shows them with no output. Assert BOTH halves: the block runs, and
// the chapter really does not print a result for it.
const s7body = section(S7).body;
const tzIdx = s7body.findIndex((b) => b[0] === 'code' && b[1].includes('Sys.timezone()'));
checkTrue('s7 clock-dependent block exists', tzIdx >= 0);
checkTrue('s7 clock-dependent block is shown output-free',
  tzIdx >= 0 && (tzIdx === s7body.length - 1 || s7body[tzIdx + 1][0] !== 'code'),
  'the row after it is ' + (s7body[tzIdx + 1] || ['(end)'])[0]);
const clockRaw = await R.runRaw(s7body[tzIdx][1]);
checkTrue('s7 clock-dependent block runs without error', clockRaw.errored === false, clockRaw.output);
checkTrue('s7 clock-dependent block returns three lines',
  clockRaw.output.split('\n').length === 3, clockRaw.output);
checkTrue('s7 Sys.timezone() returns a quoted zone name (value not asserted)',
  /^\[1\] ".+"$/.test(clockRaw.output.split('\n')[0]), clockRaw.output.split('\n')[0]);

// ------------------------------------------- executable prose/question claims ----
// s1 prose: both classes count from the same origin.
check('claim: 1970-01-01 is zero for both classes',
  await R.run('as.numeric(ymd("1970-01-01"))\nas.numeric(ymd_hms("1970-01-01 00:00:00", tz = "UTC"))'),
  '[1] 0\n[1] 0');
// s2 note: as.Date without a format is silently wrong, not an error.
const badDate = await R.runRaw('as.Date("14/03/2026")');
checkTrue('claim: as.Date without format errors nothing and warns nothing',
  badDate.errored === false && /Warning|Error/.test(badDate.output) === false, badDate.output);
// question 3: a parse with no tz reports UTC.
check('claim: a no-tz parse carries UTC',
  await R.run('tz(ymd_hms("2026-03-14 09:05:00"))'), '[1] "UTC"');
// question 4: is.na finds the positions the warning only counted.
check('claim: is.na marks the two failed parses',
  await R.run('is.na(ymd(c("2026-03-14", "2026-02-30", "the fourteenth")))'),
  'Warning:  2 failed to parse.\n[1] FALSE  TRUE  TRUE');
// s3 prose: an unparsed date column stays character.
check('claim: an unparsed date column is character',
  await R.run('class(tibble(d = c("2026-03-14"))$d)'), '[1] "character"');
// s4 prose: day() exists and is only another name for mday().
check('claim: day() exists and answers the day of the month',
  await R.run('exists("day")\nday(ymd("2026-03-14"))\nmday(ymd("2026-03-14"))'),
  '[1] TRUE\n[1] 14\n[1] 14');
// s4 prose: the character version of the same count comes out alphabetically.
check('claim: a character weekday column counts alphabetically',
  await R.run('sailings |>\n  mutate(day_name = as.character(wday(departed, label = TRUE, abbr = FALSE))) |>\n  count(day_name)'),
  '# A tibble: 4 × 2\n  day_name     n\n  <chr>    <int>\n1 Friday       1\n2 Saturday     2\n3 Sunday       2\n4 Thursday     1');
// s4 note: the same instant read from another zone has a different hour, and can
// fall on a different date.
check('claim: the same instant has a different hour in Tokyo',
  await R.run('hour(launch_moment)\nhour(with_tz(launch_moment, "Asia/Tokyo"))\nas_date(with_tz(ymd_hms("2026-03-14 20:05:00", tz = "UTC"), "Asia/Tokyo"))'),
  '[1] 9\n[1] 18\n[1] "2026-03-15"');
// s5 prose: round_date really does go to the NEARER boundary, both ways.
check('claim: round_date goes up past the half hour',
  await R.run('round_date(ymd_hms("2026-03-14 09:35:00", tz = "UTC"), "hour")'),
  '[1] "2026-03-14 10:00:00 UTC"');
// question 6: flooring to a month maps every day in it onto one key.
check('claim: flooring to month collapses a whole month',
  await R.run('floor_date(ymd("2026-03-31"), "month")\nfloor_date(ymd("2026-03-01"), "month")'),
  '[1] "2026-03-01"\n[1] "2026-03-01"');
// s5 note: update() does NOT modify its argument.
check('claim: update() leaves the original alone',
  await R.run('keep <- ymd("2026-03-14")\nupdate(keep, year = 2030)\nkeep'),
  '[1] "2030-03-14"\n[1] "2026-03-14"');
// s6 prose: the exact second counts behind ddays and dyears.
check('claim: ddays(1) is 86400s and dyears(1) is 365.25 days',
  await R.run('as.numeric(ddays(1))\nas.numeric(dyears(1)) / 86400'), '[1] 86400\n[1] 365.25');
// s6 prose: the eighth of March 2026 really is a 23-hour day in New York.
check('claim: the DST day is 23 hours long',
  await R.run('as.numeric(difftime(ymd_hms("2026-03-09 00:00:00", tz = "America/New_York"), ymd_hms("2026-03-08 00:00:00", tz = "America/New_York"), units = "hours"))'),
  '[1] 23');
// s7 prose: 32400 seconds is nine hours.
check('claim: the forced instant moves by nine hours',
  await R.run('32400 / 3600'), '[1] 9');

// ------------------------------------------------ exercise reference solutions ----
// Every solution attaches with suppressMessages() so that a SECOND submission in
// the same session produces the identical transcript — R prints the attach
// banner only on the first attach, which would otherwise make grading depend on
// what the learner ran before.
const SOLUTIONS = [
// 1 — One day, three spellings
`suppressMessages(library(lubridate))

opened <- c(ymd("2026-05-09"), dmy("09/05/2026"), mdy("May 9, 2026"))

opened
class(opened)`,
// 2 — Which weekdays the drops land on
`suppressMessages(library(lubridate))
library(tibble)
suppressMessages(library(dplyr))

deliveries <- tibble(
  dropped = ymd_hms(c("2026-06-01 08:30:00", "2026-06-03 14:00:00",
                      "2026-06-06 09:15:00", "2026-06-08 17:45:00",
                      "2026-06-13 11:20:00"), tz = "UTC")
)

deliveries |>
  mutate(weekday = wday(dropped, label = TRUE, abbr = FALSE)) |>
  count(weekday)`,
// 3 — A month after the thirty-first
`suppressMessages(library(lubridate))

billed <- ymd("2026-01-31")

billed + months(1)
billed %m+% months(1)
billed + ddays(30)
yday(billed)`,
// 4 — Only the February readings
`suppressMessages(library(lubridate))
library(tibble)
suppressMessages(library(dplyr))

readings <- tibble(
  taken = ymd(c("2026-01-18", "2026-02-02", "2026-02-27", "2026-03-05", "2026-03-30")),
  level = c(4.1, 3.8, 5.2, 4.9, 6.0)
)

feb <- ymd("2026-02-01") %--% ymd("2026-02-28")

readings |>
  filter(taken %within% feb) |>
  arrange(taken)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// Exercises must also be idempotent: submitting the same answer twice in one
// WebR session has to produce the identical transcript.
for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' is idempotent on resubmission',
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong3 = await R.run(SOLUTIONS[2].replace('billed %m+% months(1)', 'billed + months(1)'));
checkTrue('exercise 3 rejects the period that does not roll back', wrong3 !== CH.exercises[2].o, wrong3);
const wrong2 = await R.run(SOLUTIONS[1].replace('abbr = FALSE', 'abbr = TRUE'));
checkTrue('exercise 2 rejects abbreviated weekday names', wrong2 !== CH.exercises[1].o, wrong2);
const wrong4 = await R.run(SOLUTIONS[3].replace('arrange(taken)', 'arrange(desc(taken))'));
checkTrue('exercise 4 rejects the reversed order', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

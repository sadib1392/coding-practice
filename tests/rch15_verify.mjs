// Verifies R book chapter 15 (book/r15.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r15.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// That arrangement also guards this chapter's specific hazard. Every regex in
// the chapter is an R string written inside a JavaScript string literal, so a
// pattern like \d is four characters of .js source. The blocks executed below
// are the exact strings the reader is shown, which means a mis-escaped
// backslash changes the pattern, changes the output, and fails the diff.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (spices, files, codes, and so on). Section 1
// depends on that order: its first block runs BEFORE library(stringr) so the
// "could not find function" error is real. installPackages() installs without
// attaching, which is what makes that work.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch15_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r15.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r15;

const { check, checkTrue, done } = makeChecker('rch15');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 15', CH.n === 15);
checkTrue('title is "Regular expressions"', CH.title === 'Regular expressions');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/regexps.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists stringr, tibble and dplyr',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'stringr,tibble,dplyr');
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
  CH.exercises.every((e) => e.book === 'r15' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('the three hints of each exercise are distinct',
  CH.exercises.every((e) => new Set(e.h).size === 3));
checkTrue('summary points forward to R chapter 16 (Factors)',
  /Factors/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const S1 = 'Patterns, and the functions that use them';
const S2 = 'Pattern basics';
const S3 = 'Detect, count, replace, extract';
const S4 = 'Escaping: two layers of backslash';
const S5 = 'Anchors and character classes';
const S6 = 'Quantifiers, groups, and backreferences';
const S7 = 'Flags and fixed matches';

// ORDER MATTERS: this block has to run before stringr is attached.
await pair(S1, 0, 's1 missing library() error');
await silent(S1, 2, 's1 library() calls print nothing');
await pair(S1, 3, 's1 str_detect over the spice vector');

await pair(S2, 0, 's2 str_view shows only matching elements');
await pair(S2, 2, 's2 str_view marks every occurrence');
await pair(S2, 4, 's2 the dot matches exactly one character');
await pair(S2, 6, 's2 dot plus is greedy');
await pair(S2, 8, 's2 alternation splits the whole pattern');
await pair(S2, 10, 's2 caret anchors to the start');

await pair(S3, 0, 's3 str_subset keeps the matching elements');
await pair(S3, 2, 's3 str_count counts per element');
await pair(S3, 4, 's3 str_replace versus str_replace_all');
await pair(S3, 6, 's3 str_extract returns NA where nothing matched');
await pair(S3, 8, 's3 str_detect inside filter()');
await pair(S3, 10, 's3 str_count inside mutate()');

await pair(S4, 0, 's4 a bare dot matches every non-empty string');
await pair(S4, 2, 's4 single backslash is an R string error');
await pair(S4, 4, 's4 writeLines shows the string, not the source');
await pair(S4, 6, 's4 escaped dot detects, counts and extracts');
await pair(S4, 8, 's4 a literal backslash takes four in the source');

await pair(S5, 0, 's5 anchors at both ends');
await pair(S5, 2, 's5 digit and whitespace classes');
await pair(S5, 4, 's5 bracket classes and their negation');
await pair(S5, 6, 's5 word boundaries');

await pair(S6, 0, 's6 anchored quantifier versus a floating one');
await pair(S6, 2, 's6 optional character, and a star matching nothing');
await pair(S6, 4, 's6 str_match returns a column per group');
await pair(S6, 6, 's6 group references in a replacement');
await pair(S6, 8, 's6 backreferences inside a pattern');

await pair(S7, 0, 's7 ignore_case flag');
await pair(S7, 2, 's7 fixed() turns the pattern language off');
await pair(S7, 4, 's7 multiline flag');
await pair(S7, 6, 's7 str_view over a multiline value');
await pair(S7, 8, 's7 dotall flag');
await pair(S7, 10, 's7 malformed pattern error');

// ------------------------------------------- executable prose/question claims ----
// s3 prose / question 2: str_subset is the two-step subset written in one.
check('claim: str_subset equals subsetting by str_detect',
  await R.run('identical(str_subset(spices, "^c"), spices[str_detect(spices, "^c")])'),
  '[1] TRUE');
// question 1: the result is one logical per element, same length as the input.
check('claim: str_detect returns one logical per element',
  await R.run('identical(length(str_detect(spices, "c")), length(spices))'),
  '[1] TRUE');
// s4 prose / question 3: the bare dot matches four names, the escaped dot three.
check('claim: bare dot matches all four names, escaped dot only three',
  await R.run('sum(str_detect(files, "."))\nsum(str_detect(files, "\\\\."))'),
  '[1] 4\n[1] 3');
// s4 prose / question 5 and 6: both patterns are two characters in the string.
check('claim: the escaped dot and the escaped backslash are two characters each',
  await R.run('nchar("\\\\.")\nnchar("\\\\\\\\")'), '[1] 2\n[1] 2');
// s5 prose: patterns are case sensitive until a flag says otherwise.
check('claim: matching is case sensitive by default',
  await R.run('str_detect(spices, "C")\nstr_detect(spices, regex("C", ignore_case = TRUE))'),
  '[1] FALSE FALSE FALSE FALSE FALSE FALSE\n[1]  TRUE  TRUE  TRUE  TRUE FALSE FALSE');
// s6 prose: a star can match nothing, giving "" rather than NA.
check('claim: a zero-length match is an empty string, not NA',
  await R.run('is.na(str_extract("b", "a*"))\nnchar(str_extract("b", "a*"))'),
  '[1] FALSE\n[1] 0');
// s6 prose / question 9: str_match returns a matrix, whole match plus one column per group.
check('claim: str_match returns five rows and three columns for two groups',
  await R.run('dim(str_match(codes, "^([A-Z]+)-(\\\\d+)$"))'), '[1] 5 3');
// s7 note: a fixed pattern is literal text, so a caret in one is just a caret.
// None of the codes contains a caret character, and every one of them opens
// with the letters AB, so the fixed pattern finds nothing where the regex
// finds everything.
check('claim: fixed("^AB") searches for a literal caret',
  await R.run('str_detect(codes, fixed("^AB"))\nstr_detect(codes, "^AB")'),
  '[1] FALSE FALSE FALSE FALSE FALSE\n[1] TRUE TRUE TRUE TRUE TRUE');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Six birds
`library(stringr)

birds <- c("wren", "swift", "swan", "raven", "rook", "swallow")

str_detect(birds, "^sw")
str_subset(birds, "n$")
str_count(birds, "w")`,
// 2 — A dot that means a dot
`library(stringr)

docs <- c("map.v2.png", "index.html", "LICENSE", "notes.md")

str_count(docs, "\\\\.")
str_extract(docs, "\\\\.[a-z0-9]+$")
str_detect(docs, fixed("."))`,
// 3 — Splitting a log line
`library(stringr)

entries <- c("2019-07: hull", "2020-11: keel", "bad line", "2021-03: mast")

str_match(entries, "^(\\\\d{4})-(\\\\d{2}): (\\\\w+)$")
str_replace(entries, "^(\\\\d{4})-(\\\\d{2})", "\\\\2/\\\\1")`,
// 4 — Filtering crates by their code
`library(stringr)
library(tibble)
suppressMessages(library(dplyr))

crates <- tibble(
  code = c("MX-14", "mx-9", "MX-207", "TZ-3", "MX-88"),
  mass = c(12, 4, 31, 7, 19)
)

crates |>
  filter(str_detect(code, "^MX-")) |>
  mutate(number = as.integer(str_extract(code, "\\\\d+"))) |>
  arrange(desc(number))`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
// Anchoring to the wrong end of the string finds no birds at all. Note that
// dropping the anchor from "^sw" would NOT be caught here, because every bird
// containing sw also starts with it — which is the section 3 warning about
// test data that cannot tell two answers apart, met in the wild.
const wrong1 = await R.run(SOLUTIONS[0].replace('"n$"', '"^n"'));
checkTrue('exercise 1 rejects an anchor at the wrong end', wrong1 !== CH.exercises[0].o, wrong1);
// Forgetting the second backslash is this chapter's whole subject.
const wrong2 = await R.run(SOLUTIONS[1].replace('str_count(docs, "\\\\.")', 'str_count(docs, ".")'));
checkTrue('exercise 2 rejects an unescaped dot', wrong2 !== CH.exercises[1].o, wrong2);
// Swapping the backreferences reverses the rewrite.
const wrong3 = await R.run(SOLUTIONS[2].replace('"\\\\2/\\\\1"', '"\\\\1/\\\\2"'));
checkTrue('exercise 3 rejects swapped group references', wrong3 !== CH.exercises[2].o, wrong3);
// Sorting the other way changes the row order.
const wrong4 = await R.run(SOLUTIONS[3].replace('arrange(desc(number))', 'arrange(number)'));
checkTrue('exercise 4 rejects the wrong sort direction', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

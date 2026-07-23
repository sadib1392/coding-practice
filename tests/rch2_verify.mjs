// Verification for book/r02.js — R Chapter 2: Workflow: basics.
//
// Every code block shown in the chapter is executed in WebR (R 4.6.0, the same
// runtime the app uses) and diffed against the output block the chapter prints
// next to it. Local R is a different version and is never consulted.
//
// Two directions of drift are caught:
//   1. The chapter's shown output no longer matches what R produces.
//   2. The chapter's code/output blocks were edited so a pair listed here is
//      no longer present, or no longer adjacent, in book/r02.js.
//
// Run from the repo root:  node tests/rch2_verify.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeR, makeChecker } from './rverify.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// --- load the chapter data the same way the browser would -------------------
global.window = {};
eval(fs.readFileSync(path.join(root, 'book', 'r02.js'), 'utf8'));
const CH = global.window.BOOK_R.chapters.r02;

// Flat list of every body block, in reading order, for adjacency checks.
const BODY = [];
CH.sections.forEach((s, si) => s.body.forEach((b, bi) => BODY.push({ si, bi, kind: b[0], text: b[1] })));

const { check, checkTrue, done } = makeChecker('r02');

// Assert the chapter really shows `code` immediately followed by `want`.
function shows(label, code, want) {
  const i = BODY.findIndex((b) => b.kind === 'code' && b.text === code);
  if (i < 0) return checkTrue(label + ' [in chapter]', false, 'code block not found in book/r02.js');
  const next = BODY[i + 1];
  const ok = next && next.kind === 'code' && next.text === want;
  return checkTrue(label + ' [in chapter]', ok,
    ok ? '' : 'block after this code is ' + JSON.stringify(next && next.text));
}

const R = await makeR(CH.pkgs || []);
const reset = () => R.run('rm(list = ls())');

// --- shown code block -> shown output block ---------------------------------
// keep:true means the block continues the previous one's environment on purpose.
const PAIRS = [
  // s0 The console evaluates what you type
  ['s0 arithmetic',
   '1 / 200 * 30\n(59 + 73 + 2) / 3\n2 ^ 10',
   '[1] 0.15\n[1] 44.66667\n[1] 1024'],
  ['s0 wrapped vector',
   '1:30',
   ' [1]  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25\n[26] 26 27 28 29 30'],

  // s1 Storing a value with <-
  ['s1 assignment is silent',
   'hours <- 8\nrate <- 21.5\npay <- hours * rate\npay',
   '[1] 172'],
  ['s1 parenthesised assignment',
   '(total <- 12 * 4)',
   '[1] 48'],
  ['s1 equals also assigns',
   'speed = 60\nspeed',
   '[1] 60'],
  ['s1 split arrow compares',
   'x <- 10\nx < -3',
   '[1] FALSE'],

  // s2 Comments
  ['s2 trailing comments',
   '# Weekly pay for a part-time shift\nhours <- 8      # hours worked\nrate <- 21.5    # rate per hour\nhours * rate    # what the shift earns',
   '[1] 172'],
  ['s2 no block comments',
   '/* this line is not a comment */\nx <- 1',
   "Error: <text>:1:1: unexpected '/'\n1: /\n    ^"],

  // s3 What's in a name
  ['s3 legal names',
   'total_cost <- 42\ntotal.cost2 <- 43\ntotal_cost + total.cost2',
   '[1] 85'],
  ['s3 case sensitivity',
   'total_cost <- 42\nTotal_cost',
   "Error: object 'Total_cost' not found"],
  ['s3 name starting with a digit',
   '1st_try <- 5',
   'Error: <text>:1:2: unexpected symbol\n1: 1st_try\n     ^'],

  // s4 Calling functions
  ['s4 seq by position',
   'seq(1, 10)',
   ' [1]  1  2  3  4  5  6  7  8  9 10'],
  ['s4 positional vs named',
   'seq(2, 20, 4)\nseq(from = 2, to = 20, by = 4)',
   '[1]  2  6 10 14 18\n[1]  2  6 10 14 18'],
  ['s4 default argument',
   'round(3.14159)\nround(3.14159, digits = 2)',
   '[1] 3\n[1] 3.14'],
  ['s4 vector into functions',
   'temps <- c(12, 15, 9, 21)\nmean(temps)\nlength(temps)\nmax(temps)',
   '[1] 14.25\n[1] 4\n[1] 21'],
  ['s4 class of three values',
   'class(21.5)\nclass("Tuesday")\nclass(TRUE)',
   '[1] "numeric"\n[1] "character"\n[1] "logical"'],

  // s5 Whitespace and style
  ['s5 tight spacing',
   'x<-c(1,2,3)\nsum(x)',
   '[1] 6'],
  ['s5 conventional spacing',
   'x <- c(1, 2, 3)\nsum(x)',
   '[1] 6'],
  ['s5 space before parentheses',
   'temps <- c(12, 15, 9, 21)\nmean (temps)',
   '[1] 14.25'],

  // s6 What the environment holds — one continuous session, in reading order
  ['s6 ls after three assignments',
   'rm(list = ls())\nhours <- 8\nrate <- 21.5\npay <- hours * rate\nls()',
   '[1] "hours" "pay"   "rate"'],
  ['s6 exists', 'exists("pay")\nexists("bonus")', '[1] TRUE\n[1] FALSE', true],
  ['s6 rm one object', 'rm(pay)\nls()', '[1] "hours" "rate"', true],

  // s7 Errors you will actually hit
  ['s7 object not found',
   'greeting <- "good morning"\nnchar(gretting)',
   "Error: object 'gretting' not found"],
  ['s7 function not found',
   'lenght(c(1, 2, 3))',
   'Error: could not find function "lenght"'],
  ['s7 unclosed quote',
   'greeting <- "good morning\nnchar(greeting)',
   'Error: <text>:1:13: unexpected INCOMPLETE_STRING\n1: greeting <- "good morning\n2: nchar(greeting)\n               ^'],
  ['s7 quote closed',
   'greeting <- "good morning"\nnchar(greeting)',
   '[1] 12'],
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
checkTrue('s0 note: [1] is printing, not value',
  (await R.run('x <- 42\nnchar(as.character(x))')) === '[1] 2',
  'a stored 42 should be two characters wide');

await reset();
check('s3 note: hyphen in a name reports object not found',
  await R.runErr('my-total <- 5'), "Error: object 'my' not found");

await reset();
const bareFn = await R.runRaw('mean');
checkTrue('s4 note: a function name without () prints the definition',
  !bareFn.errored && /function/.test(bareFn.output) && /UseMethod/.test(bareFn.output),
  JSON.stringify(bareFn.output.slice(0, 80)));

await reset();
check('s5 note: x<-10 still assigns', await R.run('x<-10\nx'), '[1] 10');
await reset();
check('s5 note: x < -10 compares instead', await R.run('x <- 3\nx < -10'), '[1] FALSE');

// --- question claims --------------------------------------------------------
console.log('');
console.log('--- question claims ---');

await reset();
const wrapped = (await R.run('1:30')).split('\n');
checkTrue('q0: a wrapped result labels its second line [26]',
  wrapped.length === 2 && wrapped[1].startsWith('[26]'), JSON.stringify(wrapped[1]));

await reset();
check('q1: assignment prints nothing', await R.run('hours <- 8'), '');
await reset();
check('q1: parenthesised assignment prints', await R.run('(hours <- 8)'), '[1] 8');

await reset();
check('q2: x < -3 with x at 10', await R.run('x <- 10\nx < -3'), '[1] FALSE');
await reset();
check('q2: x keeps its old value after the comparison', await R.run('x <- 10\nx < -3\nx'), '[1] FALSE\n[1] 10');

await reset();
check('q3: wrong case is not found',
  await R.runErr('total_cost <- 42\nTotal_cost'), "Error: object 'Total_cost' not found");

await reset();
checkTrue('q4: /* */ is a parse error, not a comment',
  (await R.runErr('/* four lines */\nx <- 1') || '').startsWith("Error: <text>:1:1: unexpected '/'"),
  await R.runErr('/* four lines */\nx <- 1'));
await reset();
check('q4: a leading # comments the line out', await R.run('# x <- 1\n2 + 2'), '[1] 4');

await reset();
checkTrue('q5: 1st_try does not parse',
  (await R.runErr('1st_try <- 5') || '').startsWith('Error: <text>:1:2: unexpected symbol'));
await reset();
check('q5: my-total reports object not found', await R.runErr('my-total <- 5'), "Error: object 'my' not found");
await reset();
check('q5: total.cost2 and total_cost are both legal',
  await R.run('total.cost2 <- 1\ntotal_cost <- 2\ntotal.cost2 + total_cost'), '[1] 3');

await reset();
const byPos = await R.run('seq(2, 20, 4)');
const byName = await R.run('seq(from = 2, to = 20, by = 4)');
checkTrue('q6: positional and named seq calls agree', byPos === byName, byPos + ' vs ' + byName);
check('q6: and both give 2 6 10 14 18', byPos, '[1]  2  6 10 14 18');

await reset();
check('q7: ls lists the environment', await R.run('a <- 1\nb <- 2\nls()'), '[1] "a" "b"');
check('q7: exists answers for one name', await R.run('exists("a")\nexists("zzz")'), '[1] TRUE\n[1] FALSE');
check('q7: rm deletes, rm(list = ls()) clears', await R.run('rm(a)\nls()\nrm(list = ls())\nls()'),
  '[1] "b"\ncharacter(0)');

await reset();
check('q8: missing value wording', await R.runErr('nchar(gretting)'), "Error: object 'gretting' not found");
check('q8: missing function wording', await R.runErr('lenght(c(1, 2))'), 'Error: could not find function "lenght"');

// q9: a script that leans on an object it never creates.
await reset();
check('q9: works while the hand-made object is in memory',
  await R.run('lookup_rate <- 21.5\n8 * lookup_rate'), '[1] 172');
check('q9: same script fails from a cleared environment',
  await R.runErr('rm(list = ls())\n8 * lookup_rate'), "Error: object 'lookup_rate' not found");

// --- exercise reference solutions -------------------------------------------
console.log('');
console.log('--- exercise reference solutions ---');

const SOLUTIONS = {
  'Four weights':
    'weights <- c(62, 75, 48, 90)\nweights\nlength(weights)\nmean(weights)',
  'Three classes':
    'class(3.5)\nclass("3.5")\nclass(TRUE)',
  'Counting by fours':
    'fours <- seq(from = 4, to = 40, by = 4)\nfours\nlength(fours)',
  'Splitting the bill':
    'total <- 1000\npeople <- 7\nshare <- total / people\nround(share, digits = 2)\nclass(share)',
};

checkTrue('exercise count is 4', CH.exercises.length === 4, String(CH.exercises.length));
for (const ex of CH.exercises) {
  const src = SOLUTIONS[ex.t];
  if (!src) { checkTrue('solution for "' + ex.t + '"', false, 'no reference solution listed'); continue; }
  await reset();
  check('exercise: ' + ex.t, await R.run(src), ex.o);
}

// --- data contract ----------------------------------------------------------
console.log('');
console.log('--- data contract ---');
const CONCEPTS = ["vectors","data types","data frames","indexing","apply family","functions",
  "tibbles & pipes","ggplot2 basics","dplyr verbs","grouping & summaries","tidy data","joins",
  "strings & regex","factors & dates","iteration"];
checkTrue('n is 2', CH.n === 2, String(CH.n));
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/workflow-basics.html', CH.src);
checkTrue('sections between 6 and 9', CH.sections.length >= 6 && CH.sections.length <= 9, String(CH.sections.length));
checkTrue('last section is Summary', CH.sections[CH.sections.length - 1].t === 'Summary');
checkTrue('exactly 10 questions', CH.questions.length === 10, String(CH.questions.length));
checkTrue('every exercise concept is on the R ladder',
  CH.exercises.every((e) => CONCEPTS.includes(e.c)), CH.exercises.map((e) => e.c).join(', '));
checkTrue('every exercise has 3 hints and a non-empty o',
  CH.exercises.every((e) => Array.isArray(e.h) && e.h.length === 3 && typeof e.o === 'string' && e.o.length > 0));
checkTrue('every exercise is tagged book:r02', CH.exercises.every((e) => e.book === 'r02'));
const proseText = [CH.blurb,
  ...BODY.filter((b) => b.kind !== 'code').map((b) => b.text),
  ...CH.questions.flatMap((q) => [q.q, q.a]),
  ...CH.exercises.flatMap((e) => [e.t, e.b, ...e.h])].join('\n');
checkTrue('register: no exclamation marks in prose', !/!(?!=)/.test(proseText));

await R.close();
done();

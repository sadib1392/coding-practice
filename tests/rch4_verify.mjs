// Verify every shown output in book/r04.js by executing it in WebR.
//
// Nothing here is written from memory: the script reads the chapter file, pulls
// out each code block and the output block that follows it, runs the code in
// WebR (R 4.6.0, the same runtime the app uses) and diffs the two. A drifting
// expectation in the chapter fails this script.
//
// It also asserts the chapter's central claim: each badly-styled / well-styled
// PAIR produces byte-identical output. Style changes nothing R computes.
//
//   npm install webr        (dev-only, gitignored)
//   node tests/rch4_verify.mjs

import fs from 'node:fs';
import { makeR, makeChecker } from './rverify.mjs';

// ---------------------------------------------------------------------------
// Load the chapter as data. It is a plain script that assigns onto `window`.
// ---------------------------------------------------------------------------
const src = fs.readFileSync(new URL('../book/r04.js', import.meta.url), 'utf8');
const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r04;

const { check, checkTrue, done } = makeChecker('r04');

const sec = (t) => {
  const s = CH.sections.find((x) => x.t === t);
  if (!s) throw new Error('no section titled: ' + t);
  return s;
};
const codes = (t) => sec(t).body.filter((b) => b[0] === 'code').map((b) => b[1]);

const S1 = 'Style is written for the next reader';
const S2 = 'Naming things';
const S3 = 'Spaces';
const S4 = 'The pipe';
const S5 = 'Stacking layers with +';
const S6 = 'Sectioning comments';
const S7 = 'Two shapes, one answer';

// ---------------------------------------------------------------------------
// Shape contract
// ---------------------------------------------------------------------------
const CONCEPTS = ['vectors', 'data types', 'data frames', 'indexing', 'apply family',
  'functions', 'tibbles & pipes', 'ggplot2 basics', 'dplyr verbs', 'grouping & summaries',
  'tidy data', 'joins', 'strings & regex', 'factors & dates', 'iteration'];

checkTrue('chapter id/number', CH.n === 4, 'n=' + CH.n);
checkTrue('title', CH.title === 'Workflow: code style', CH.title);
checkTrue('src links to the original chapter',
  CH.src === 'https://r4ds.hadley.nz/workflow-style.html', CH.src);
checkTrue('pkgs declares dplyr only',
  Array.isArray(CH.pkgs) && CH.pkgs.length === 1 && CH.pkgs[0] === 'dplyr', JSON.stringify(CH.pkgs));
checkTrue('6-9 sections', CH.sections.length >= 6 && CH.sections.length <= 9,
  CH.sections.length + ' sections');
checkTrue('last section is Summary', CH.sections[CH.sections.length - 1].t === 'Summary');
checkTrue('Summary points to the next chapter',
  /data tidying/i.test(JSON.stringify(CH.sections[CH.sections.length - 1].body)));
checkTrue('exactly 10 questions', CH.questions.length === 10, String(CH.questions.length));
checkTrue('every question has q and a',
  CH.questions.every((x) => x.q && x.a && x.q.length > 10 && x.a.length > 20));
checkTrue('exactly 4 exercises', CH.exercises.length === 4, String(CH.exercises.length));
checkTrue('every exercise tagged book:"r04"', CH.exercises.every((e) => e.book === 'r04'));
checkTrue('every exercise concept is a real R ladder concept',
  CH.exercises.every((e) => CONCEPTS.includes(e.c)),
  CH.exercises.map((e) => e.c).join(', '));
checkTrue('exercises use tibbles & pipes / dplyr verbs',
  CH.exercises.every((e) => e.c === 'tibbles & pipes' || e.c === 'dplyr verbs'));
checkTrue('every exercise has a non-empty expected output',
  CH.exercises.every((e) => typeof e.o === 'string' && e.o.length > 0));
checkTrue('every exercise has 3 hints',
  CH.exercises.every((e) => Array.isArray(e.h) && e.h.length === 3 && e.h.every((s) => s.length > 20)));

// Register: the project forbids exclamation marks anywhere in book prose or code.
const allText = JSON.stringify(CH);
checkTrue('no exclamation marks anywhere in the chapter', !allText.includes('!'));

// Output-free blocks must be honest about it: each is followed by a disclosure note.
const followedByNote = (title, codeText) => {
  const body = sec(title).body;
  const i = body.findIndex((b) => b[0] === 'code' && b[1] === codeText);
  return i >= 0 && body[i + 1] && body[i + 1][0] === 'note';
};
checkTrue('ggplot2 block is output-free with a disclosure note',
  followedByNote(S5, codes(S5)[0]) && /without any output/.test(sec(S5).body[2][1]));
checkTrue('styler/lintr block is output-free with a disclosure note',
  followedByNote(S7, codes(S7)[4]) && /without output/.test(sec(S7).body[9][1]));

// ---------------------------------------------------------------------------
// Chapter transcripts: run the chapter top to bottom in one R session, the way
// a reader would. dplyr is deliberately NOT pre-attached — the chapter attaches
// it itself, which is how the shown attach message gets verified.
// ---------------------------------------------------------------------------
const r = await makeR(['dplyr']);
const got = {}; // remembered outputs, for the pair comparisons below

// Run one chapter code block and diff it against the chapter's own output block.
const pair = async (label, title, codeIdx, outIdx) => {
  const c = codes(title);
  const out = await r.run(c[codeIdx]);
  got[label] = out;
  check(label, out, c[outIdx]);
  return out;
};

// -- Style is written for the next reader ----------------------------------
await pair('s1 cramped arithmetic', S1, 0, 1);
await pair('s1 spaced arithmetic', S1, 2, 3);

// -- Naming things ----------------------------------------------------------
await pair('s2 opaque names', S2, 0, 1);
await pair('s2 descriptive names', S2, 2, 3);
await pair('s2 dotted name is legal', S2, 4, 5);
await pair('s2 T can be reassigned', S2, 6, 7);
await pair('s2 TRUE cannot be reassigned', S2, 8, 9);
await r.run('rm(T)'); // undo the demo so nothing below inherits a broken T
check('s2 T is TRUE again after cleanup', await r.run('T'), '[1] TRUE');

// -- Spaces -----------------------------------------------------------------
await pair('s3 tight ^ and :', S3, 0, 1);
await pair('s3 cramped commas', S3, 2, 3);
await pair('s3 spaced commas', S3, 4, 5);
await pair('s3 count<-3 assigns', S3, 6, 7);
await pair('s3 count < -3 compares', S3, 8, 9);

// -- The pipe ---------------------------------------------------------------
// library() prints its attach notice with a leading blank line; the chapter
// shows the notice without that blank line, so this one comparison trims.
const attach = await r.run(codes(S4)[0]);
checkTrue('s4 library(dplyr) attach notice',
  attach.trim() === codes(S4)[1].trim(),
  'got: ' + JSON.stringify(attach) + ' want: ' + JSON.stringify(codes(S4)[1]));
await pair('s4 sales tibble prints', S4, 2, 3);
await pair('s4 pipe equals nested call', S4, 4, 5);
await pair('s4 cramped pipeline', S4, 6, 7);
await pair('s4 laid-out pipeline', S4, 8, 9);
await pair('s4 leading |> is a parse error', S4, 10, 11);

// -- Stacking layers with + -------------------------------------------------
await pair('s5 leading + splits the expression', S5, 1, 2);
await pair('s5 trailing + joins the lines', S5, 3, 4);

// -- Sectioning comments ----------------------------------------------------
await pair('s6 sectioned script', S6, 0, 1);
await pair('s6 bare script', S6, 2, 3);

// -- Two shapes, one answer -------------------------------------------------
await pair('s7 cramped analysis', S7, 0, 1);
await pair('s7 styled analysis', S7, 2, 3);

// ---------------------------------------------------------------------------
// The chapter's central claim: each bad/good PAIR prints exactly the same thing.
// ---------------------------------------------------------------------------
const identical = (label, a, b) =>
  checkTrue(label, got[a] === got[b],
    'a=' + JSON.stringify(got[a]) + ' b=' + JSON.stringify(got[b]));

identical('PAIR arithmetic spacing changes nothing',
  's1 cramped arithmetic', 's1 spaced arithmetic');
identical('PAIR naming changes nothing',
  's2 opaque names', 's2 descriptive names');
identical('PAIR comma spacing changes nothing',
  's3 cramped commas', 's3 spaced commas');
identical('PAIR pipeline layout changes nothing',
  's4 cramped pipeline', 's4 laid-out pipeline');
identical('PAIR comments change nothing',
  's6 sectioned script', 's6 bare script');
identical('PAIR whole-analysis style changes nothing',
  's7 cramped analysis', 's7 styled analysis');

// The two deliberate NON-pairs. If these ever match, the gotchas they teach
// have stopped being true and the prose around them is wrong.
checkTrue('NON-PAIR count<-3 differs from count < -3',
  got['s3 count<-3 assigns'] !== got['s3 count < -3 compares']);
checkTrue('NON-PAIR leading + differs from trailing +',
  got['s5 leading + splits the expression'] !== got['s5 trailing + joins the lines']);

// ---------------------------------------------------------------------------
// Question claims that are executable
// ---------------------------------------------------------------------------
check('q4 T <- FALSE takes effect', await r.run('T <- FALSE\nT'), '[1] FALSE');
await r.run('rm(T)');
checkTrue('q4 TRUE <- FALSE errors',
  /invalid \(do_set\) left-hand side/.test(await r.run('TRUE <- FALSE')));
check('q5 $ reaches into a data frame',
  await r.run('sales$cups'), '[1] 12  5  9 14  3  7');
check('q6 count<-3 leaves 3', await r.run('count <- 5\ncount<-3\ncount'), '[1] 3');
check('q6 count < -3 is FALSE', await r.run('count <- 5\ncount < -3'), '[1] FALSE');
check('q8 pipe form matches nested form',
  await r.run('c(1, 4, 9) |> sqrt()'), '[1] 1 2 3');
check('q8 nested form', await r.run('sqrt(c(1, 4, 9))'), '[1] 1 2 3');
checkTrue('q9 leading |> reports unexpected \'|>\'',
  /unexpected '\|>'/.test(await r.run('c(1, 4, 9)\n  |> sqrt()')));
check('q9 leading + prints two results', await r.run('1\n  + 2'), '[1] 1\n[1] 2');

await r.close();

// ---------------------------------------------------------------------------
// Exercise solutions, in a COLD session. dplyr is installed but not attached,
// so this proves each expected output is what a learner's first submission
// prints — including that the suppressed library() call really is silent.
// ---------------------------------------------------------------------------
const r2 = await makeR(['dplyr']);

const TIB = `suppressPackageStartupMessages(library(dplyr))

sales <- tibble(
  shop  = c("north", "north", "south", "south", "south", "east"),
  drink = c("chai", "matcha", "chai", "chai", "matcha", "chai"),
  cups  = c(12, 5, 9, 14, 3, 7)
)`;

const SOLUTIONS = [
  `daily_cups <- c(12, 5, 9, 14, 3, 7)

daily_cups |>
  mean() |>
  round(1)`,

  `${TIB}

sales |>
  filter(drink == "chai") |>
  arrange(desc(cups))`,

  `${TIB}

cups_per_drink <- sales |>
  group_by(drink) |>
  summarize(total_cups = sum(cups))

cups_per_drink`,

  `${TIB}

sales |>
  summarize(total_cups = sum(cups))

sales |>
  group_by(shop) |>
  summarize(total_cups = sum(cups))`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  const ex = CH.exercises[i];
  check(`exercise ${i + 1} "${ex.t}"`, await r2.run(SOLUTIONS[i]), ex.o);
}

// A grader that passes everything is worse than no grader: prove the exercise
// checks can fail by feeding a plausible wrong answer to each one.
const WRONG = [
  // rounded to the wrong number of places
  `daily_cups <- c(12, 5, 9, 14, 3, 7)\n\ndaily_cups |>\n  mean() |>\n  round(2)`,
  // forgot to sort descending
  `${TIB}\n\nsales |>\n  filter(drink == "chai") |>\n  arrange(cups)`,
  // grouped by the wrong column
  `${TIB}\n\ncups_per_drink <- sales |>\n  group_by(shop) |>\n  summarize(total_cups = sum(cups))\n\ncups_per_drink`,
  // forgot the grouped half entirely
  `${TIB}\n\nsales |>\n  summarize(total_cups = sum(cups))`,
];
for (let i = 0; i < WRONG.length; i++) {
  const out = await r2.run(WRONG[i]);
  checkTrue(`exercise ${i + 1} rejects a wrong answer`, out !== CH.exercises[i].o,
    'wrong answer produced the expected output');
}

await r2.close();

done();

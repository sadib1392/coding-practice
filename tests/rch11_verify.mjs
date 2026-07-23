// Verifies R book chapter 11 (book/r11.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r11.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (crossings, p, titled, and so on).
//
// ONE code block is deliberately not executed: the patchwork block in the
// "Saving, and plots side by side" section. patchwork is not installed in this
// app, the chapter shows that block with no output for exactly that reason, and
// the check below asserts it stays output-free.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch11_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r11.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r11;

const { check, checkTrue, done } = makeChecker('rch11');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 11', CH.n === 11);
checkTrue('title is "Communication"', CH.title === 'Communication');
checkTrue('src points at the r4ds chapter',
  CH.src === 'https://r4ds.hadley.nz/communication.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists ggplot2 and tibble',
  Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'ggplot2,tibble');
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
checkTrue('at least 3 exercises are ggplot2 basics',
  CH.exercises.filter((e) => e.c === 'ggplot2 basics').length >= 3,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r11' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 12 (logical vectors)',
  /logical vectors/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code. This
// chapter needs no negation operator, so the whole file stays clear of them.
checkTrue('no exclamation marks anywhere in the chapter file', src.indexOf('!') === -1,
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
const S1 = 'A plot that has to travel';
const S2 = 'Labels';
const S3 = 'Annotations';
const S4 = 'Scales and legends';
const S5 = 'Zooming';
const S6 = 'Themes';
const S7 = 'Saving, and plots side by side';

await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 crossings tibble prints');
await pair(S1, 3, 's1 layer count and default labels');
await pair(S1, 5, 's1 labels slot is empty and there is no title');

await pair(S2, 0, 's2 labs stores title, subtitle, caption');
await pair(S2, 2, 's2 labs names the axes and the legend');
await pair(S2, 4, 's2 misspelled label name is reported and dropped');

await pair(S3, 0, 's3 geom_text adds a GeomText layer with a label mapping');
await pair(S3, 2, 's3 slowest crossing is one row');
await pair(S3, 4, 's3 inheriting layer holds a waiver, labelled layer holds one row');
await pair(S3, 6, 's3 annotate draws one piece of text');
await pair(S3, 8, 's3 a constant inside aes is drawn once per row');

await pair(S4, 0, 's4 an untouched plot carries no scales');
await pair(S4, 2, 's4 scale_x_continuous sets name and breaks');
await pair(S4, 4, 's4 scale_colour_manual fixes the colours');
await pair(S4, 6, 's4 legend position is a theme setting');
await pair(S4, 8, 's4 guides removes the legend');
await pair(S4, 10, 's4 a second scale replaces the first');

await pair(S5, 0, 's5 scale limits discard three values');
await pair(S5, 2, 's5 xlim is the same thing');
await pair(S5, 4, 's5 coord_cartesian discards nothing');
await pair(S5, 6, 's5 a plain plot already has a Cartesian coord with no limits');
await pair(S5, 8, 's5 the fitted line differs between filtering and zooming');

await pair(S6, 0, 's6 theme_bw replaces the whole theme');
await pair(S6, 2, 's6 theme() sets a single element');
await pair(S6, 4, 's6 a complete theme added last wipes the tweak');
await pair(S6, 6, 's6 complete theme first, tweak after');

await pair(S7, 0, 's7 ggsave writes the file');

// The patchwork block is shown output-free on purpose: the package is not
// installed in this app, so no honest output exists for it. Assert the shape
// rather than running it.
{
  const c = codes(S7);
  checkTrue('s7 patchwork block is the last code block in its section', c.length === 3);
  checkTrue('s7 patchwork block is shown output-free', /library\(patchwork\)/.test(c[2]));
  const body = section(S7).body;
  const last = body[body.length - 1];
  checkTrue('s7 patchwork block is followed by a note explaining why it is not run',
    last[0] === 'note' && /executed/.test(last[1]));
  checkTrue('patchwork is not among the chapter packages',
    CH.pkgs.includes('patchwork') === false);
}

// ------------------------------------------- executable prose/question claims ----
// s1 note: a plot object printed on its own produces no text in this runtime.
check('claim: printing a plot object yields no text', await R.run('p'), '');
// s1 prose: the plot carries the whole tibble.
check('claim: p carries all eight rows', await R.run('nrow(p$data)'), '[1] 8');
// q1: get_labs resolves defaults, p$labels does not.
check('claim: get_labs fills in defaults, p$labels holds only what was set',
  await R.run('get_labs(p)$y\nlength(p$labels)\nlength(titled$labels)'),
  '[1] "fare_eur"\n[1] 0\n[1] 6');
// s3 prose / q5: labelling everything draws one text per row.
check('claim: labelling the whole tibble draws eight texts',
  await R.run('nrow(ggplot_build(labelled)$data[[2]])'), '[1] 8');
// q6: annotate draws one, the aes constant draws eight.
check('claim: annotate draws one text, a constant inside aes draws eight',
  await R.run('nrow(ggplot_build(once)$data[[2]])\nnrow(ggplot_build(many)$data[[2]])'),
  '[1] 1\n[1] 8');
// s5 prose: five crossings are inside the zoom window, three are outside.
check('claim: five of the eight crossings are 30 minutes or under',
  await R.run('sum(crossings$minutes <= 30)\nsum(crossings$minutes > 30)'),
  '[1] 5\n[1] 3');
// q9: coord_cartesian keeps every row in the built data.
check('claim: zooming keeps all eight rows, scale limits keep eight rows with three NA',
  await R.run('nrow(ggplot_build(zoomed)$data[[1]])\nnrow(ggplot_build(cut_scale)$data[[1]])'),
  '[1] 8\n[1] 8');
// q8: the guide is stored on the plot, the position on the theme.
check('claim: guide and legend position live in different slots',
  await R.run('hidden$guides$guides$colour\nbottom$theme$legend.position'),
  '[1] "none"\n[1] "bottom"');
// q7: the default scales are not stored on the object.
check('claim: a plot gains a scale only when you add one',
  await R.run('length(p$scales$scales)\nlength(scaled$scales$scales)'),
  '[1] 0\n[1] 1');
// s6 prose: theme_bw sets a great many elements, the tweak sets one.
check('claim: a complete theme sets many elements, theme() sets one',
  await R.run('length(themed$theme) > length(tweaked$theme)\nlength(tweaked$theme)'),
  '[1] TRUE\n[1] 1');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Labels a stranger can read
`library(ggplot2)
library(tibble)

orchards <- tibble(
  trees = c(40, 65, 90, 120, 150),
  crates = c(22, 35, 51, 68, 84)
)

p <- ggplot(orchards, aes(x = trees, y = crates)) +
  geom_point() +
  labs(
    title = "Crates rise with tree count",
    x = "Trees in the orchard",
    y = "Crates picked"
  )

get_labs(p)$title
get_labs(p)$x
get_labs(p)$y`,
// 2 — Label one point only
`library(ggplot2)
library(tibble)

towers <- tibble(
  town = c("Ardee", "Beltra", "Cong", "Doon"),
  height_m = c(18, 31, 24, 42),
  visitors = c(900, 1500, 1200, 2100)
)

tallest <- towers[which.max(towers$height_m), ]

p <- ggplot(towers, aes(x = height_m, y = visitors)) +
  geom_point() +
  geom_text(data = tallest, aes(label = town))

length(p$layers)
class(p$layers[[2]]$geom)[1]
nrow(p$layers[[2]]$data)
p$layers[[2]]$data$town`,
// 3 — Zoom without dropping rows
`library(ggplot2)
library(tibble)

runs <- tibble(
  km = c(3, 6, 9, 12, 15, 18),
  minutes = c(16, 33, 51, 70, 92, 115)
)

base <- ggplot(runs, aes(x = km, y = minutes)) +
  geom_point()

zoomed <- base + coord_cartesian(xlim = c(0, 10))
cut_down <- base + scale_x_continuous(limits = c(0, 10))

class(zoomed$coordinates)[1]
sum(is.na(ggplot_build(zoomed)$data[[1]]$x))
sum(is.na(ggplot_build(cut_down)$data[[1]]$x))`,
// 4 — A frame of annotations
`library(ggplot2)

peaks <- data.frame(
  climb_km = c(2, 5, 9, 14),
  metres = c(180, 430, 760, 1120)
)

notes <- data.frame(
  climb_km = c(5, 14),
  metres = c(430, 1120),
  label = c("halfway hut", "summit cairn")
)

p <- ggplot(peaks, aes(x = climb_km, y = metres)) +
  geom_point() +
  geom_text(data = notes, aes(label = label))

class(p$layers[[1]]$data)[1]
nrow(p$layers[[2]]$data)
sort(p$layers[[2]]$data$label)`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
{
  const wrong = await R.run(SOLUTIONS[1].replace('data = tallest, ', ''));
  checkTrue('exercise 2 rejects labelling every row', wrong !== CH.exercises[1].o, wrong);
}
{
  const wrong = await R.run(SOLUTIONS[2]
    .replace('coord_cartesian(xlim = c(0, 10))', 'scale_x_continuous(limits = c(0, 10))'));
  checkTrue('exercise 3 rejects zooming with scale limits', wrong !== CH.exercises[2].o, wrong);
}
{
  const wrong = await R.run(SOLUTIONS[0].replace('title = "Crates rise with tree count"',
    'title = "crates rise with tree count"'));
  checkTrue('exercise 1 rejects a retyped title', wrong !== CH.exercises[0].o, wrong);
}

await R.close();
done();

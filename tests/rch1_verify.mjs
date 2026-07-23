// Verifies R book chapter 1 (book/r01.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r01.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (bikes, p, and so on). The one deliberate
// exception is flagged in section 8.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch1_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r01.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r01;

const { check, checkTrue, done } = makeChecker('rch1');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 1', CH.n === 1);
checkTrue('title is "Data visualization"', CH.title === 'Data visualization');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/data-visualize.html');
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
  CH.exercises.filter((e) => e.c === 'ggplot2 basics').length >= 3);
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r01' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 2 (workflow basics)',
  /workflow basics/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const S1 = 'What a plot is made of';
const S2 = 'The data to plot';
const S3 = 'Your first plot';
const S4 = 'Aesthetics: mapping versus setting';
const S5 = 'Labels and titles';
const S6 = 'One variable at a time';
const S7 = 'Two variables, and small multiples';
const S8 = 'Saving, and the errors you will hit';

await silent(S1, 0, 's1 library() calls print nothing');

await pair(S2, 0, 's2 bikes tibble prints');
await pair(S2, 2, 's2 nrow/ncol/names');
await pair(S2, 4, 's2 column classes');
await pair(S2, 6, 's2 ragged tibble errors');

await pair(S3, 0, 's3 plot with no layers');
await silent(S3, 2, 's3 building p prints nothing');
await pair(S3, 3, 's3 inspecting p');
await pair(S3, 5, 's3 concise call is the same plot');

await pair(S4, 0, 's4 colour joins the mapping');
await pair(S4, 2, 's4 second layer is GeomSmooth');
await pair(S4, 4, 's4 setting versus mapping');
await pair(S4, 6, 's4 bare column outside aes errors');

await pair(S5, 0, 's5 labs() stores what you set');
await pair(S5, 2, 's5 unset label is NULL, get_labs resolves it');

await pair(S6, 0, 's6 bar chart geom, stat, and counts');
await pair(S6, 2, 's6 histogram geom, binwidth, counts, bin starts');
await pair(S6, 4, 's6 geom_point stat is StatIdentity');
await pair(S6, 6, 's6 histogram without binwidth guesses 30 bins');

await pair(S7, 0, 's7 boxplot geom and mapping');
await pair(S7, 2, 's7 stacked bar mapping and position');
await pair(S7, 4, 's7 FacetNull versus FacetWrap');
await pair(S7, 6, 's7 correlation and group means');

await pair(S8, 0, 's8 ggsave writes the file');

// DELIBERATE ORDER BREAK: the "could not find function" error only happens when
// ggplot2 is not attached. Detach around it, then put the session back.
await R.run('detach("package:ggplot2")');
await pair(S8, 2, 's8 missing library() error');
await R.run('library(ggplot2)');

await pair(S8, 4, 's8 leading + error');
await pair(S8, 6, 's8 misspelled column fails only at build');

// ------------------------------------------- executable prose/question claims ----
// s1 note: a plot object printed on its own produces no text in this runtime.
check('claim: printing a plot object yields no text', await R.run('p'), '');
// s3 prose: geom_point draws one point per row.
check('claim: geom_point yields one drawn row per data row',
  await R.run('nrow(ggplot_build(p)$data[[1]])'), '[1] 8');
// s6 prose: the four histogram bins run 7-9, 9-11, 11-13, 13-15.
check('claim: histogram bin upper edges are 9 11 13 15',
  await R.run('ggplot_build(weights)$data[[1]]$xmax'), '[1]  9 11 13 15');
// s6 note / question 8: there is no GeomHistogram to find.
check('claim: GeomHistogram does not exist', await R.run('exists("GeomHistogram")'), '[1] FALSE');
// s7 note / question 10: facet_wrap without the tilde still builds a FacetWrap.
check('claim: facet_wrap(frame) builds without complaint',
  await R.run('class((p + facet_wrap(frame))$facet)[1]'), '[1] "FacetWrap"');
// question 2: the layerless plot still carries the data.
check('claim: layerless plot carries 8 rows and 0 layers',
  await R.run('length(blank$layers)\nnrow(blank$data)'), '[1] 0\n[1] 8');
// question 7: geom_bar counts, geom_point does not.
check('claim: StatCount versus StatIdentity',
  await R.run('class(bars$layers[[1]]$stat)[1]\nclass(p$layers[[1]]$stat)[1]'),
  '[1] "StatCount"\n[1] "StatIdentity"');
// question 8: binwidth lives in stat_params, not geom_params.
check('claim: binwidth is a stat param, not a geom param',
  await R.run('weights$layers[[1]]$stat_params$binwidth\nis.null(weights$layers[[1]]$geom_params$binwidth)'),
  '[1] 2\n[1] TRUE');
// s2 prose: <dbl> and <chr> are the tibble abbreviations for these classes.
check('claim: wheel_cm is numeric and frame is character',
  await R.run('class(bikes$wheel_cm)\nclass(bikes$frame)'),
  '[1] "numeric"\n[1] "character"');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Three garden beds
`library(tibble)

plots <- tibble(
  bed = c("north", "south", "east"),
  beans_kg = c(3.5, 4.2, 2.8)
)

plots`,
// 2 — One point per row
`library(ggplot2)
library(tibble)

kilns <- tibble(
  hours = c(6, 8, 10, 12, 14),
  cracks = c(1, 2, 2, 5, 7)
)

p <- ggplot(kilns, aes(x = hours, y = cracks)) +
  geom_point()

length(p$layers)
class(p$layers[[1]]$geom)[1]
nrow(p$data)`,
// 3 — A third column and a second layer
`library(ggplot2)
library(tibble)

reefs <- tibble(
  depth_m = c(3, 5, 8, 11, 14, 18),
  species = c(21, 19, 16, 12, 9, 5),
  zone = c("inner", "inner", "inner", "outer", "outer", "outer")
)

p <- ggplot(reefs, aes(x = depth_m, y = species, colour = zone)) +
  geom_point() +
  geom_smooth(method = "lm", se = FALSE)

names(p$mapping)
length(p$layers)
class(p$layers[[2]]$geom)[1]`,
// 4 — Bars that count for you
`library(ggplot2)
library(tibble)

shifts <- tibble(
  worker = c("Ines", "Dara", "Yuki", "Omar", "Lena"),
  depot = c("east", "west", "east", "east", "west")
)

p <- ggplot(shifts, aes(x = depot)) +
  geom_bar()

class(p$layers[[1]]$geom)[1]
class(p$layers[[1]]$stat)[1]
ggplot_build(p)$data[[1]]$count`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove a wrong answer misses.
const wrong = await R.run(SOLUTIONS[1].replace('geom_point()', 'geom_line()'));
checkTrue('exercise 2 rejects the wrong geom', wrong !== CH.exercises[1].o, wrong);

await R.close();
done();

// Verifies R book chapter 9 (book/r09.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r09.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (stalls, p, pts, bars, and so on).
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch9_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r09.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r09;

const { check, checkTrue, done } = makeChecker('rch9');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 9', CH.n === 9);
checkTrue('title is "Layers"', CH.title === 'Layers');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/layers.html');
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
  CH.exercises.every((e) => e.book === 'r09' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 10 (exploratory data analysis)',
  /exploratory data analysis/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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
const S1 = 'Layers, one at a time';
const S2 = 'Aesthetic mappings';
const S3 = 'Geometric objects';
const S4 = 'Facets';
const S5 = 'Statistical transformations';
const S6 = 'Position adjustments';
const S7 = 'Coordinate systems';
const S8 = 'The layered grammar of graphics';

await silent(S1, 0, 's1 library() calls print nothing');
await pair(S1, 1, 's1 stalls tibble prints');
await pair(S1, 3, 's1 category counts and cross-tabulation');
await pair(S1, 5, 's1 base plot has no layers and all 12 rows');

await pair(S2, 0, 's2 layer-local mapping is stored on the layer');
await pair(S2, 2, 's2 size and alpha join the plot mapping');
await pair(S2, 4, 's2 continuous shape fails only at build');

await pair(S3, 0, 's3 geom decides the mark, both stats are identity');
await pair(S3, 2, 's3 smooth is a second layer with StatSmooth');
await pair(S3, 4, 's3 layer with no mapping of its own reports NULL');
await pair(S3, 6, 's3 plot-level colour splits the smooth into 3 groups');

await pair(S4, 0, 's4 facet_wrap makes one panel per value');
await pair(S4, 2, 's4 facet_grid stores rows and cols');
await pair(S4, 4, 's4 the panel layout table');
await pair(S4, 6, 's4 free_y frees one axis only');

await pair(S5, 0, 's5 bar chart geom, stat, and counts');
await pair(S5, 2, 's5 the stat data frame');
await pair(S5, 4, 's5 geom_col uses StatIdentity');
await pair(S5, 6, 's5 stat_summary picks GeomPointrange');
await pair(S5, 8, 's5 geom_bar with a y errors in the stat');

await pair(S6, 0, 's6 stack sets ymin and ymax');
await pair(S6, 2, 's6 fill rescales every bar to 1');
await pair(S6, 4, 's6 dodge moves the widths, not the heights');
await pair(S6, 6, 's6 position_jitter stores width and seed');

await pair(S7, 0, 's7 coord classes');
await pair(S7, 2, 's7 coord_fixed is a CoordCartesian with a ratio');
await pair(S7, 4, 's7 coord_fixed does not return a CoordFixed');
await pair(S7, 6, 's7 coordinates do not change the built data');

await pair(S8, 0, 's8 all seven parts of one plot');
await pair(S8, 2, 's8 the four defaults on a plain scatterplot');
await pair(S8, 4, 's8 geom_ and stat_ spellings build the same layer');

// ------------------------------------------- executable prose/question claims ----
// s1 note: a plot object printed on its own produces no text in this runtime.
check('claim: printing a plot object yields no text', await R.run('pts'), '');
// s5 prose: the bar counts are the table() counts arriving by a longer route.
check('claim: StatCount reproduces table(stalls$cuisine)',
  await R.run('identical(as.numeric(table(stalls$cuisine)), ggplot_build(bars)$data[[1]]$count)'),
  '[1] TRUE');
// s2 prose: plot-level and layer-level mappings are merged at draw time.
check('claim: the built layer carries colour and shape from the layer mapping',
  await R.run('all(c("colour", "shape") %in% names(ggplot_build(q)$data[[1]]))'), '[1] TRUE');
// s5 prose / question 5: geom_bar(stat = "identity") is the same layer as geom_col().
check('claim: geom_bar(stat = "identity") matches geom_col()',
  await R.run('identical(\n  ggplot_build(ggplot(stalls, aes(x = stall, y = price)) + geom_bar(stat = "identity"))$data[[1]]$y,\n  ggplot_build(cols)$data[[1]]$y\n)'),
  '[1] TRUE');
// s5 prose: the medians named in the text are the medians of the data.
check('claim: the stat_summary medians are the group medians',
  await R.run('median(stalls$price[stalls$cuisine == "grill"])\nmedian(stalls$price[stalls$cuisine == "noodles"])\nmedian(stalls$price[stalls$cuisine == "sweets"])'),
  '[1] 10.5\n[1] 9.125\n[1] 6');
// s6 prose: the fill proportions are the cross-tabulation shares.
check('claim: fill boundaries are the venue shares within each cuisine',
  await R.run('round(as.numeric(table(stalls$cuisine, stalls$venue)[, "south"] /\n                 table(stalls$cuisine)), 3)'),
  '[1] 0.400 0.500 0.667');
// s6 note: the string form of jitter works and gives the defaults.
check('claim: position = "jitter" is legal and gives PositionJitter',
  await R.run('class((ggplot(stalls, aes(x = cuisine, y = price)) +\n  geom_point(position = "jitter"))$layers[[1]]$position)[1]'),
  '[1] "PositionJitter"');
// s7 prose / question 9: a plain plot has no ratio, and the CoordFixed name is real
// even though coord_fixed() does not produce an object of that class.
check('claim: a plain plot has a NULL ratio and CoordFixed is a real but unreturned name',
  await R.run('is.null(pts$coordinates$ratio)\nexists("CoordFixed")\n"CoordFixed" %in% class(coord_fixed())'),
  '[1] TRUE\n[1] TRUE\n[1] FALSE');
// s7 note: coord_cartesian(xlim = ...) is also just CoordCartesian.
check('claim: coord_cartesian with limits is still CoordCartesian',
  await R.run('class((pts + coord_cartesian(xlim = c(0, 25)))$coordinates)[1]'),
  '[1] "CoordCartesian"');
// question 10: a misspelled column also survives assembly and dies at build.
check('claim: a misspelled column builds a layer and fails at ggplot_build',
  await R.run('typo <- ggplot(stalls, aes(x = waitmin, y = price)) + geom_point()\nlength(typo$layers)\nggplot_build(typo)'),
  '[1] 1\nError: Problem while computing aesthetics.');
// Numbers the prose spells out in words are invisible to the diffing above, so
// bind the ones that are claims about the data to the values R just produced.
const prose = CH.sections.flatMap((s) => s.body.map((b) => b[1])).join('\n');
checkTrue('s1 prose spells the category counts the table printed',
  /Five grill stalls, four noodles, three sweets/.test(prose));
checkTrue('s4 prose spells the panel count the layout table printed',
  /Six panels, two venues by three cuisines/.test(prose));
checkTrue('s3 prose spells the group counts the build reported',
  /Three trend lines against one/.test(prose));
check('claim: the counts the prose spells out are the counts in the data',
  await R.run('as.numeric(table(stalls$cuisine))\nnrow(ggplot_build(f2)$layout$layout)\nlength(unique(ggplot_build(global)$data[[2]]$group))'),
  '[1] 5 4 3\n[1] 6\n`geom_smooth()` using formula = \'y ~ x\'\n[1] 3');

// question 4: facet_wrap params name the column, and the panel count comes from the build.
check('claim: FacetNull on a plain plot, FacetWrap after faceting',
  await R.run('class(pts$facet)[1]\nclass(f1$facet)[1]'), '[1] "FacetNull"\n[1] "FacetWrap"');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Where the mapping lives
`library(ggplot2)
library(tibble)

lifts <- tibble(
  minutes = c(4, 7, 9, 12, 15, 18),
  load_kg = c(120, 180, 210, 260, 300, 340),
  crew = c("dawn", "dawn", "dawn", "dusk", "dusk", "dusk")
)

p <- ggplot(lifts, aes(x = minutes, y = load_kg)) +
  geom_point(aes(colour = crew)) +
  geom_smooth(method = "lm", se = FALSE)

names(p$mapping)
names(p$layers[[1]]$mapping)
length(p$layers)
class(p$layers[[2]]$geom)[1]`,
// 2 — A grid of panels
`library(ggplot2)
library(tibble)

orchards <- tibble(
  tree = c("a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"),
  yield_kg = c(31, 44, 27, 38, 52, 19, 41, 36, 48, 25, 33, 57),
  block = c("east", "east", "east", "east", "east", "east",
            "west", "west", "west", "west", "west", "west"),
  season = c("spring", "spring", "summer", "summer", "autumn", "autumn",
             "spring", "spring", "summer", "summer", "autumn", "autumn")
)

p <- ggplot(orchards, aes(x = tree, y = yield_kg)) +
  geom_point() +
  facet_grid(block ~ season)

class(p$facet)[1]
names(p$facet$params$rows)
names(p$facet$params$cols)
nrow(ggplot_build(p)$layout$layout)`,
// 3 — Bars scaled to one
`library(ggplot2)
library(tibble)

routes <- tibble(
  depot = c("harbour", "harbour", "harbour", "harbour", "ridge", "ridge",
            "ridge", "summit", "summit", "summit"),
  mode = c("van", "van", "van", "bike", "van", "bike",
           "bike", "van", "van", "bike")
)

p <- ggplot(routes, aes(x = depot, fill = mode)) +
  geom_bar(position = "fill")

class(p$layers[[1]]$position)[1]
class(p$layers[[1]]$stat)[1]
round(ggplot_build(p)$data[[1]]$ymax, 3)`,
// 4 — Reading the bins back
`library(ggplot2)
library(tibble)

hauls <- tibble(
  boat = c("Ada", "Brig", "Coot", "Dory", "Egret", "Fern",
           "Gull", "Hake", "Isle", "Jetty"),
  weight_kg = c(3, 6, 8, 11, 12, 14, 17, 19, 22, 27)
)

p <- ggplot(hauls, aes(x = weight_kg)) + geom_histogram(binwidth = 5)

bins <- ggplot_build(p)$data[[1]][, c("xmin", "xmax", "count")]
bins`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// The reference solution above lives in this file, so a drifting exercise BRIEF
// would otherwise go unnoticed: the solution would still produce o while telling
// the learner to build something else. Bind the two by requiring every number the
// solution puts in a c() vector or a named argument to be named in the brief.
const solutionNumbers = (code) => {
  const nums = new Set();
  for (const m of code.matchAll(/\bc\(([^()]*)\)/g))
    for (const n of m[1].matchAll(/-?\d+(?:\.\d+)?/g)) nums.add(n[0]);
  for (const m of code.matchAll(/\b[a-zA-Z._][\w.]*\s*=\s*(-?\d+(?:\.\d+)?)/g)) nums.add(m[1]);
  // trailing positional numbers, e.g. the digits argument of round(x, 3)
  for (const m of code.matchAll(/,\s*(\d+)\)/g)) nums.add(m[1]);
  return [...nums];
};
// A plain substring test would let 2 match inside 62, so require a numeric boundary.
const briefNames = (brief, n) =>
  new RegExp('(?<![\\d.])' + n.replace('.', '\\.') + '(?!\\d)').test(brief);
for (let i = 0; i < CH.exercises.length; i++) {
  const missing = solutionNumbers(SOLUTIONS[i]).filter((n) => !briefNames(CH.exercises[i].b, n));
  checkTrue('exercise ' + (i + 1) + ' brief names every number its solution uses',
    missing.length === 0, 'missing from the brief: ' + missing.join(', '));
}

// A grader that only ever passes is worthless: prove wrong answers miss.
// Exercise 1: putting colour on the plot instead of the layer changes both mappings.
const wrong1 = await R.run(SOLUTIONS[0]
  .replace('aes(x = minutes, y = load_kg)', 'aes(x = minutes, y = load_kg, colour = crew)')
  .replace('geom_point(aes(colour = crew))', 'geom_point()'));
checkTrue('exercise 1 rejects a plot-level colour mapping', wrong1 !== CH.exercises[0].o, wrong1);
// Exercise 3: stack instead of fill gives counts, not proportions.
const wrong3 = await R.run(SOLUTIONS[2].replace('position = "fill"', 'position = "stack"'));
checkTrue('exercise 3 rejects the stacked position', wrong3 !== CH.exercises[2].o, wrong3);
// Exercise 4: the wrong bin width gives different edges and counts.
const wrong4 = await R.run(SOLUTIONS[3].replace('binwidth = 5', 'binwidth = 4'));
checkTrue('exercise 4 rejects the wrong bin width', wrong4 !== CH.exercises[3].o, wrong4);

await R.close();
done();

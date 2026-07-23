// Verifies R book chapter 29 (book/r29.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r29.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter 29 is about Quarto output formats. Quarto is NOT installed in WebR
// and renders nothing inside the app, so the chapter has two kinds of code
// block:
//
//   DOC   — a .qmd document, a YAML header, a _quarto.yml, or a terminal
//           quarto command. Not R, produces no output, shown with NOTHING
//           under it. The test never runs them.
//   PAIR  — real R at index i whose real WebR output is the block at i+1.
//
// The BLOCKS table below accounts for EVERY code block in every section as
// exactly one DOC, one pair input, or one pair output. That accounting is the
// anti-drift lock: adding an "output" block under a DOC block, or adding an
// unverified block anywhere, breaks the count and fails this script.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch29_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r29.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r29;

const { check, checkTrue, done } = makeChecker('rch29');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 29', CH.n === 29);
checkTrue('title is "Quarto formats"', CH.title === 'Quarto formats');
checkTrue('src points at the r4ds chapter',
  CH.src === 'https://r4ds.hadley.nz/quarto-formats.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs is empty — the chapter is base R only',
  Array.isArray(CH.pkgs) && CH.pkgs.length === 0);
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
checkTrue('at least 2 exercises are strings & regex',
  CH.exercises.filter((e) => e.c === 'strings & regex').length >= 2);
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r29' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));

// r29 is the LAST chapter of the R book. Its summary must close the book, not
// hand off to a next chapter.
const summary = CH.sections[CH.sections.length - 1].body.map((b) => b[1]).join('\n');
checkTrue('summary says this is the last chapter', /last chapter of the book/i.test(summary));
checkTrue('summary points back to the R concept ladder on the practice tab',
  /practice tab/i.test(summary) && /concept ladder/i.test(summary));
checkTrue('summary points at chapters whose exercises are not cleared',
  /not cleared/i.test(summary) && /unfinished chapter/i.test(summary));
checkTrue('summary does NOT promise a next chapter',
  !/next chapter/i.test(summary));
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

const S1 = 'One document, many outputs';
const S2 = 'Output options';
const S3 = 'Documents: html, pdf, and Word';
const S4 = 'Self-contained output';
const S5 = 'Presentations';
const S6 = 'Dashboards, websites, and books';
const S7 = 'Parameters';

// Every code block in the chapter, classified. total must equal the real count.
const BLOCKS = {
  [S1]: { total: 4, doc: [0, 1], pairs: [2] },
  [S2]: { total: 5, doc: [0], pairs: [1, 3] },
  [S3]: { total: 4, doc: [0, 1], pairs: [2] },
  [S4]: { total: 3, doc: [0], pairs: [1] },
  [S5]: { total: 5, doc: [0], pairs: [1, 3] },
  [S6]: { total: 4, doc: [0, 1], pairs: [2] },
  [S7]: { total: 6, doc: [0, 1], pairs: [2, 4] },
};

// --------------------------------------------- output-free block audit ----
// A DOC block is document text, not R. It must LOOK like document text, and it
// must not be followed by anything the reader could mistake for its output.
const DOC_SIGNATURE = (s) =>
  /^---$/m.test(s) ||          // YAML header fence
  s.includes('```') ||         // a chunk fence, so a .qmd fragment
  /^\$ quarto /m.test(s) ||    // a terminal command
  /^[a-z][a-z-]*:$/m.test(s) ||// a YAML block key such as project:
  /^#{1,6} /m.test(s) ||       // a markdown heading
  s.includes('`r ');           // a prose line carrying inline code

let docCount = 0;
for (const title of Object.keys(BLOCKS)) {
  const spec = BLOCKS[title];
  const c = codes(title);
  checkTrue('accounting: ' + title + ' has ' + spec.total + ' code blocks',
    c.length === spec.total, 'got ' + c.length);
  const seen = new Array(c.length).fill(0);
  spec.doc.forEach((i) => { seen[i]++; });
  spec.pairs.forEach((i) => { seen[i]++; seen[i + 1]++; });
  checkTrue('accounting: ' + title + ' classifies every block exactly once',
    seen.length === c.length && seen.every((n) => n === 1),
    seen.join(','));
  for (const i of spec.doc) {
    docCount++;
    checkTrue('output-free block ' + title + ' [' + i + '] is document text',
      DOC_SIGNATURE(c[i]), JSON.stringify(c[i]).slice(0, 60));
    const next = i + 1;
    checkTrue('output-free block ' + title + ' [' + i + '] has no output under it',
      next >= c.length || spec.doc.includes(next) || spec.pairs.includes(next));
  }
}
checkTrue('the chapter really does carry output-free document blocks', docCount >= 8,
  'got ' + docCount);

// The output-free blocks are only honest because the chapter says why. Assert
// the disclosure note is present, early, and says the three things it must.
const firstSectionNotes = section(S1).body.filter((b) => b[0] === 'note').map((b) => b[1]);
checkTrue('section 1 carries a disclosure note first', firstSectionNotes.length >= 1);
const disclosure = firstSectionNotes[0] || '';
checkTrue('disclosure: nothing on the page renders in this app',
  /renders inside this app/i.test(disclosure));
checkTrue('disclosure: Quarto is a desktop command line program',
  /desktop/i.test(disclosure) && /command line program/i.test(disclosure));
checkTrue('disclosure: document blocks are shown with nothing under them',
  /nothing under it/i.test(disclosure));
checkTrue('disclosure: refuses to invent rendered output or file sizes',
  /file size/i.test(disclosure) && /lie/i.test(disclosure));
checkTrue('disclosure: says what does transfer',
  /What runs here/i.test(disclosure));

// ------------------------------------------------- chapter code blocks ----
const R = await makeR(CH.pkgs);

const pair = async (title, i, label) => {
  const c = codes(title);
  check(label || (title + ' [' + i + ']'), await R.run(c[i]), c[i + 1]);
};

// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (hdr, deck, yields, and so on).
await pair(S1, 2, 's1 format names map to extensions, with a fallback');

await pair(S2, 1, 's2 format names sit at the two-space level');
await pair(S2, 3, 's2 each option attached to the format above it');

await pair(S3, 2, 's3 a YAML header built by a function');

await pair(S4, 1, 's4 the sidecar files a render leaves beside the document');

await pair(S5, 1, 's5 slide count and slide titles');
await pair(S5, 3, 's5 how many lines land on each slide');

await pair(S6, 2, 's6 the chapter list out of a _quarto.yml');

await pair(S7, 2, 's7 one report for one parameter value');
await pair(S7, 4, 's7 one report per parameter value');

// ------------------------------------- executable prose/question claims ----
// s1 note / question 1: switch() with no fallback returns NULL invisibly, which
// is why the typo produces neither an error nor any output.
check('claim: switch with no fallback is silent on an unmatched name',
  await R.run('no_default <- function(fmt) switch(fmt, html = ".html", pdf = ".pdf")\n' +
    'is.null(no_default("typst"))\nno_default("typst")'),
  '[1] TRUE');
// s2 prose / question 2: two spaces is a format, four spaces is its option.
check('claim: the four-space option lines cannot match the format pattern',
  await R.run('grepl("^  [a-z]", c("  html:", "    toc: true"))'), '[1]  TRUE FALSE');
// s2 prose: "default" means the format with no options, so it carries none.
check('claim: docx: default contributes no option rows',
  await R.run('sum(opts$format == "docx")'), '[1] 0');
// s4 prose / question 6: the sidecar files are exactly the ones under the folder.
check('claim: one of the four paths is the document and three are sidecars',
  await R.run('sum(startsWith(left_behind, "report_files/"))\n' +
    'sum(startsWith(left_behind, "report_files/") == FALSE)'),
  '[1] 3\n[1] 1');
// s5 prose / question 7: a level-one heading is a section, not a slide.
check('claim: the level-one heading is not counted as a slide',
  await R.run('length(grep("^## ", deck))\nlength(grep("^# ", deck))'),
  '[1] 3\n[1] 1');
// s5 prose: group zero is whatever came before the first level-two heading.
check('claim: slide grouping starts at zero before the first level-two heading',
  await R.run('names(sizes)[1]\nas.integer(sizes[["0"]])'), '[1] "0"\n[1] 2');
// s7 note / question 10: a parameter matching nothing renders nonsense, not an
// error. -Inf is what max() of an empty vector returns.
check('claim: an unmatched parameter yields zero rows and -Inf, not an error',
  await R.run('rows <- yields[yields$bed == "west", ]\nnrow(rows)\n' +
    'suppressWarnings(max(rows$kg))'),
  '[1] 0\n[1] -Inf');
// s7 prose: params is an ordinary named list, nothing more.
check('claim: params is a plain named list',
  await R.run('p <- list(bed = "south")\nclass(p)\nnames(p)\np$bed'),
  '[1] "list"\n[1] "bed"\n[1] "south"');
// s6 prose: the chapter entries are the four-space hyphen lines and nothing else.
check('claim: only the four-space hyphen lines are chapter entries',
  await R.run('length(grep("^    - ", project))\nlength(project)'), '[1] 3\n[1] 9');

// ------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Formats in the header
`hdr <- c(
  'title: "Soil tests"',
  "format:",
  "  html:",
  "    toc: true",
  "  pdf:",
  "    documentclass: article",
  "  docx: default"
)

sort(sub("^  ([a-z]+):.*$", "\\\\1", grep("^  [a-z]", hdr, value = TRUE)))`,
// 2 — Slides from headings
`deck <- c("# Soil report", "", "## Samples", "", "Three plots tested.", "",
          "## Results", "", "Mean pH 6.3.", "", "## Next steps", "", "Retest in spring.")

heads <- grep("^## ", deck, value = TRUE)

length(heads)
sort(sub("^## ", "", heads))`,
// 3 — One report per parameter
`tests <- data.frame(
  plot = c("north", "north", "south", "south", "east", "east"),
  ph = c(6.1, 6.8, 5.9, 6.2, 6.4, 6.0)
)

report <- function(params) {
  rows <- tests[tests$plot == params$plot, ]
  paste0(params$plot, ": ", nrow(rows), " readings, highest ", max(rows$ph))
}

for (p in sort(unique(tests$plot))) {
  writeLines(report(list(plot = p)))
}`,
// 4 — What a render leaves behind
`left <- c("soil.html",
          "soil_files/libs/bootstrap/bootstrap.min.css",
          "soil_files/figure-html/fig-ph-1.png",
          "soil_files/libs/quarto-html/quarto.js")

sum(startsWith(left, "soil_files/"))
sort(basename(left[startsWith(left, "soil_files/")]))`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[0].replace('"^  [a-z]"', '"^ +[a-z]"'));
checkTrue('exercise 1 rejects a pattern that also catches the option lines',
  wrong1 !== CH.exercises[0].o, wrong1);
const wrong3 = await R.run(SOLUTIONS[2].replace('max(rows$ph)', 'min(rows$ph)'));
checkTrue('exercise 3 rejects the lowest reading instead of the highest',
  wrong3 !== CH.exercises[2].o, wrong3);

await R.close();
done();

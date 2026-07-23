// Verifies R book chapter 28 (book/r28.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r28.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter 28 is about Quarto, which is NOT installed in WebR and cannot render
// anything inside the app. So the chapter has two kinds of code block:
//
//   DOC   — a .qmd document, a YAML header, or a terminal quarto command.
//           These are not R, they produce no output, and they are shown with
//           NOTHING under them. The test never runs them.
//   PAIR  — real R at index i whose real WebR output is the block at i+1.
//
// The BLOCKS table below accounts for EVERY code block in every section as
// exactly one DOC, one pair input, or one pair output. That accounting is the
// anti-drift lock: adding an "output" block under a DOC block, or adding an
// unverified block anywhere, breaks the count and fails this script.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch28_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r28.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r28;

const { check, checkTrue, done } = makeChecker('rch28');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 28', CH.n === 28);
checkTrue('title is "Quarto"', CH.title === 'Quarto');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/quarto.html');
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
  CH.exercises.every((e) => e.book === 'r28' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to chapter 29 (Quarto formats)',
  /Quarto formats/.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
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

const S1 = 'What Quarto is';
const S2 = 'What is inside a .qmd';
const S3 = 'Markdown, the prose half';
const S4 = 'Code chunks';
const S5 = 'Chunk options';
const S6 = 'Inline code';
const S7 = 'Figures and tables';
const S8 = 'Caching and the YAML header';

// Every code block in the chapter, classified. total must equal the real count.
const BLOCKS = {
  [S1]: { total: 1, doc: [0], pairs: [] },
  [S2]: { total: 5, doc: [0], pairs: [1, 3] },
  [S3]: { total: 5, doc: [0], pairs: [1, 3] },
  [S4]: { total: 7, doc: [0], pairs: [1, 3, 5] },
  [S5]: { total: 8, doc: [0, 5], pairs: [1, 3, 6] },
  [S6]: { total: 7, doc: [0], pairs: [1, 3, 5] },
  [S7]: { total: 6, doc: [0, 3], pairs: [1, 4] },
  [S8]: { total: 9, doc: [0, 5, 8], pairs: [1, 3, 6] },
};

// --------------------------------------------- output-free block audit ----
// A DOC block is document text, not R. It must LOOK like document text, and it
// must not be followed by anything the reader could mistake for its output.
const DOC_SIGNATURE = (s) =>
  /^---$/m.test(s) ||          // YAML header fence
  s.includes('```') ||         // a chunk fence, so a .qmd fragment
  /^\$ quarto /m.test(s) ||    // a terminal command
  /^[a-z][a-z-]*:$/m.test(s) ||// a YAML block key such as execute:
  /^#{1,6} /m.test(s) ||       // a markdown heading
  s.includes('`r ');           // a prose line carrying inline code

let docCount = 0;
for (const title of Object.keys(BLOCKS)) {
  const spec = BLOCKS[title];
  const c = codes(title);
  checkTrue('accounting: ' + title + ' has ' + spec.total + ' code blocks',
    c.length === spec.total, 'got ' + c.length);
  // Build the classification and prove it covers every index exactly once.
  const seen = new Array(c.length).fill(0);
  spec.doc.forEach((i) => { seen[i]++; });
  spec.pairs.forEach((i) => { seen[i]++; seen[i + 1]++; });
  checkTrue('accounting: ' + title + ' classifies every block exactly once',
    seen.length === c.length && seen.every((n) => n === 1),
    seen.join(','));
  // Every DOC block is document text and is genuinely output-free: the next
  // block is either another DOC block or a pair INPUT, never a pair output.
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
checkTrue('section 1 carries exactly one disclosure note', firstSectionNotes.length === 1);
const disclosure = firstSectionNotes[0] || '';
checkTrue('disclosure: nothing on the page renders in this app',
  /renders inside this app/i.test(disclosure));
checkTrue('disclosure: Quarto is a desktop program installed next to R',
  /desktop/i.test(disclosure) && /command line program/i.test(disclosure));
checkTrue('disclosure: document blocks are shown with nothing under them',
  /nothing under it/i.test(disclosure));
checkTrue('disclosure: says what does transfer',
  /plain text/i.test(disclosure) && /runs here/i.test(disclosure));

// ------------------------------------------------- chapter code blocks ----
const R = await makeR(CH.pkgs);

// Run code block i of a section and diff against block i+1 of the same section.
const pair = async (title, i, label) => {
  const c = codes(title);
  check(label || (title + ' [' + i + ']'), await R.run(c[i]), c[i + 1]);
};

// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (qmd, lines, beds, and so on).
await pair(S2, 1, 's2 writes report.qmd and reports its length');
await pair(S2, 3, 's2 readLines round trip is identical');

await pair(S3, 1, 's3 headings and their levels');
await pair(S3, 3, 's3 prose is what is neither fence nor inside one');

await pair(S4, 1, 's4 fence positions and chunk count');
await pair(S4, 3, 's4 chunk labels, sorted');
await pair(S4, 5, 's4 balanced() catches the truncated document');

await pair(S5, 1, 's5 option lines with the marker stripped');
await pair(S5, 3, 's5 options split into key and value');
await pair(S5, 6, 's5 the execute block from the header');

await pair(S6, 1, 's6 inline expressions pulled out of a sentence');
await pair(S6, 3, 's6 the numbers a render would splice in');
await pair(S6, 5, 's6 rounding is not formatting');

await pair(S7, 1, 's7 every fig- label has a caption');
await pair(S7, 4, 's7 a markdown table built by hand');

await pair(S8, 1, 's8 cache hit and cache miss');
await pair(S8, 3, 's8 a plain character sum collides');
await pair(S8, 6, 's8 header and body split at the hyphen fences');

// ------------------------------------- executable prose/question claims ----
// s2 prose: the document really is 26 lines, 5 of them header settings.
check('claim: the document is 26 lines with a 5-line header',
  await R.run('length(lines)\nlength(header)'), '[1] 26\n[1] 5');
// s5 prose / question 5: the hash-and-bar prefix is an R comment, so the code
// itself never sees the option lines.
check('claim: an option line is a comment R ignores',
  await R.run('eval(parse(text = "#| label: setup\\n1 + 1"))'), '[1] 2');
// s3 prose: the heading pattern deliberately misses chunk option lines.
check('claim: "#| label: setup" is not a heading',
  await R.run('grepl("^#+ ", "#| label: setup")\ngrepl("^#+ ", "## Beds")'),
  '[1] FALSE\n[1] TRUE');
// s3 note: one unclosed fence flips the parity for everything after it.
check('claim: an unclosed fence misclassifies the prose after it',
  await R.run('broken <- c("```{r}", "x <- 1", "## Later heading", "text")\n' +
    'f <- startsWith(broken, "```")\n(cumsum(f) %% 2) == 1'),
  '[1] TRUE TRUE TRUE TRUE');
// s6 prose / question 7: exactly two inline expressions in that sentence.
check('claim: the sentence carries two inline expressions',
  await R.run('length(regmatches(lines[17], gregexpr("`r [^`]+`", lines[17]))[[1]])'),
  '[1] 2');
// question 8: round changes the value, format changes the printing.
check('claim: round gives 3.9 and format gives "3.90"',
  await R.run('round(mean(beds), 2)\nformat(round(mean(beds), 2), nsmall = 2)'),
  '[1] 3.9\n[1] "3.90"');
// s7 prose / question 9: only a fig- prefixed label is a cross-reference.
check('claim: the fig- prefix is a string test, not a convention',
  await R.run('startsWith(c("fig-yield", "yield"), "fig-")'), '[1]  TRUE FALSE');
// s8 prose: the weighted fingerprint separates the two code strings the plain
// sum could not tell apart.
check('claim: the position-weighted fingerprint separates them',
  await R.run('identical(fingerprint("beds <- c(3.5, 4.2, 2.8, 5.1)"),\n' +
    '          fingerprint("beds <- c(3.5, 4.2, 2.8, 6.0)"))'),
  '[1] FALSE');
// question 1 / s2: the header ends at the second three-hyphen line.
check('claim: the two header fences sit at lines 1 and 7',
  await R.run('which(lines == "---")'), '[1] 1 7');

// ------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Counting the chunks
`doc <- c(
  "---",
  'title: "Soil tests"',
  "---",
  "",
  "## Samples",
  "",
  "\`\`\`{r}",
  "#| label: load",
  "ph <- c(6.1, 6.8, 5.9)",
  "\`\`\`",
  "",
  "\`\`\`{r}",
  "#| label: fig-ph",
  "plot(ph)",
  "\`\`\`"
)

sum(startsWith(doc, "\`\`\`{r"))
sort(sub("^#\\\\| label: ", "", grep("^#\\\\| label: ", doc, value = TRUE)))`,
// 2 — Reading the options
`doc <- c(
  "\`\`\`{r}",
  "#| label: fig-ph",
  "#| echo: false",
  "#| fig-width: 6",
  "plot(ph)",
  "\`\`\`"
)

writeLines(sort(sub("^#\\\\| ", "", grep("^#\\\\|", doc, value = TRUE))))`,
// 3 — The fence check
`balanced <- function(x) {
  opens <- sum(startsWith(x, "\`\`\`{r"))
  closes <- sum(x == "\`\`\`")
  identical(opens, closes)
}

good <- c("## Notes", "\`\`\`{r}", "x <- 1", "\`\`\`", "\`\`\`{r}", "y <- 2", "\`\`\`")
cut <- good[1:6]

balanced(good)
balanced(cut)`,
// 4 — What inline code would print
`ph <- c(6.1, 6.8, 5.9, 6.4)

sort(ph)
length(ph)
round(mean(ph), 2)
max(ph)
writeLines(paste0(length(ph), " samples, mean pH ", round(mean(ph), 2),
                  ", highest ", max(ph), "."))`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrong1 = await R.run(SOLUTIONS[0].replace('sort(sub(', 'rev(sub('));
checkTrue('exercise 1 rejects unsorted labels', wrong1 !== CH.exercises[0].o, wrong1);
const wrong3 = await R.run(SOLUTIONS[2].replace('good[1:6]', 'good[1:7]'));
checkTrue('exercise 3 rejects a document that was never truncated',
  wrong3 !== CH.exercises[2].o, wrong3);

await R.close();
done();

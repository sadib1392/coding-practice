// Verifies R book chapter 24 (book/r24.js) against a real WebR run.
//
// This script does NOT keep its own copy of the chapter's code and output.
// It loads book/r24.js, pulls the code blocks straight out of the data, runs
// them in WebR, and diffs the result against the very next block in the file.
// So the chapter cannot drift away from the test: editing one without the
// other fails here.
//
// Chapter blocks run top to bottom in ONE WebR session, the way a learner reads
// them, so state accumulates (shop, page, beans, crossings).
//
// NETWORK: nothing here fetches anything, and that is enforced rather than
// hoped for. rvest parses HTML held in an R string with no network at all, so
// every parsing block in the chapter runs here. The two blocks that hand a URL
// to read_html() are shown with no output, are never executed by this script,
// and the guard below fails the run if any executed block passes a URL to
// read_html() or to any other fetching call. URLs sitting inside the example
// HTML as href values are fine: they are parsed, never followed.
//
// Setup: npm install webr   (dev-only, gitignored)
// Run:   node tests/rch24_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeR, makeChecker } from './rverify.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'book', 'r24.js');
const src = fs.readFileSync(file, 'utf8');

const win = {};
new Function('window', src)(win);
const CH = win.BOOK_R.chapters.r24;

const { check, checkTrue, done } = makeChecker('rch24');

// ---------------------------------------------------------------- shape ----
const LADDER = ["vectors", "data types", "data frames", "indexing", "apply family",
  "functions", "tibbles & pipes", "ggplot2 basics", "dplyr verbs",
  "grouping & summaries", "tidy data", "joins", "strings & regex",
  "factors & dates", "iteration"];

checkTrue('chapter number is 24', CH.n === 24);
checkTrue('title is "Web scraping"', CH.title === 'Web scraping');
checkTrue('src points at the r4ds chapter', CH.src === 'https://r4ds.hadley.nz/webscraping.html');
checkTrue('blurb is a non-empty line', typeof CH.blurb === 'string' && CH.blurb.length > 20);
checkTrue('pkgs lists rvest only', Array.isArray(CH.pkgs) && CH.pkgs.join(',') === 'rvest');
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
  CH.exercises.filter((e) => e.c === 'strings & regex').length >= 2,
  CH.exercises.map((e) => e.c).join(' | '));
checkTrue('every exercise has book, non-empty o, and 3 hints',
  CH.exercises.every((e) => e.book === 'r24' && typeof e.o === 'string' && e.o.length > 0 &&
    Array.isArray(e.h) && e.h.length === 3 && e.h.every((h) => h.length > 20)));
checkTrue('summary points forward to R chapter 25 (functions)',
  /next chapter is functions/i.test(CH.sections[CH.sections.length - 1].body.slice(-1)[0][1]));
// Register: the book voice has no exclamation marks, in prose or in code.
checkTrue('no exclamation marks anywhere in the chapter file', src.indexOf('!') === -1,
  'found at index ' + src.indexOf('!'));

// The ethics section has to come first and has to cover the four constraints.
const first = CH.sections[0];
checkTrue('section 1 is the ethics and legality section',
  /before you point a program/i.test(first.t));
const ethicsText = first.body.map((b) => b[1]).join(' ');
for (const [label, re] of [['terms of service', /terms of service/i], ['robots.txt', /robots\.txt/],
  ['personal data', /personal data|identifies a living person/i], ['rate limiting', /Sys\.sleep/],
  ['copyright', /copyright/i], ['prefer an API', /\bAPI\b/]]) {
  checkTrue('ethics section covers ' + label, re.test(ethicsText));
}

// ------------------------------------------------------------- helpers ----
const section = (title) => {
  const s = CH.sections.find((x) => x.t === title);
  if (!s) throw new Error('no such section: ' + title);
  return s;
};
const codes = (title) => section(title).body.filter((b) => b[0] === 'code').map((b) => b[1]);

const S1 = 'Before you point a program at a site';
const S2 = 'What an HTML page is made of';
const S3 = 'Reading a page into R';
const S4 = 'Finding elements';
const S5 = 'Nesting, and keeping the rows lined up';
const S6 = 'Text and attributes';
const S7 = 'Tables';
const S8 = 'Fetching a real page, and what breaks';

// ------------------------------------------------------------- honesty ----
// "Output-free" means structurally: the body row right after a fetching code
// row is never another code row, so nothing in the file can be read as the
// output of a request that was never made.
const isFetch = (s) => /read_html\(\s*['"]https?:/.test(s) || /read_html\(\s*u\s*\)/.test(s);
let fetchSeen = 0;
for (const s of CH.sections) {
  s.body.forEach((row, i) => {
    if (row[0] !== 'code' || !isFetch(row[1])) return;
    fetchSeen++;
    const next = s.body[i + 1];
    checkTrue('fetching block in "' + s.t + '" is followed by no output block',
      next === undefined || next[0] !== 'code',
      next ? next[0] + ': ' + next[1].slice(0, 50) : 'end of section');
  });
}
checkTrue('the fetching blocks were found', fetchSeen === 2, 'got ' + fetchSeen);
checkTrue('both fetching blocks live in the live-page section',
  codes(S8).filter(isFetch).length === 2);
// Every block that fetches must be one of those two, or the "no output was
// invented for a fetch" claim would be false.
const allCode = CH.sections.flatMap((s) => s.body.filter((b) => b[0] === 'code').map((b) => b[1]));
const fetching = allCode.filter((c) => /read_html\(\s*['"]https?:/.test(c) || /read_html\(u\)/.test(c));
checkTrue('exactly 2 code blocks fetch a URL', fetching.length === 2, 'got ' + fetching.length);
checkTrue('a note discloses that this app cannot make network requests',
  CH.sections.some((s) => s.body.some((b) => b[0] === 'note' &&
    /cannot make network requests/i.test(b[1]))));
checkTrue('a note repeats the disclosure beside the fetching blocks',
  section(S8).body.some((b) => b[0] === 'note' && /shown without output/i.test(b[1])));

const R = await makeR(CH.pkgs);

// Hard network guard: no block this script executes may hand a URL to a
// fetching call. A URL inside the example HTML is only ever parsed.
const noFetch = (code, label) => {
  if (/read_html\(\s*['"]https?:/.test(code) || /read_html\(\s*u\s*\)/.test(code) ||
      /\bsession\(|\bdownload\.file\(|\burl\(|\bhttr::/.test(code)) {
    console.log('FAIL ' + label + ' — executed block would reach the network');
    process.exit(1);
  }
};

// Run code block i of a section and diff against block i+1 of the same section.
const pair = async (title, i, label) => {
  const c = codes(title);
  const lbl = label || (title + ' [' + i + ']');
  noFetch(c[i], lbl);
  check(lbl, await R.run(c[i]), c[i + 1]);
};

await R.run('rm(list = ls())');

// ------------------------------------------------- chapter code blocks ----
checkTrue('section 1 shows no code', codes(S1).length === 0);
// Section 2 shows one HTML fragment for reading, not R, so it is never run.
checkTrue('section 2 shows one display-only HTML fragment',
  codes(S2).length === 1 && /^<h1 /.test(codes(S2)[0]));

await pair(S3, 0, 's3 the example page is 601 characters');
await pair(S3, 2, 's3 read_html gives an xml_document');
await pair(S3, 4, 's3 a node prints as its tag');

await pair(S4, 0, 's4 html_elements returns a nodeset of 3');
await pair(S4, 2, 's4 four elements carry class bean');
await pair(S4, 4, 's4 html_element returns only the first');
await pair(S4, 6, 's4 no match gives an empty nodeset');
await pair(S4, 8, 's4 no match gives a missing node');

await pair(S5, 0, 's5 parent text includes the nested text');
await pair(S5, 2, 's5 descendant selector loses the missing row');
await pair(S5, 4, 's5 html_element over a nodeset keeps the length');
await pair(S5, 6, 's5 the aligned data frame');

await pair(S6, 0, 's6 html_text keeps the source whitespace');
await pair(S6, 2, 's6 html_text2 renders it');
await pair(S6, 4, 's6 a missing href comes back NA');
await pair(S6, 6, 's6 an attribute the element lacks is NA');
await pair(S6, 8, 's6 sorted bean names');

await pair(S7, 0, 's7 html_table gives a tibble');
await pair(S7, 2, 's7 the tibble orders like any other');

await pair(S8, 2, 's8 a missing element becomes NA');
await pair(S8, 4, 's8 as.numeric warns and gives NA');

// ------------------------------------------- executable prose/question claims ----
// s3 prose: read_html tells a string of markup from a location by the brackets.
check('claim: parsing the string needs no network and yields the same tree',
  await R.run('identical(as.character(read_html(shop)), as.character(page))'), '[1] TRUE');
// s4 prose / question 4: .bean matches the element whose class is "bean sale" too.
check('claim: the class selector matches a multi-class element',
  await R.run('"bean sale" %in% html_attr(html_elements(page, ".bean"), "class")'), '[1] TRUE');
// s4 / question 5: neither finder errors on no match.
check('claim: a failed match gives length 0 and a missing node, not an error',
  await R.run('length(html_elements(page, ".missing"))\nclass(html_element(page, ".missing"))[1]'),
  '[1] 0\n[1] "xml_missing"');
// s5 prose / question 6: three prices against four items is the alignment bug.
check('claim: the plural gives 3 prices where the singular gives 4',
  await R.run('length(html_elements(page, ".bean .price"))\nlength(html_element(beans, ".price"))'),
  '[1] 3\n[1] 4');
// s5 / question 7: exactly one of the four prices is missing.
check('claim: exactly one price is NA',
  await R.run('sum(is.na(html_text2(html_element(beans, ".price"))))'), '[1] 1');
// s6 prose / question 8: html_text2 collapses whitespace html_text keeps.
check('claim: html_text is longer than html_text2 on the same element',
  await R.run('nchar(html_text(html_element(page, ".blurb"))) > nchar(html_text2(html_element(page, ".blurb")))'),
  '[1] TRUE');
// s6 / question 9: html_attr keeps the result lined up with the nodeset.
check('claim: html_attr returns one value per node, NA included',
  await R.run('length(html_attr(html_elements(page, ".more"), "href")) == length(html_elements(page, ".more"))'),
  '[1] TRUE');
// s7 prose: th cells become the names, a digits-only column becomes integer.
check('claim: the header row became the column names and minutes is integer',
  await R.run('names(crossings)\nclass(crossings$minutes)'),
  '[1] "port"    "minutes"\n[1] "integer"');
// s8 prose: the coercion failed because the text was the label plus the number.
check('claim: the whole item text is what as.numeric could not read',
  await R.run('html_text2(html_element(page, ".bean"))'), '[1] "Kenya Nyeri 18"');

// ------------------------------------------------ exercise reference solutions ----
const SOLUTIONS = [
// 1 — Read the noticeboard
`library(rvest)

board <- '<ul id="notices">
<li class="note">Bins out Tuesday</li>
<li class="note">Hall closed Friday</li>
<li class="note">Choir practice Wednesday</li>
</ul>'

sort(html_text2(html_elements(read_html(board), ".note")))`,
// 2 — Collect the links
`library(rvest)

links <- '<p>
<a class="doc" href="https://example.com/rules">Rules</a>
<a class="doc" href="https://example.org/forms">Forms</a>
<a class="doc" href="https://example.net/map">Map</a>
</p>'

sort(html_attr(html_elements(read_html(links), ".doc"), "href"))`,
// 3 — A stall with no price
`library(rvest)

stalls <- '<ul>
<li class="stall"><span class="item">Honey</span></li>
<li class="stall"><span class="item">Bread</span> <span class="cost">4</span></li>
<li class="stall"><span class="item">Cheese</span> <span class="cost">7</span></li>
</ul>'

items <- html_elements(read_html(stalls), ".stall")

market <- data.frame(
  stall = html_text2(html_element(items, ".item")),
  cost = as.numeric(html_text2(html_element(items, ".cost")))
)

market[order(market$stall), ]`,
// 4 — Sort the tide table
`library(rvest)

tides <- '<table>
<tr><th>beach</th><th>height_cm</th></tr>
<tr><td>Cromer</td><td>310</td></tr>
<tr><td>Wells</td><td>275</td></tr>
<tr><td>Salthouse</td><td>402</td></tr>
</table>'

heights <- read_html(tides) |> html_element("table") |> html_table()

heights[order(heights$height_cm), ]`,
];

for (let i = 0; i < CH.exercises.length; i++) {
  noFetch(SOLUTIONS[i], 'exercise ' + (i + 1));
  check('exercise ' + (i + 1) + ' — ' + CH.exercises[i].t,
    await R.run(SOLUTIONS[i]), CH.exercises[i].o);
}

// A grader that only ever passes is worthless: prove wrong answers miss.
const wrongSort = await R.run(SOLUTIONS[0].replace('sort(html_text2', 'rev(html_text2'));
checkTrue('exercise 1 rejects an unsorted answer', wrongSort !== CH.exercises[0].o, wrongSort);
const wrongAttr = await R.run(SOLUTIONS[1].replace('html_attr(html_elements(read_html(links), ".doc"), "href")',
  'html_text2(html_elements(read_html(links), ".doc"))'));
checkTrue('exercise 2 rejects text where the href was asked for',
  wrongAttr !== CH.exercises[1].o, wrongAttr);
// The alignment bug itself: html_elements in place of html_element must fail.
const wrongAlign = await R.run(SOLUTIONS[2]
  .replace('html_text2(html_element(items, ".cost"))', 'html_text2(html_elements(read_html(stalls), ".cost"))'));
checkTrue('exercise 3 rejects the plural finder, which loses the NA row',
  wrongAlign !== CH.exercises[2].o, wrongAlign);
const wrongOrder = await R.run(SOLUTIONS[3].replace('order(heights$height_cm)', 'order(heights$beach)'));
checkTrue('exercise 4 rejects ordering by the wrong column',
  wrongOrder !== CH.exercises[3].o, wrongOrder);

await R.close();
done();

// Mechanical contract check for book chapter files, both books.
// Usage: node tests/shape_check.mjs [ch03 r05 ...]   (no args = every file in book/)
// Validates the data shape the app renders and the content rules that keep
// chapters consistent; register findings (exclamation marks) are warnings.
//
// Python chapters (chNN.js) register on window.BOOK and map to LADDER.python.
// R chapters (rNN.js) register on window.BOOK_R, map to LADDER.r, and may also
// carry a `pkgs` array naming the WebR packages their exercises need.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LADDER = {
  python: ["variables & types","strings","conditionals","loops","lists","dicts","functions",
    "list comprehensions","file I/O","error handling","classes","iterators & generators"],
  r: ["vectors","data types","data frames","indexing","functions","apply family",
    "tibbles & pipes","dplyr verbs","grouping & summaries","tidy data","joins",
    "ggplot2 basics","strings & regex","factors & dates","iteration"],
};
// Per-book: which global it registers on, the ladder it draws concepts from,
// and the source URL its `src` must point at.
const BOOKS = {
  python: { global: 'BOOK',   srcFor: n => `https://automatetheboringstuff.com/3e/chapter${n}.html` },
  r:      { global: 'BOOK_R', srcHost: 'https://r4ds.hadley.nz/' },
};
const langOf = id => (id.charAt(0) === 'r' ? 'r' : 'python');

const args = process.argv.slice(2);
const ids = args.length ? args
  : fs.readdirSync(path.join(root, 'book')).filter(f => /^(ch|r)\d+\.js$/.test(f)).map(f => f.replace('.js',''));

let fails = 0, warns = 0;
const fail = m => { console.log('  FAIL:', m); fails++; };
const warn = m => { console.log('  warn:', m); warns++; };

for (const id of ids.sort()) {
  console.log(`--- ${id} ---`);
  const file = path.join(root, 'book', id + '.js');
  global.window = {};
  try {
    const src = fs.readFileSync(file, 'utf8');
    eval(src);
  } catch (e) { fail(`${id}.js does not load: ${e.message}`); continue; }
  const lang = langOf(id), book = BOOKS[lang], LADDER_C = LADDER[lang];
  const reg = window[book.global];
  const ch = reg && reg.chapters && reg.chapters[id];
  if (!ch) { fail(`${id}.js does not register window.${book.global}.chapters.${id}`); continue; }

  const n = parseInt(id.replace(/^(ch|r)/, ''), 10);
  if (ch.n !== n) fail(`n is ${ch.n}, want ${n}`);
  if (typeof ch.title !== 'string' || !ch.title) fail('title missing');
  if (lang === 'python') {
    if (ch.src !== book.srcFor(n)) fail(`src is ${ch.src}`);
  } else {
    // r4ds pages are named by topic, not number, so only the host is fixed.
    if (typeof ch.src !== 'string' || !ch.src.startsWith(book.srcHost)) fail(`src is ${ch.src}`);
    if (ch.pkgs !== undefined && !Array.isArray(ch.pkgs)) fail('pkgs must be an array when present');
  }
  if (typeof ch.blurb !== 'string' || !ch.blurb) fail('blurb missing');

  const prose = [];   // [context, text] pairs for register scan
  if (!Array.isArray(ch.sections) || ch.sections.length < 6 || ch.sections.length > 9)
    fail(`sections: ${ch.sections && ch.sections.length}, want 6-9`);
  (ch.sections || []).forEach((s, si) => {
    if (typeof s.t !== 'string' || !s.t) fail(`section ${si} missing t`);
    if (!Array.isArray(s.body) || !s.body.length) fail(`section ${si} empty body`);
    (s.body || []).forEach((b, bi) => {
      if (!Array.isArray(b) || b.length !== 2 || !['p','code','note'].includes(b[0]) || typeof b[1] !== 'string')
        fail(`section ${si} body ${bi} malformed (kind ${b && b[0]})`);
      else if (b[0] !== 'code') prose.push([`s${si}b${bi}`, b[1]]);
    });
  });
  const last = ch.sections && ch.sections[ch.sections.length - 1];
  if (last && last.t !== 'Summary') warn(`last section is "${last.t}", expected Summary`);

  if (!Array.isArray(ch.questions) || ch.questions.length !== 10)
    fail(`questions: ${ch.questions && ch.questions.length}, want 10`);
  (ch.questions || []).forEach((q, qi) => {
    if (typeof q.q !== 'string' || typeof q.a !== 'string') fail(`question ${qi} malformed`);
    else { prose.push([`q${qi}`, q.q]); prose.push([`a${qi}`, q.a]); }
  });

  if (!Array.isArray(ch.exercises) || ch.exercises.length !== 4)
    fail(`exercises: ${ch.exercises && ch.exercises.length}, want 4`);
  (ch.exercises || []).forEach((x, xi) => {
    if (!LADDER_C.includes(x.c)) fail(`exercise ${xi} concept "${x.c}" not in LADDER.${lang}`);
    if (typeof x.t !== 'string' || typeof x.b !== 'string') fail(`exercise ${xi} missing t/b`);
    if (typeof x.o !== 'string' || !x.o) fail(`exercise ${xi} o must be a non-empty exact string`);
    if (!Array.isArray(x.h) || x.h.length !== 3) fail(`exercise ${xi} needs exactly 3 hints`);
    if (x.book !== id) fail(`exercise ${xi} book tag "${x.book}", want "${id}"`);
    prose.push([`ex${xi}.t`, x.t || '']); prose.push([`ex${xi}.b`, x.b || '']);
    (x.h || []).forEach((h, hi) => prose.push([`ex${xi}.h${hi}`, h]));
  });
  prose.push(['blurb', ch.blurb || '']);

  for (const [ctx, text] of prose) {
    const m = text.match(/!(?!=)/);
    if (m) warn(`exclamation mark in ${ctx}: "...${text.slice(Math.max(0, m.index - 30), m.index + 10)}..."`);
  }
  const verify = path.join(root, 'tests', lang === 'python' ? `ch${n}_verify.py` : `rch${n}_verify.mjs`);
  if (!fs.existsSync(verify)) fail(`missing ${path.basename(verify)}`);
  const pk = lang === 'r' && ch.pkgs && ch.pkgs.length ? ` · pkgs: ${ch.pkgs.join(', ')}` : '';
  console.log(`  ${ch.title}: ${ch.sections.length} sections, ${ch.questions.length} questions, ${ch.exercises.length} exercises${pk}`);
}
console.log(fails === 0 ? `\nSHAPE: ALL PASS (${warns} warning${warns === 1 ? '' : 's'})` : `\nSHAPE: ${fails} FAILURE(S), ${warns} warning(s)`);
process.exit(fails === 0 ? 0 : 1);

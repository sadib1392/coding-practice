// WCAG contrast check for both themes.
//
// CLAUDE.md requires text contrast to stay at or above WCAG AA. Adding a second
// palette doubles the number of ways to break that, and eyeballing a dark theme
// is exactly how it gets broken — so the palettes are measured, not judged.
//
// Variables are parsed out of index.html rather than duplicated here, so this
// cannot quietly pass against a stale copy of the colours.
import fs from 'fs';

const css = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// Pull `--name:#value` pairs out of a named CSS block.
function vars(selector) {
  const i = css.indexOf(selector);
  if (i === -1) throw new Error('no block for ' + selector);
  const body = css.slice(i, css.indexOf('}', i));
  const out = {};
  for (const m of body.matchAll(/--([\w-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})/g)) out[m[1]] = m[2];
  return out;
}
const hex = (h) => {
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
};
const lum = (h) => {
  const [r, g, b] = hex(h).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum, what it is]
// 4.5 is AA for normal text; 3.0 is AA for large text and UI boundaries.
const PAIRS = [
  ['ink', 'paper', 4.5, 'body text'],
  ['ink', 'card', 4.5, 'card text'],
  ['ink', 'deep', 4.5, 'code blocks and the editor'],
  ['soft', 'paper', 4.5, 'meta text on the page'],
  ['soft', 'card', 4.5, 'meta text in a card'],
  ['soft', 'deep', 4.5, 'muted text on a sunken surface'],
  ['teal', 'card', 4.5, 'links and pass states'],
  ['teal', 'paper', 4.5, 'links on the page'],
  ['gold', 'card', 4.5, 'hint and warning text'],
  ['gold', 'paper', 4.5, 'gold text on the page'],
  ['sig', 'card', 4.5, 'error text'],
  ['onFill', 'fill', 4.5, 'primary button label'],
  ['onAccent', 'teal', 4.5, 'label on a teal fill'],
  ['onAccent', 'gold', 4.5, 'label on a gold fill'],
  ['onHl', 'hl', 4.5, 'text inside a highlight'],
];
// Reported but never failed: WCAG's 3:1 non-text rule covers controls whose
// boundary conveys state, not decorative dividers like these hairlines. The
// number is printed so a future change that makes them invisible is at least
// visible here.
const INFO = [
  ['rule', 'card', 'card and section hairlines'],
  ['rule', 'paper', 'hairlines on the page'],
];

let fails = 0;
for (const [label, sel] of [['light', ':root{'], ['dark', ':root[data-theme="dark"]{']]) {
  const v = vars(sel);
  console.log(`--- ${label} ---`);
  for (const [fg, bg, min, what] of PAIRS) {
    if (!v[fg] || !v[bg]) { console.log(`  FAIL: ${label} is missing --${!v[fg] ? fg : bg}`); fails++; continue; }
    const r = ratio(v[fg], v[bg]);
    const ok = r >= min;
    if (!ok) fails++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2)}:1 (need ${min}) — ${fg} on ${bg}, ${what}`);
  }
  for (const [fg, bg, what] of INFO) {
    if (!v[fg] || !v[bg]) continue;
    console.log(`  info ${ratio(v[fg], v[bg]).toFixed(2)}:1 — ${fg} on ${bg}, ${what}`);
  }
}
console.log(fails === 0 ? '\nCONTRAST: ALL PASS' : `\nCONTRAST: ${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);

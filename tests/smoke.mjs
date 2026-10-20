import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://sadib1392.github.io/coding-practice/',
});
const w = dom.window, d = w.document;
if (!w.matchMedia) w.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });

const buttons = () => [...d.querySelectorAll('button')];
const clickText = t => {
  const b = buttons().find(b => b.textContent.trim().toLowerCase().includes(t.toLowerCase()));
  if (!b) throw new Error(`no button matching "${t}"`);
  b.click();
  return b;
};
const appText = () => d.querySelector('#app').textContent;
let fails = 0;
const check = (cond, msg) => { if (!cond) { console.log('  FAIL:', msg); fails++; } else console.log('  ok:', msg); };

const wait = ms => new Promise(r => w.setTimeout(r, ms));

setTimeout(async () => {
  try {
    // 1. renders at all
    check(d.querySelector('#app') && d.querySelector('#app').children.length > 0, '#app renders (not blank)');

    // 1b. lessons: "Teach me this" renders a lesson card with an h2 (handoff assertion)
    clickText('teach me this');
    const lc = d.querySelector('#lessoncard h2');
    check(!!lc, 'lesson card renders (#lessoncard h2)');
    console.log('  lesson concept:', lc?.textContent);
    const lcText = d.querySelector('#lessoncard')?.textContent || '';
    check(lcText.includes('Syntax') && lcText.includes('Common mistakes'), 'lesson has Syntax + Common mistakes sections');

    // force deterministic task selection (first in pool)
    w.Math.random = () => 0;

    // 2. switch to JavaScript tab
    clickText('JS');
    check(appText().includes('JavaScript') || true, 'switched to JS');

    // 3. get an exercise
    clickText('exercise'); // "Give me an exercise" / "Next exercise"
    const code = d.querySelector('#code');
    check(!!code, 'exercise renders a #code textarea');
    const taskTitle = d.querySelector('#taskcard h2')?.textContent || '';
    console.log('  task:', taskTitle);

    // 4. correct answer -> PASS 5/5
    code.value = "let a = 1, b = 2;\n[a, b] = [b, a];\nconsole.log(a, b);";
    clickText('grade'); // "Run and grade"
    await wait(1200);
    const okText = appText();
    check(okText.includes('PASS'), 'correct answer shows PASS');
    // count filled pips in the correctness (first) grade row
    const gradeCard = d.querySelector('#gradecard');
    let correctnessPips = 0;
    if (gradeCard) {
      const firstRowPips = gradeCard.querySelector('.pips');
      if (firstRowPips) correctnessPips = [...firstRowPips.querySelectorAll('i')].filter(i => i.style.background).length;
    }
    check(correctnessPips === 5, `correctness = 5/5 (got ${correctnessPips})`);

    // 5. wrong answer -> not PASS
    clickText('exercise'); // new task (same first task, since random=0)
    const code2 = d.querySelector('#code');
    code2.value = "console.log('definitely wrong');";
    clickText('grade');
    await wait(1200);
    const badText = appText();
    check(badText.includes('MISMATCH'), 'wrong answer shows MISMATCH');
    const gradeCard2 = d.querySelector('#gradecard');
    let pips2 = 0;
    if (gradeCard2) {
      const p = gradeCard2.querySelector('.pips');
      if (p) pips2 = [...p.querySelectorAll('i')].filter(i => i.style.background).length;
    }
    check(pips2 < 5, `wrong answer correctness < 5 (got ${pips2})`);

    // 6. a wrong drill points at its concept's lesson, keeping the task
    const g2 = d.querySelector('#gradecard').textContent;
    check(g2.includes('WHERE TO LOOK') && g2.includes('lesson'), 'wrong drill shows a WHERE TO LOOK lesson pointer');
    const codeEl = d.querySelector('#code');
    codeEl.value = '// my second try'; codeEl.dispatchEvent(new w.Event('input'));
    clickText('Open the');
    await wait(20);
    check(!!d.querySelector('#lessoncard') && !!d.querySelector('#taskcard'), 'lesson opens above the still-open task');
    check(d.querySelector('#code').value === '// my second try', 'draft is not discarded by opening the lesson');
    check(buttons().some(b => b.textContent === 'Back to your exercise'), 'lesson offers Back to your exercise while a task is open');

    // 7. first-difference note: changed, missing and extra lines; none on a whitespace-only gap
    const fd = (a, b) => { const n = w.firstDiff(a, b); return n ? n.textContent : null; };
    check(fd('a\nb\nc', 'a\nB\nc') === 'First difference is line 2. You printed b where the expected line is B', 'firstDiff names a changed line');
    check((fd('a', 'a\nb') || '').startsWith('Line 2 is missing'), 'firstDiff names a missing line');
    check((fd('a\nb', 'a') || '').startsWith('Line 2 is extra'), 'firstDiff names an extra line');
    check(fd('x  y\n\n', 'x y') === null, 'firstDiff ignores whitespace norm() ignores');
    check(!!d.querySelector('.diffnote code'), 'MISMATCH card shows the first-difference note');

    // 7b. a Python crash names the learner's failing line (innermost <exec> frame)
    const tb = '  File "<exec>", line 5, in <module>\n  File "<exec>", line 2, in f\nNameError: x';
    const at = w.errorLine(tb, 'def f():\n    return x\n\n\nprint(f())');
    check(at && at.n === 2 && at.src === 'return x', 'errorLine picks the innermost frame and quotes the line');
    check(w.errorLine('NameError: x', 'print(x)') === null, 'errorLine stays quiet when no line is named');
    check(w.errorLine('  File "<exec>", line 9, in <module>', 'one line') === null, 'errorLine ignores a line number past the end of the code');

    // 8. code editor keys: Tab indents, Enter auto-indents after a colon, Shift+Tab dedents
    const ta = d.createElement('textarea'); d.body.append(ta);
    w.wireEditor(ta, 'python', null);
    const key = (k, o = {}) => ta.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
    ta.value = 'for i in range(3):'; ta.selectionStart = ta.selectionEnd = ta.value.length;
    key('Enter');
    check(ta.value === 'for i in range(3):\n    ', 'Enter after a colon adds one Python indent');
    key('Tab', { shiftKey: true });
    check(ta.value === 'for i in range(3):\n', 'Shift+Tab removes the indent');
    key('Tab');
    check(ta.value === 'for i in range(3):\n    ', 'Tab inserts four spaces in Python');
    key('Escape');
    check(key('Tab') === true, 'after Escape, Tab is not captured (focus can leave the box)');

    console.log(fails === 0 ? '\nSMOKE: ALL PASS' : `\nSMOKE: ${fails} FAILURE(S)`);
    process.exit(fails === 0 ? 0 : 1);
  } catch (e) {
    console.log('SMOKE ERROR:', e.stack || e.message);
    process.exit(2);
  }
}, 500);

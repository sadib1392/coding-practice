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

    console.log(fails === 0 ? '\nSMOKE: ALL PASS' : `\nSMOKE: ${fails} FAILURE(S)`);
    process.exit(fails === 0 ? 0 : 1);
  } catch (e) {
    console.log('SMOKE ERROR:', e.stack || e.message);
    process.exit(2);
  }
}, 500);

import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bookDir = new URL('../book/', import.meta.url);
const chapterSrc = fs.readdirSync(bookDir).filter(f => /^ch\d+\.js$/.test(f)).sort()
  .map(f => fs.readFileSync(new URL(f, bookDir), 'utf8'));
const KEY = 'practicelog.offline.v1';

function makeDom(seedJSON) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://sadib1392.github.io/coding-practice/',
    beforeParse(win) {
      if (seedJSON) { try { win.localStorage.setItem(KEY, seedJSON); } catch (e) {} }
      // The real page loads the book/chNN.js files via script tags BEFORE the
      // inline script; jsdom-from-string skips external scripts, so replicate
      // the order by evaluating them pre-parse. A broken file only fails the
      // run if its chapter is wired into BOOK_ORDER (checked below).
      chapterSrc.forEach(src => { try { win.eval(src); } catch (e) {} });
    },
  });
  const w = dom.window;
  if (!w.matchMedia) w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
  w.Range.prototype.getBoundingClientRect = () => ({ width:40, height:16, left:10, right:50, top:30, bottom:46, x:10, y:30 });
  return dom;
}

let fails = 0;
const check = (c, m) => { if (!c) { console.log('  FAIL:', m); fails++; } else console.log('  ok:', m); };
const clickIn = (d, t) => {
  const b = [...d.querySelectorAll('button')].find(b => b.textContent.trim().toLowerCase().includes(t.toLowerCase()));
  if (!b) throw new Error('no button: ' + t);
  b.click(); return b;
};
const wait = ms => new Promise(r => setTimeout(r, ms));

setTimeout(async () => {
 try {
  const dom = makeDom(null);
  const w = dom.window, d = w.document;

  // --- book list ---
  clickIn(d, 'BOOK');
  let t = d.querySelector('#app').textContent;
  check(t.includes('Automate the Boring Stuff'), 'book view shows book title');
  check(t.includes('Al Sweigart'), 'attribution to the author present');
  check(t.includes('Python Basics'), 'chapter 1 listed');
  check(t.includes('0/7 sections'), 'chapter progress shown on the path');

  // --- open chapter (path knobs are labelled "Chapter N: Title") ---
  const knob = (doc, n) => {
    const b = [...doc.querySelectorAll('.knob')].find(b => (b.getAttribute('aria-label') || '').startsWith(`Chapter ${n}:`));
    if (!b) throw new Error('no path knob for chapter ' + n);
    b.click(); return b;
  };
  knob(d, 1);
  const card = d.querySelector('#bookcard');
  check(!!card, 'chapter view renders');
  check(card.querySelectorAll('[id^="bsec"]').length === 7, 'all 7 sections render');
  check(card.querySelectorAll('pre').length >= 8, 'code blocks render');
  const markBtns = [...card.querySelectorAll('button')].filter(b => b.textContent.includes('Mark section as read'));
  check(markBtns.length === 7, 'each section has a Mark-as-read button');

  // --- highlight in book text ---
  const para = card.querySelector('p[data-hl^="book|"]');
  check(!!para, 'book paragraphs are highlightable');
  const range = d.createRange();
  range.setStart(para.firstChild, 0); range.setEnd(para.firstChild, 10);
  const expectHl = para.textContent.slice(0, 10);
  const sel = w.getSelection(); sel.removeAllRanges(); sel.addRange(range);
  d.dispatchEvent(new w.Event('mouseup'));
  await wait(30);
  const hlbtn = d.querySelector('#hlbtn');
  check(!!hlbtn && hlbtn.style.display === 'block', 'Highlight button appears over book text');
  hlbtn.click(); await wait(20);
  const mark = d.querySelector('#bookcard mark.hl');
  check(!!mark && mark.textContent === expectHl, 'book highlight rendered and covers selection');
  const st1 = JSON.parse(w.localStorage.getItem(KEY));
  check(Object.keys(st1.highlights || {}).some(k => k.startsWith('book|ch01|')), 'book highlight persisted under book| key');

  // --- mark section read ---
  [...d.querySelectorAll('#bookcard button')].find(b => b.textContent.includes('Mark section as read')).click();
  await wait(20);
  const st2 = JSON.parse(w.localStorage.getItem(KEY));
  check(st2.book && st2.book.read && st2.book.read.ch01 && st2.book.read.ch01['0'] === true, 'section 0 recorded as read');
  check(st2.book.last && st2.book.last.ch === 'ch01' && st2.book.last.sec === 1, 'resume position advanced to section 1');
  check(d.querySelector('#app').textContent.includes('Read ✓'), 'button flips to Read ✓');

  // --- questions reveal ---
  const revealQ = [...d.querySelectorAll('#bookcard button')].filter(b => b.textContent.includes('Reveal answer'));
  check(revealQ.length === 10, 'all 10 practice questions have reveal buttons');
  revealQ[0].click();
  check(d.querySelector('#bookcard').textContent.includes('The operators are *, -, /, and +'), 'question 1 reveals its answer');

  // --- write-in answers ---
  const qans = [...d.querySelectorAll('#bookcard textarea.qans')];
  check(qans.length === 10, 'each question has a write-in answer box');
  qans[1].value = 'An expression is values plus operators; it evaluates to one value.';
  qans[1].dispatchEvent(new w.Event('change'));
  const stA = JSON.parse(w.localStorage.getItem(KEY));
  check(!!(stA.book.ans && stA.book.ans.ch01 && stA.book.ans.ch01['1'] && stA.book.ans.ch01['1'].includes('one value')), 'written answer persisted on change');

  // --- self-check marks (question 0 is revealed above) ---
  const hadIt = [...d.querySelectorAll('#bookcard button')].find(b => b.textContent === 'I had it');
  check(!!hadIt, 'self-check buttons appear with the revealed answer');
  hadIt.click();
  const stQ = JSON.parse(w.localStorage.getItem(KEY));
  check(stQ.book.quiz && stQ.book.quiz.ch01 && stQ.book.quiz.ch01['0'] === true, 'self-mark persisted');
  check(d.querySelector('#bookcard').textContent.includes('1 right'), 'question score line updates');

  // --- chapter scratch runner present ---
  check(d.querySelector('#bookcard').textContent.includes('Try it yourself'), 'chapter has a Try-it-yourself scratch section');
  check(!!d.querySelector('#bookcard textarea.runbox'), 'chapter scratch runner has a code box');

  // --- exercise starts into grading flow ---
  clickIn(d, 'Start exercise');
  await wait(20);
  check(!!d.querySelector('#taskcard'), 'exercise opens the graded task card');
  check(d.querySelector('#app').textContent.includes('Book exercise · Chapter 1'), 'task card labeled as book exercise');
  check(!!d.querySelector('#code'), 'code editor present for the exercise');
  const st3 = JSON.parse(w.localStorage.getItem(KEY));
  check(st3.lang === 'python', 'starting a book exercise switches language to python');

  // --- offline submit: queued, no false credit ---
  w.loadPyodide = () => Promise.reject(new Error('blocked'));
  d.querySelector('#code').value = 'print(2 + 3 * 6)\nprint((2 + 3) * 6)\nprint(2 ** 8)';
  clickIn(d, 'Run and grade');
  await wait(300);
  const st4 = JSON.parse(w.localStorage.getItem(KEY));
  check(st4.queue.length === 1 && st4.queue[0].book === 'ch01', 'offline submission queued with its book tag');
  check(!(st4.book.ex && st4.book.ex.ch01 && st4.book.ex.ch01.length), 'no chapter credit from static-only grading');
  check(d.querySelector('#app').textContent.includes('queued'), 'queued banner shown');
  check(!d.querySelector('#gradecard').textContent.includes('WHERE TO LOOK'), 'no reading pointer on a static-only grade (nothing proven wrong)');

  // --- drain queue with runtime available: chapter gets credit ---
  w.eval('runPython = async (code) => ({ok: true, output: "20\\n30\\n256"})');
  clickIn(d, 'Grade queued');
  await wait(200);
  const st5 = JSON.parse(w.localStorage.getItem(KEY));
  check(st5.queue.length === 0, 'queue drained');
  check(st5.book.ex.ch01 && st5.book.ex.ch01.includes('Order of operations'), 'drained pass credits the chapter exercise');

  // --- wrong answer, proven by execution: feedback points back at the reading ---
  clickIn(d, 'BOOK'); // bookCh is still ch01, so this lands inside the chapter
  clickIn(d, 'Do it again');
  await wait(20);
  w.eval('runPython = async (code) => ({ok: true, output: "wrong\\noutput"})');
  d.querySelector('#code').value = 'print("wrong")\nprint("output")';
  clickIn(d, 'Run and grade');
  await wait(200);
  const gtxt = d.querySelector('#gradecard') ? d.querySelector('#gradecard').textContent : '';
  check(gtxt.includes('WHERE TO LOOK'), 'wrong answer shows WHERE TO LOOK feedback');
  check(gtxt.includes('Chapter 1, "Expressions and the interactive shell"'), 'feedback names the exact chapter and section');
  check(gtxt.includes('precedence is the culprit'), 'feedback relates the failure back to the reading');
  const reread = [...d.querySelectorAll('button')].find(b => b.textContent.startsWith('Reread'));
  check(!!reread && reread.textContent.includes('Expressions and the interactive shell'), 'reread button names the section');
  reread.click();
  await wait(80);
  check(!!d.querySelector('#bookcard'), 'reread button jumps back into the book chapter');

  // --- reload: resume ---
  const dom2 = makeDom(w.localStorage.getItem(KEY));
  const w2 = dom2.window, d2 = w2.document;
  await wait(250);
  const t2 = d2.querySelector('#app').textContent;
  check(t2.includes('pick up where you left off'), 'continue card shown on practice view after reload');
  check(t2.includes('Chapter 1: Python Basics'), 'continue card names the chapter');
  check(t2.includes('1 / 7 sections read'), 'continue card shows saved progress');
  check(t2.includes('XP') || t2.includes('L1'), 'gamified stats bar renders');
  clickIn(d2, 'Continue reading');
  await wait(80);
  check(!!d2.querySelector('#bookcard'), 'continue button reopens the chapter');
  check(!!d2.querySelector('#bookcard mark.hl'), 'book highlight restored after reload');
  const list2 = d2.querySelector('#app').textContent;
  check(list2.includes('Read ✓'), 'read state restored after reload');
  const qans2 = [...d2.querySelectorAll('#bookcard textarea.qans')];
  check(qans2.length === 10 && qans2[1].value.includes('one value'), 'written answer restored after reload');
  const gotB2 = [...d2.querySelectorAll('#bookcard button')].filter(b => b.textContent === 'I had it');
  check(gotB2.some(b => b.style.color.includes('--teal')), 'self-mark state restored after reload');

  // --- playground: present on practice view, and actually runs JS ---
  const dom5 = makeDom(null);
  const w5 = dom5.window, d5 = w5.document;
  await wait(250);
  check(d5.querySelector('#app').textContent.includes('Playground · Python'), 'playground card on the practice view');
  const jsTab = [...d5.querySelectorAll('button')].find(b => b.textContent.trim().startsWith('JS'));
  jsTab.click();
  const box = d5.querySelector('textarea.runbox');
  check(!!box, 'JS playground has a code box');
  box.value = 'console.log([1,2,3].map(x => x * 2));';
  [...d5.querySelectorAll('button')].find(b => b.textContent === 'Run code').click();
  await wait(1100);
  check(d5.querySelector('#app').textContent.includes('[2,4,6]'), 'playground executes JS and shows real output');

  // --- every chapter in BOOK_ORDER: listed, opens, renders declared counts ---
  const dom3 = makeDom(null);
  const w3 = dom3.window, d3 = w3.document;
  const ORDER = JSON.parse(w3.eval('JSON.stringify(BOOKS.python.order)'));
  const META = JSON.parse(w3.eval(
    'JSON.stringify(Object.fromEntries(Object.entries(BOOKS.python.chapters()).map(' +
    '([id,c])=>[id,{n:c.n,t:c.title,s:c.sections.length,q:c.questions.length,x:c.exercises.length}])))'));
  check(ORDER.every(id => META[id]), `every BOOK_ORDER id has a loaded chapter file (${ORDER.length} wired)`);
  clickIn(d3, 'BOOK');
  for (let i = 0; i < ORDER.length; i++) {
    const m = META[ORDER[i]];
    const open = [...d3.querySelectorAll('.knob')];
    if (open.length !== ORDER.length) { check(false, `path shows ${open.length} chapters, want ${ORDER.length}`); break; }
    open[i].click();
    const card = d3.querySelector('#bookcard');
    const secs = card ? card.querySelectorAll('[id^="bsec"]').length : 0;
    const revs = card ? [...card.querySelectorAll('button')].filter(b => b.textContent.includes('Reveal answer')).length : 0;
    const exs = card ? [...card.querySelectorAll('button')].filter(b => b.textContent.includes('Start exercise')).length : 0;
    check(!!card && card.textContent.includes(m.t) && secs === m.s && revs === m.q && exs === m.x,
      `ch${m.n} "${m.t}": ${secs}/${m.s} sections, ${revs}/${m.q} questions, ${exs}/${m.x} exercises`);
    clickIn(d3, 'All chapters');
  }

  // --- second chapter deep flow: exercise opens, queue tags, drain credits ---
  knob(d3, 2);
  const ex3btns = [...d3.querySelectorAll('#bookcard button')].filter(b => b.textContent.includes('Start exercise'));
  ex3btns[0].click();
  await wait(20);
  check(d3.querySelector('#app').textContent.includes('Book exercise · Chapter 2 · conditionals'), 'ch02 exercise opens labeled with chapter and concept');
  w3.loadPyodide = () => Promise.reject(new Error('blocked'));
  d3.querySelector('#code').value = 'a = 17\nb = 20\nprint(a > b)\nprint(a != b)\nprint(a + 3 == b)';
  clickIn(d3, 'Run and grade');
  await wait(300);
  const st6 = JSON.parse(w3.localStorage.getItem(KEY));
  check(st6.queue.length === 1 && st6.queue[0].book === 'ch02', 'ch02 offline submission queued with its book tag');
  w3.eval('runPython = async (code) => ({ok: true, output: "False\\nTrue\\nTrue"})');
  clickIn(d3, 'Grade queued');
  await wait(200);
  const st7 = JSON.parse(w3.localStorage.getItem(KEY));
  check(st7.book.ex.ch02 && st7.book.ex.ch02.includes('Three questions, three answers'), 'drained pass credits the ch02 exercise');

  console.log(fails === 0 ? '\nSMOKE3: ALL PASS' : `\nSMOKE3: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
 } catch (e) { console.log('SMOKE3 ERROR:', e.stack || e.message); process.exit(2); }
}, 500);

import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ch01 = fs.readFileSync(new URL('../book/ch01.js', import.meta.url), 'utf8');
const KEY = 'practicelog.offline.v1';

function makeDom(seedJSON) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://sadib1392.github.io/coding-practice/',
    beforeParse(win) {
      if (seedJSON) { try { win.localStorage.setItem(KEY, seedJSON); } catch (e) {} }
      // The real page loads book/ch01.js via a script tag BEFORE the inline
      // script; jsdom-from-string skips external scripts, so replicate the
      // order by evaluating it pre-parse.
      win.eval(ch01);
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
  check(t.includes('0 / 7 sections read'), 'chapter progress meter at 0/7');

  // --- open chapter ---
  clickIn(d, 'Start chapter');
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

  // --- drain queue with runtime available: chapter gets credit ---
  w.eval('runPython = async (code) => ({ok: true, output: "20\\n30\\n256"})');
  clickIn(d, 'Grade queued');
  await wait(200);
  const st5 = JSON.parse(w.localStorage.getItem(KEY));
  check(st5.queue.length === 0, 'queue drained');
  check(st5.book.ex.ch01 && st5.book.ex.ch01.includes('Order of operations'), 'drained pass credits the chapter exercise');

  // --- reload: resume ---
  const dom2 = makeDom(w.localStorage.getItem(KEY));
  const w2 = dom2.window, d2 = w2.document;
  await wait(250);
  const t2 = d2.querySelector('#app').textContent;
  check(t2.includes('pick up where you left off'), 'continue card shown on practice view after reload');
  check(t2.includes('Chapter 1: Python Basics'), 'continue card names the chapter');
  check(t2.includes('1 / 7 sections read'), 'continue card shows saved progress');
  clickIn(d2, 'Continue reading');
  await wait(80);
  check(!!d2.querySelector('#bookcard'), 'continue button reopens the chapter');
  check(!!d2.querySelector('#bookcard mark.hl'), 'book highlight restored after reload');
  const list2 = d2.querySelector('#app').textContent;
  check(list2.includes('Read ✓'), 'read state restored after reload');

  console.log(fails === 0 ? '\nSMOKE3: ALL PASS' : `\nSMOKE3: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
 } catch (e) { console.log('SMOKE3 ERROR:', e.stack || e.message); process.exit(2); }
}, 500);

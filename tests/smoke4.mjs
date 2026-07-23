// Gamification: XP, levels, hearts, quests, badges, streak, persistence.
// Mechanics that hand out rewards must also be able to withhold them, so the
// negative cases (wrong answer earns nothing, hearts run out, repeat pass is
// worth less) are checked as carefully as the positive ones.
import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const bookDir = new URL('../book/', import.meta.url);
const chapterSrc = fs.readdirSync(bookDir).filter(f => /^(ch|r)\d+\.js$/.test(f)).sort()
  .map(f => fs.readFileSync(new URL(f, bookDir), 'utf8'));
const KEY = 'practicelog.offline.v1';

function makeDom(seedJSON) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://sadib1392.github.io/coding-practice/',
    beforeParse(win) {
      if (seedJSON) { try { win.localStorage.setItem(KEY, seedJSON); } catch (e) {} }
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
const wait = ms => new Promise(r => setTimeout(r, ms));
// Read live state (and flush it to storage) — a fresh session has not persisted
// anything yet, so reading localStorage alone would come back null.
const state = w => JSON.parse(w.eval('persist(); JSON.stringify(S)'));

setTimeout(async () => {
 try {
  const dom = makeDom(null);
  const w = dom.window, d = w.document;
  await wait(60);

  // --- defaults ---
  let s = state(w);
  check(s.game && s.game.xp === 0, 'new state starts at 0 XP');
  check(s.game.hearts === 5 && s.game.goal === 50, 'hearts and daily goal seeded');
  check((s.game.quests.items || []).length === 3, 'three daily quests rolled');
  const q1 = JSON.stringify(s.game.quests.items.map(i => i.id));

  // quests must be stable across a reload on the same day, not reshuffled
  const domB = makeDom(w.eval('persist(); localStorage.getItem("' + KEY + '")'));
  await wait(60);
  check(JSON.stringify(state(domB.window).game.quests.items.map(i => i.id)) === q1, 'quests stay fixed for the day across reload');

  // --- XP for reading a section ---
  w.eval('S.lang="python"; view="book"; bookCh="ch01"; render();');
  const readBtn = [...d.querySelectorAll('#bookcard button')].find(b => b.textContent.includes('Mark section as read'));
  readBtn.click(); await wait(20);
  s = state(w);
  check(s.game.xp === 4, `reading a section awards XP.section (got ${s.game.xp})`);
  const readQuest = s.game.quests.items.find(i => i.id === 'read');
  check(!readQuest || readQuest.have === 1, 'read quest advanced when present');

  // re-marking the same section must NOT pay again
  [...d.querySelectorAll('#bookcard button')].find(b => b.textContent.includes('Read ✓')).click();
  await wait(20);
  check(state(w).game.xp === 4, 'marking an already-read section awards nothing');

  // --- passing an exercise: XP, combo, no heart lost ---
  w.eval('runPython = async () => ({ok:true, output:"20\\n30\\n256"});');
  w.eval('startBookExercise("ch01",0);');
  await wait(20);
  d.querySelector('#code').value = 'print(2 + 3 * 6)\nprint((2 + 3) * 6)\nprint(2 ** 8)';
  [...d.querySelectorAll('button')].find(b => b.textContent.includes('Run and grade')).click();
  await wait(300);
  s = state(w);
  check(s.game.xp === 4 + 12, `first pass awards XP.exercise (got ${s.game.xp})`);
  check(s.game.combo === 1, 'combo starts at 1');
  check(s.game.hearts === 5, 'a correct answer costs no heart');
  check(s.book.ex.ch01.includes('Order of operations'), 'exercise credited to the chapter');
  const exQuest = s.game.quests.items.find(i => i.id === 'ex');
  check(!exQuest || exQuest.have === 1, 'exercise quest advanced when present');
  check(!!s.game.badges.first, 'first-exercise badge unlocked');

  // --- repeat pass is worth less than the first ---
  const before = state(w).game.xp;
  w.eval('startBookExercise("ch01",0);');
  await wait(20);
  d.querySelector('#code').value = 'print(2 + 3 * 6)\nprint((2 + 3) * 6)\nprint(2 ** 8)';
  [...d.querySelectorAll('button')].find(b => b.textContent.includes('Run and grade')).click();
  await wait(300);
  s = state(w);
  const gained = s.game.xp - before;
  check(gained < 12 + 10, `repeating an exercise pays less than first time (gained ${gained})`);
  check(s.game.combo === 2, 'combo increments on a second correct answer');

  // --- wrong answer: no XP, combo reset, heart lost ---
  w.eval('runPython = async () => ({ok:true, output:"wrong"});');
  const xpBeforeWrong = state(w).game.xp;
  w.eval('startBookExercise("ch01",1);');
  await wait(20);
  d.querySelector('#code').value = 'print("wrong")';
  [...d.querySelectorAll('button')].find(b => b.textContent.includes('Run and grade')).click();
  await wait(300);
  s = state(w);
  check(s.game.xp === xpBeforeWrong, 'a wrong answer awards no XP');
  check(s.game.combo === 0, 'a wrong answer resets the combo');
  check(s.game.hearts === 4, `a wrong answer costs a heart (got ${s.game.hearts})`);

  // --- hearts run out and gate grading ---
  w.eval('S.game.hearts=0; persist();');
  w.eval('startBookExercise("ch01",1);');
  await wait(20);
  d.querySelector('#code').value = 'print("anything")';
  const xpAtZero = state(w).game.xp, sessionsAtZero = state(w).sessions.length;
  [...d.querySelectorAll('button')].find(b => b.textContent.includes('Run and grade')).click();
  await wait(200);
  check(d.querySelector('#app').textContent.includes('Out of hearts'), 'zero hearts blocks grading with a message');
  check(state(w).sessions.length === sessionsAtZero, 'blocked submission is not logged');
  check(state(w).game.xp === xpAtZero, 'blocked submission awards no XP');

  // --- hearts off means never blocked ---
  w.eval('S.game.opts.hearts=false; S.game.hearts=0; persist(); runPython = async () => ({ok:true, output:"AliceBob\\nspamspamspam\\n8"});');
  w.eval('startBookExercise("ch01",1);');
  await wait(20);
  d.querySelector('#code').value = "print('Alice' + 'Bob')\nprint('spam' * 3)\nprint(len('automate'))";
  [...d.querySelectorAll('button')].find(b => b.textContent.includes('Run and grade')).click();
  await wait(300);
  check(!d.querySelector('#app').textContent.includes('Out of hearts'), 'hearts off removes the gate');
  check(state(w).book.ex.ch01.includes('Join and repeat'), 'exercise still credited with hearts off');

  // --- levels ---
  w.eval('S.game.xp=0; persist();');
  check(w.eval('levelInfo(0).level') === 1, 'level 1 at 0 XP');
  check(w.eval('levelInfo(99).level') === 1, 'still level 1 just under the threshold');
  check(w.eval('levelInfo(100).level') === 2, 'level 2 at 100 XP');
  check(w.eval('levelInfo(250).level') === 3, 'level 3 at 250 XP (curve widens)');

  // --- daily rollover clears today's XP but keeps the total ---
  w.eval('S.game.xp=500; S.game.todayXp=120; S.game.day="2000-01-01"; persist(); ensureGame(); persist();');
  s = state(w);
  check(s.game.todayXp === 0 && s.game.xp === 500, 'new day resets todayXp and keeps total XP');
  check(s.game.day === new Date().toISOString().slice(0, 10), 'day stamp updated');

  // --- chapter completion celebration ---
  const dom2 = makeDom(null);
  const w2 = dom2.window, d2 = w2.document;
  await wait(60);
  w2.eval(`ensureBook();
    const ch=BOOKS.python.chapters().ch01;
    S.book.read.ch01={}; for(let i=0;i<ch.sections.length;i++) S.book.read.ch01[i]=true;
    S.book.ex.ch01=ch.exercises.slice(1).map(e=>e.t);
    persist();
    runPython = async () => ({ok:true, output:"20\\n30\\n256"});
    startBookExercise("ch01",0);`);
  await wait(20);
  d2.querySelector('#code').value = 'print(2 + 3 * 6)\nprint((2 + 3) * 6)\nprint(2 ** 8)';
  [...d2.querySelectorAll('button')].find(b => b.textContent.includes('Run and grade')).click();
  await wait(300);
  check(!!d2.querySelector('#party'), 'finishing a chapter shows the celebration');
  check(d2.querySelector('#party').textContent.includes('Chapter complete'), 'celebration names the achievement');
  check(!!state(w2).game.badges.chapter, 'chapter badge unlocked');
  const partyXp = state(w2).game.xp;
  check(partyXp >= 40, `chapter bonus awarded (xp ${partyXp})`);
  [...d2.querySelectorAll('#party button')].find(b => b.textContent.includes('Keep going')).click();
  await wait(20);
  check(!d2.querySelector('#party'), 'celebration dismisses');

  console.log(fails === 0 ? '\nSMOKE4: ALL PASS' : `\nSMOKE4: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
 } catch (e) { console.log('SMOKE4 ERROR:', e.stack || e.message); process.exit(2); }
}, 500);

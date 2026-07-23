import { JSDOM } from 'jsdom';
import fs from 'fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://sadib1392.github.io/coding-practice/' });
const w = dom.window, d = w.document;
if (!w.matchMedia) w.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
// jsdom has no layout; give ranges a non-zero rect so the highlight button logic runs
w.Range.prototype.getBoundingClientRect = () => ({ width:40, height:16, left:10, right:50, top:30, bottom:46, x:10, y:30 });
w.Element.prototype.getBoundingClientRect = w.Element.prototype.getBoundingClientRect || (() => ({width:80,height:30,left:0,top:0,right:80,bottom:30}));

let fails=0;
const check=(c,m)=>{ if(!c){console.log('  FAIL:',m);fails++;} else console.log('  ok:',m); };
const clickText=t=>{ const b=[...d.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase().includes(t.toLowerCase())); if(!b) throw new Error('no button: '+t); b.click(); return b; };
const wait=ms=>new Promise(r=>w.setTimeout(r,ms));
const KEY='practicelog.offline.v1';

setTimeout(async ()=>{
 try{
  // open a lesson (python default, first concept)
  clickText('teach me this');
  const card=d.querySelector('#lessoncard');
  check(!!card, 'lesson card present');
  const txt=card.textContent;
  check(txt.includes('Reading'), 'has Reading section');
  check(txt.includes('Syntax'), 'has Syntax section');
  check(txt.includes('Common mistakes'), 'has Common mistakes section');
  check(txt.includes('Practice'), 'has Practice section');

  // reading paragraphs are highlightable prose blocks
  const hlBlocks=card.querySelectorAll('[data-hl]');
  check(hlBlocks.length>=8, `highlightable prose blocks present (${hlBlocks.length})`);

  // practice reveal: output hidden until revealed
  const revealBtn=[...card.querySelectorAll('button')].find(b=>b.textContent.includes('Reveal output'));
  check(!!revealBtn, 'reveal button present');
  // find its answer container (next sibling div)
  const ansBefore=revealBtn.parentNode.querySelector('div[style*="display:none"], div[style*="display: none"]');
  check(!!ansBefore, 'practice answer hidden before reveal');
  revealBtn.click();
  const shownAns=revealBtn.parentNode.querySelector('div');
  check(shownAns && shownAns.style.display==='block', 'practice answer shown after reveal');
  check(revealBtn.textContent.includes('Hide'), 'reveal button toggles to Hide');

  // ---- highlight round-trip ----
  const para=d.querySelector('#lessoncard p[data-hl]');
  check(!!para, 'found a highlightable paragraph');
  const tnode=para.firstChild; // single text node before any marks
  const full=para.textContent;
  const range=d.createRange();
  range.setStart(tnode,0); range.setEnd(tnode,7);
  const expected=full.slice(0,7);
  const sel=w.getSelection(); sel.removeAllRanges(); sel.addRange(range);

  // user releases selection -> button appears -> user taps Highlight
  d.dispatchEvent(new w.Event('mouseup'));
  await wait(30);
  const hlbtn=d.querySelector('#hlbtn');
  check(!!hlbtn && hlbtn.style.display==='block', 'Highlight button appears on selection');
  hlbtn.click();
  await wait(20);

  const mark=d.querySelector('#lessoncard mark.hl');
  check(!!mark, 'a <mark> highlight is rendered');
  check(mark && mark.textContent===expected, `highlight covers the selected text ("${mark&&mark.textContent}" == "${expected}")`);

  // persisted to localStorage (single writer, inside S)
  const saved=JSON.parse(w.localStorage.getItem(KEY));
  const hlKeys=Object.keys(saved.highlights||{});
  check(hlKeys.length>=1, 'highlight persisted into S.highlights');

  // reload a fresh DOM, seeding storage BEFORE the app script reads it
  const savedJSON=w.localStorage.getItem(KEY);
  const dom2=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://sadib1392.github.io/coding-practice/',
    beforeParse(win){ try{ win.localStorage.setItem(KEY, savedJSON); }catch(e){} }});
  const w2=dom2.window,d2=dom2.window.document;
  if(!w2.matchMedia) w2.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
  await new Promise(r=>setTimeout(r,300));
  const teach2=[...d2.querySelectorAll('button')].find(b=>b.textContent.toLowerCase().includes('teach me this'));
  teach2 && teach2.click();
  const restored=d2.querySelector('#lessoncard mark.hl');
  check(!!restored, 'highlight restored after reload from storage');
  check(restored && restored.textContent===expected, 'restored highlight covers the right text');

  // remove: click the mark -> highlight gone
  mark.click();
  await wait(20);
  check(!d.querySelector('#lessoncard mark.hl'), 'clicking a highlight removes it');
  const saved2=JSON.parse(w.localStorage.getItem(KEY));
  check(Object.keys(saved2.highlights||{}).length===0, 'removal persisted (highlights cleared)');

  console.log(fails===0?'\nSMOKE2: ALL PASS':`\nSMOKE2: ${fails} FAILURE(S)`);
  process.exit(fails===0?0:1);
 }catch(e){ console.log('SMOKE2 ERROR:', e.stack||e.message); process.exit(2); }
}, 500);

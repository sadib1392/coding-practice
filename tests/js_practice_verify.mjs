// Requires: npm install jsdom (any dir). Prints each JS practice snippet with
// its output through a faithful replica of the app runJS shim — eyeball against
// LESSONS.javascript practice entries after any edit.
// Verify every JS practice snippet through a faithful replica of the app's runJS.
const S = [
["let/const & types", `let x = 5;
x = x + 1;
console.log(x);
console.log(typeof x, typeof 'hi', typeof true);`],
["let/const & types", `console.log('5' == 5);
console.log('5' === 5);
console.log(1 == true);`],
["let/const & types", `const nums = [1, 2];
nums.push(3);
console.log(nums);
console.log(nums.length);`],

["template literals", `const name = 'ada';
const age = 36;
console.log(\`\${name} will be \${age + 1} next year\`);`],
["template literals", `const a = 7, b = 3;
console.log(\`\${a} times \${b} is \${a * b}\`);`],
["template literals", `const score = 82;
console.log(\`You \${score >= 60 ? 'passed' : 'failed'} with \${score}\`);`],

["arrays", `const nums = [1, 2, 3, 4, 5];
console.log(nums.slice(1, 3));
console.log(nums);`],
["arrays", `const nums = [10, 2, 33, 4];
console.log([...nums].sort());
console.log([...nums].sort((a, b) => a - b));`],
["arrays", `const pets = ['cat', 'dog'];
console.log(pets.includes('dog'));
console.log(pets.indexOf('fish'));`],

["objects", `const o = {name: 'Ada', age: 36};
const k = 'name';
console.log(o.name);
console.log(o[k]);
console.log('city' in o);`],
["objects", `const a = {n: 1};
const b = a;
b.n = 2;
console.log(a.n);
const c = {...a};
c.n = 3;
console.log(a.n);`],
["objects", `const o = {x: 1, y: 2};
console.log(Object.keys(o));
console.log(Object.entries(o));`],

["functions & arrow fns", `const double = x => x * 2;
const triple = x => { return x * 3; };
console.log(double(4));
console.log(triple(4));`],
["functions & arrow fns", `function greet(name = 'there') {
  return 'hi ' + name;
}
console.log(greet());
console.log(greet('ada'));`],
["functions & arrow fns", `const make = x => ({value: x});
console.log(make(5));`],

["map/filter/reduce", `const nums = [1, 2, 3, 4];
console.log(nums.map(x => x * 10));
console.log(nums);`],
["map/filter/reduce", `const nums = [5, 12, 8, 21];
console.log(nums.filter(x => x > 7).map(x => x * 2));`],
["map/filter/reduce", `const nums = [3, 1, 4, 1, 5];
console.log(nums.reduce((acc, x) => acc + x, 0));
console.log(nums.reduce((a, b) => Math.max(a, b)));`],

["destructuring", `const [first, , third, ...rest] = [10, 20, 30, 40, 50];
console.log(first, third);
console.log(rest);`],
["destructuring", `const person = {name: 'Ada', city: 'London'};
const {name: n, country = 'UK'} = person;
console.log(n);
console.log(country);`],
["destructuring", `let a = 1, b = 2;
[a, b] = [b, a];
console.log(a, b);`],

["promises", `console.log('one');
Promise.resolve('three').then(v => console.log(v));
console.log('two');`],
["promises", `const p = new Promise(resolve => resolve(21));
p.then(v => v * 2).then(v => console.log(v));`],
["promises", `Promise.reject(new Error('nope'))
  .then(() => console.log('never'))
  .catch(e => console.log('caught:', e.message));`],

["async/await", `async function f() {
  console.log('start');
  const v = await Promise.resolve(42);
  console.log('got', v);
}
await f();
console.log('after');`],
["async/await", `const delay = v => new Promise(r => setTimeout(() => r(v), 50));
const a = await delay('first');
console.log(a);
const b = await delay('second');
console.log(b);`],
["async/await", `try {
  await Promise.reject(new Error('bad'));
  console.log('never');
} catch (e) {
  console.log('caught', e.message);
}`],

["closures", `function counter() {
  let c = 0;
  return () => ++c;
}
const next = counter();
console.log(next());
console.log(next());
console.log(next());`],
["closures", `function counter() {
  let c = 0;
  return () => ++c;
}
const a = counter();
const b = counter();
a(); a();
console.log(a(), b());`],
["closures", `const fns = [];
for (let i = 0; i < 3; i++) {
  fns.push(() => i * 10);
}
console.log(fns.map(f => f()));`],
];

// faithful replica of the app's runJS
async function runJS(code) {
  const out = [];
  const fmt = v => typeof v === "string" ? v : (() => { try { return JSON.stringify(v); } catch (e) { return String(v); } })();
  const shim = { log: (...a) => out.push(a.map(fmt).join(" ")), error: (...a) => out.push(a.map(fmt).join(" ")), warn: () => {}, info: (...a) => out.push(a.map(fmt).join(" ")) };
  try {
    const fn = new Function("console", `return (async()=>{\n${code}\n})()`);
    await fn(shim);
    await new Promise(r => setTimeout(r, 700));
    return { ok: true, output: out.join("\n") };
  } catch (e) { return { ok: false, output: out.join("\n"), error: String(e.message || e) }; }
}

for (const [concept, code] of S) {
  const r = await runJS(code);
  console.log("### " + concept);
  console.log("--code--");
  console.log(code);
  console.log("--out-- ok=" + r.ok);
  console.log(JSON.stringify(r.output));
  if (!r.ok) console.log("ERROR: " + r.error);
  console.log("");
}

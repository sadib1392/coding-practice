// R ladder verification: every stored output is re-derived by running R.
//
// WHY: the R side of the concept ladder claims an exact expected output for all
// 30 BANK.r drills and all 45 LESSONS.r practice problems. Those claims are only
// worth anything if they came out of the runtime the learner uses, which is
// WebR (R 4.6.0 in WASM) — not any R installed on this machine. This script
// runs everything in WebR and diffs it against what index.html stores.
//
// The drill data in index.html holds the expected output but not a solution
// (there is nothing to hold it — the learner writes the code), so the reference
// solutions live here, in REFS, keyed by drill title. Drift in either direction
// fails: a drill with no reference, or a reference with no drill.
//
// The practice problems DO carry their code, so those are read straight out of
// index.html and nothing is hand-copied.
//
// Requires the dev-only packages (gitignored): npm install jsdom webr
// Run from the repo root:  node tests/rpractice_verify.mjs
import { JSDOM } from 'jsdom';
import fs from 'fs';
import { makeR, makeChecker } from './rverify.mjs';

const LADDER_R = ["vectors","data types","data frames","indexing","functions","apply family",
  "tibbles & pipes","dplyr verbs","grouping & summaries","tidy data","joins",
  "ggplot2 basics","strings & regex","factors & dates","iteration"];

// Reference solutions, one per BANK.r drill title. These are what the drill
// brief asks for; their output is what the drill stores as `o`.
const REFS = {
  "Vector stats": "v <- c(3, 8, 12, 5, 9)\nprint(mean(v))\nprint(max(v))",
  "Recycled addition": "print(c(1, 2, 3, 4) + c(10, 20))",
  "Coerce and check": "print(class(c(1, \"a\", TRUE)))\nprint(class(c(1, TRUE)))",
  "Missing values": "v <- c(4, NA, 8)\nprint(sum(v))\nprint(sum(v, na.rm = TRUE))\nprint(sum(is.na(v)))",
  "Filter rows": "df <- data.frame(name = c(\"Ana\", \"Bo\", \"Cy\"), score = c(88, 72, 95))\nprint(df[df$score > 80, ])",
  "Add a total column": "df <- data.frame(item = c(\"pen\", \"book\"), price = c(2, 15), qty = c(3, 2))\ndf$total <- df$price * df$qty\nprint(df)",
  "Every other": "v <- 1:10\nprint(v[seq(1, length(v), by = 2)])",
  "Drop and test": "v <- c(5, 12, 7, 20, 3)\nprint(v[-1])\nprint(v[v > 6])",
  "Default argument": "greet <- function(name, greeting = \"Hello\") print(paste(greeting, name))\ngreet(\"Ada\")\ngreet(\"Ada\", \"Hi\")",
  "Rescale to 0 and 1": "rescale <- function(v) (v - min(v)) / (max(v) - min(v))\nprint(rescale(c(2, 4, 10)))",
  "Column means": "df <- data.frame(a = c(1, 2, 3), b = c(4, 5, 6))\nprint(sapply(df, mean))",
  "Square each": "print(sapply(1:5, function(x) x^2))",
  "Build a tibble": "suppressPackageStartupMessages(library(tibble))\nt <- tibble(x = 1:3, y = c(\"a\", \"b\", \"c\"))\nprint(t)",
  "Pipe a chain": "print(c(4, 9, 16) |> sqrt() |> sum())",
  "Filter and sort": "suppressPackageStartupMessages(library(dplyr))\ndf <- data.frame(name = c(\"Ana\", \"Bo\", \"Cy\", \"Dee\"), score = c(88, 72, 95, 81))\nprint(df |> filter(score > 80) |> arrange(desc(score)) |> select(name, score))",
  "Mutate a total": "suppressPackageStartupMessages(library(dplyr))\ndf <- data.frame(item = c(\"pen\", \"book\", \"mug\"), price = c(2, 15, 9), qty = c(3, 2, 1))\nprint(df |> mutate(total = price * qty) |> arrange(desc(total)))",
  "Points per team": "suppressPackageStartupMessages(library(dplyr))\ndf <- data.frame(team = c(\"red\", \"blue\", \"red\", \"blue\"), pts = c(3, 5, 7, 1))\nprint(df |> group_by(team) |> summarise(total = sum(pts)) |> arrange(team))",
  "Rows per city": "suppressPackageStartupMessages(library(dplyr))\ndf <- data.frame(city = c(\"Rome\", \"Oslo\", \"Rome\", \"Rome\", \"Oslo\"))\nprint(df |> count(city) |> arrange(city))",
  "Make it long": "suppressPackageStartupMessages(library(tidyr))\ndf <- data.frame(name = c(\"Ana\", \"Bo\"), q1 = c(3, 5), q2 = c(8, 2))\nprint(pivot_longer(df, cols = c(q1, q2), names_to = \"quarter\", values_to = \"sales\"))",
  "Make it wide": "suppressPackageStartupMessages(library(tidyr))\ndf <- data.frame(name = c(\"Ana\", \"Ana\", \"Bo\", \"Bo\"), quarter = c(\"q1\", \"q2\", \"q1\", \"q2\"), sales = c(3, 8, 5, 2))\nprint(pivot_wider(df, names_from = quarter, values_from = sales))",
  "Inner join": "suppressPackageStartupMessages(library(dplyr))\npeople <- data.frame(id = c(1, 2, 3), name = c(\"Ana\", \"Bo\", \"Cy\"))\nplaces <- data.frame(id = c(1, 3), city = c(\"Rome\", \"Oslo\"))\nprint(inner_join(people, places, by = \"id\") |> arrange(id))",
  "Left join keeps everyone": "suppressPackageStartupMessages(library(dplyr))\npeople <- data.frame(id = c(1, 2, 3), name = c(\"Ana\", \"Bo\", \"Cy\"))\nplaces <- data.frame(id = c(1, 3), city = c(\"Rome\", \"Oslo\"))\nprint(left_join(people, places, by = \"id\") |> arrange(id))",
  "Inspect the plot": "suppressPackageStartupMessages(library(ggplot2))\ndf <- data.frame(w = c(1, 2, 3, 4), h = c(2, 4, 6, 9))\np <- ggplot(df, aes(x = w, y = h)) + geom_point() + labs(x = \"Width\")\ncat(p$labels$x, \"\\n\")\ncat(nrow(p$data), \"\\n\")",
  "Count the layers": "suppressPackageStartupMessages(library(ggplot2))\ndf <- data.frame(w = c(1, 2, 3, 4), h = c(2, 4, 6, 9))\np <- ggplot(df, aes(x = w, y = h)) + geom_point() + geom_line() + labs(title = \"Growth\")\ncat(p$labels$title, \"\\n\")\ncat(length(p$layers), \"\\n\")",
  "Which ones match": "v <- c(\"apple pie\", \"banana\", \"cherry pie\")\nprint(sum(grepl(\"pie\", v)))\nprint(v[grepl(\"pie\", v)])",
  "Clean the labels": "suppressPackageStartupMessages(library(stringr))\nv <- c(\"  Red \", \"BLUE\", \" green\")\nprint(str_to_lower(str_trim(v)))",
  "Ordered levels": "f <- factor(c(\"low\", \"high\", \"med\", \"low\"), levels = c(\"low\", \"med\", \"high\"))\nprint(levels(f))\nprint(table(f))",
  "Days between": "d1 <- as.Date(\"2024-03-01\")\nd2 <- as.Date(\"2024-01-15\")\nprint(d1 - d2)\nprint(format(d2, \"%Y-%m\"))",
  "Double until 100": "n <- 1\nsteps <- 0\nwhile (n < 100) {\n  n <- n * 2\n  steps <- steps + 1\n}\nprint(n)\nprint(steps)",
  "Squares by hand": "v <- c(2, 5, 9)\nout <- numeric(length(v))\nfor (i in seq_along(v)) {\n  out[i] <- v[i]^2\n}\nprint(out)",
};

// Every package any drill or practice snippet attaches. Installed once up front.
const PKGS = ['dplyr', 'tidyr', 'ggplot2', 'tibble', 'stringr'];

// Trailing whitespace is the only thing dropped from a captured transcript: R
// pads printed names, and cat(x, "\n") puts a space before the newline. Neither
// survives an editor, and the app's norm() ignores whitespace runs when grading.
const tidy = (s) => String(s).replace(/\r/g, '').split('\n')
  .map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\s+$/, '');

// Read the live data out of index.html rather than restating it here, so that
// editing a drill and forgetting to re-verify it shows up as a failure.
function readApp() {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: 'https://sadib1392.github.io/coding-practice/',
    beforeParse(win) {
      if (!win.matchMedia) win.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} });
    },
  });
  const w = dom.window;
  const grab = (expr) => JSON.parse(w.eval(`JSON.stringify(${expr})`));
  const data = { ladder: grab('LADDER.r'), bank: grab('BANK.r'), lessons: grab('LESSONS.r') };
  dom.window.close();
  return data;
}

const { ladder, bank, lessons } = readApp();
const V = makeChecker('RPRACTICE');
const capture = process.argv.includes('--capture');
const captured = {};

// ---- 1. shape: every ladder concept taught and drilled ----
V.check('LADDER.r matches the 15 expected concepts', ladder.join(' | '), LADDER_R.join(' | '));
for (const c of LADDER_R) {
  const L = lessons[c];
  V.checkTrue(`lesson exists: ${c}`, !!L);
  if (!L) continue;
  V.checkTrue(`lesson has all five keys: ${c}`,
    ['i', 's', 'w', 'read', 'practice'].every((k) => L[k] && L[k].length),
    ['i', 's', 'w', 'read', 'practice'].filter((k) => !(L[k] && L[k].length)).join(', ') + ' missing');
  V.checkTrue(`${c}: 6-8 syntax pairs`, (L.s || []).length >= 6 && (L.s || []).length <= 8, `has ${(L.s || []).length}`);
  V.checkTrue(`${c}: 3 gotchas`, (L.w || []).length === 3, `has ${(L.w || []).length}`);
  V.checkTrue(`${c}: 3 reading paragraphs`, (L.read || []).length === 3, `has ${(L.read || []).length}`);
  V.checkTrue(`${c}: 3 practice problems`, (L.practice || []).length === 3, `has ${(L.practice || []).length}`);
  V.checkTrue(`${c}: 2 drills`, bank.filter((d) => d.c === c).length === 2,
    `has ${bank.filter((d) => d.c === c).length}`);
}
// A drill on a concept the ladder does not list can never be reached.
for (const d of bank) V.checkTrue(`drill concept is on the ladder: ${d.t}`, LADDER_R.includes(d.c), d.c);
// The register rule, mechanically checkable in one respect.
const shout = [];
for (const d of bank) if ((d.b + d.h.join(' ')).includes('!')) shout.push('drill ' + d.t);
for (const c of LADDER_R) {
  const L = lessons[c]; if (!L) continue;
  const text = [L.i, ...L.w, ...(L.read || []), ...(L.practice || []).map((p) => p.why),
    ...L.s.map((p) => p[1])].join(' ');
  if (text.includes('!')) shout.push('lesson ' + c);
}
V.checkTrue('no exclamation marks anywhere', shout.length === 0, shout.join(', '));
// Every drill needing a package must declare it AND attach it, or it fails for
// the learner the first time they meet it.
for (const d of bank) {
  const ref = REFS[d.t] || '';
  const attaches = [...ref.matchAll(/library\(([a-zA-Z0-9.]+)\)/g)].map((m) => m[1]).sort();
  const declared = (d.pkgs || []).slice().sort();
  V.check(`pkgs declared match libraries attached: ${d.t}`, attaches.join(','), declared.join(','));
}
// Reference solutions and drills must be in exact correspondence.
const missing = bank.filter((d) => !REFS[d.t]).map((d) => d.t);
const orphan = Object.keys(REFS).filter((t) => !bank.some((d) => d.t === t));
V.checkTrue('every drill has a reference solution', missing.length === 0, missing.join(', '));
V.checkTrue('every reference solution has a drill', orphan.length === 0, orphan.join(', '));
V.checkTrue('30 drills in total', bank.length === 30, `has ${bank.length}`);

// ---- 2. execution: every stored output re-derived in WebR ----
const R = await makeR(PKGS);
// One instance runs everything, so clear the global environment between
// snippets: each drill and each problem has to stand on its own.
async function run(code) {
  await R.run('rm(list = ls())');
  const r = await R.runRaw(code);
  if (r.errored) return { out: tidy(r.output), err: r.errorLine };
  return { out: tidy(r.output), err: null };
}

for (const d of bank) {
  const ref = REFS[d.t];
  if (!ref) continue;
  const { out, err } = await run(ref);
  if (err) { V.checkTrue(`drill runs: ${d.t}`, false, err); continue; }
  captured['drill:' + d.t] = out;
  if (!capture) V.check(`drill output: ${d.t}`, out, d.o);
}
for (const c of LADDER_R) {
  const L = lessons[c];
  if (!L || !L.practice) continue;
  for (let i = 0; i < L.practice.length; i++) {
    const p = L.practice[i];
    const { out, err } = await run(p.code);
    if (err) { V.checkTrue(`practice runs: ${c} #${i + 1}`, false, err); continue; }
    captured[`practice:${c}#${i + 1}`] = out;
    if (!capture) V.check(`practice output: ${c} #${i + 1}`, out, p.out);
  }
}
await R.close();

if (capture) { console.log(JSON.stringify(captured, null, 1)); process.exit(0); }
V.done();

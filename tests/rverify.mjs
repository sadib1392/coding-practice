// Shared WebR harness for R book chapter verification.
//
// WHY THIS EXISTS: the app runs R through WebR (R 4.6.0 compiled to WASM), which
// is NOT the same as any R installed on this machine (local R is 4.3.2). Package
// versions differ too. Outputs captured from local R would be a guess about what
// the learner actually sees. Everything here runs in WebR, so a chapter's shown
// output is the output the app produces.
//
// Requires the dev-only `webr` npm package (gitignored, like jsdom):
//   npm install webr
// Package downloads come from the WebR CRAN repo, so a network connection is
// needed the first time a package is used in a run.
import { WebR } from 'webr';

// Mirrors R_UNIVERSE in index.html. Keep the two in step.
export const R_UNIVERSE = { RSQLite: 'https://r-dbi.r-universe.dev' };

// Boot one WebR instance and install the packages a chapter needs.
export async function makeR(packages = []) {
  const webR = new WebR({ interactive: false });
  await webR.init();
  // Same split as the app's ensureRPkgs(): packages listed in R_UNIVERSE come
  // from their R-universe WebAssembly build (repo.r-wasm.org's RSQLite build
  // stopped loading on WebR 0.6.0 in Oct 2026; r-dbi's loads).
  const uni = packages.filter((p) => R_UNIVERSE[p]);
  for (const p of uni) await webR.installPackages([p], { repos: [R_UNIVERSE[p], 'https://repo.r-wasm.org/'], quiet: true });
  const rest = packages.filter((p) => !R_UNIVERSE[p]);
  if (rest.length) await webR.installPackages(rest, true);

  // Run R source and return everything the learner would see on screen: stdout
  // and stderr in order, exactly as the app's runR() collects it.
  //
  // captureConditions:false is deliberate. With it, an R error is NOT thrown as
  // a JS exception — it lands in the transcript as the "Error: ..." line R
  // itself prints, and execution stops there. That is what the learner sees in
  // a real console, so it is what a chapter may show and what the grader diffs.
  async function runRaw(code) {
    const shelter = await new webR.Shelter();
    try {
      const cap = await shelter.captureR(code, { withAutoprint: true, captureConditions: false });
      const lines = cap.output.filter((o) => o.type === 'stdout' || o.type === 'stderr');
      return {
        output: lines.map((o) => o.data).join('\n'),
        // R's own error output always begins with "Error"; that is the signal.
        errored: lines.some((o) => o.type === 'stderr' && /^Error\b/.test(o.data)),
        errorLine: (lines.find((o) => o.type === 'stderr' && /^Error\b/.test(o.data)) || {}).data || null,
      };
    } finally {
      shelter.purge();
    }
  }

  // The common case: the transcript text.
  async function run(code) { return (await runRaw(code)).output; }

  // Run code expected to fail; return the error line R printed, or null if it
  // unexpectedly succeeded.
  async function runErr(code) { return (await runRaw(code)).errorLine; }

  async function close() { try { await webR.close(); } catch (e) {} }
  return { run, runRaw, runErr, close, webR };
}

// ok/FAIL reporting with the same shape as the Python chN_verify.py scripts.
export function makeChecker(name) {
  let fails = 0;
  const check = (label, got, want) => {
    const g = String(got).replace(/\s+$/, '');
    const w = String(want).replace(/\s+$/, '');
    if (g === w) { console.log('ok   ' + label); return true; }
    fails++;
    console.log('FAIL ' + label);
    console.log('     got:  ' + JSON.stringify(g));
    console.log('     want: ' + JSON.stringify(w));
    return false;
  };
  // For claims that are true by property rather than by exact text.
  const checkTrue = (label, cond, detail = '') => {
    if (cond) { console.log('ok   ' + label); return true; }
    fails++;
    console.log('FAIL ' + label + (detail ? ' — ' + detail : ''));
    return false;
  };
  const done = () => {
    console.log('');
    console.log(fails === 0 ? `${name}: ALL PASS` : `${name}: ${fails} FAILURE(S)`);
    process.exit(fails === 0 ? 0 : 1);
  };
  return { check, checkTrue, done, fails: () => fails };
}

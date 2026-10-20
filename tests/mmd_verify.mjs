// Requires: npm install playwright-core mermaid (in tests/ or repo root), plus the
// preinstalled Chromium at /opt/pw-browsers/chromium (or set CHROMIUM to a local
// Chrome/Chromium binary). Run from tests/: cd tests && node mmd_verify.mjs. Prints real mermaid.parse
// verdicts — eyeball against LESSONS.mermaid practice entries after any edit.
import { chromium } from 'playwright-core';
import path from 'path';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto('file://' + path.resolve('mmd_verify.html'));
await page.waitForFunction(() => window.__RESULT, null, { timeout: 15000 });
console.log(JSON.stringify(await page.evaluate(() => window.__RESULT), null, 1));
await browser.close();

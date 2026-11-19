// Temporary inspection script: signs in as the secretariat, captures the
// published-content editor, changes the rate and notice, and checks the public
// page picked both up.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.SHOTS_BASE ?? 'http://localhost:5176';
const out = process.env.SHOTS_OUT ?? 'design/shots';
await fs.mkdir(out, { recursive: true });

const browser = await chromium.launch();
const problems = [];

async function signIn(page) {
  await page.goto(`${base}/signin`, { waitUntil: 'load' });
  await page.fill('#email', 'admin@coop.example');
  await page.fill('#password', 'gidandaya');
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(/\/app/, { timeout: 20000 });
}

async function watch(page, tag) {
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`${tag}: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`${tag}: ${String(error)}`));
}

// Desktop
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await watch(desktop, 'desktop');
await signIn(desktop);

await desktop.goto(`${base}/app/content`, { waitUntil: 'load' });
await desktop.waitForSelector('#content-rate');
await desktop.screenshot({ path: `${out}/content-1440.png`, fullPage: true });

await desktop.fill('#content-rate', '28500');
await desktop.fill('#content-notice', 'The 28 November site visit has moved to 5 December. Buses still leave at 10:00 am.');
await desktop.screenshot({ path: `${out}/content-dirty-1440.png`, fullPage: true });

await desktop.getByRole('button', { name: /publish changes/i }).click();
await desktop.waitForTimeout(2000);
await desktop.screenshot({ path: `${out}/content-saved-1440.png`, fullPage: true });

const savedRate = await desktop.inputValue('#content-rate');
const toast = await desktop.locator('body').innerText();
console.log('rate field after save:', savedRate);
console.log('toast noticed:', /Content published/i.test(toast));
console.log('data mode live:', /Live data/i.test(toast));

await desktop.goto(`${base}/`, { waitUntil: 'load' });
// The public page loads the published content from the backend, so give that
// request time to land before reading the text.
await desktop.waitForTimeout(1500);
let landing = await desktop.locator('body').innerText();
console.log('landing shows new rate:', landing.includes('28,500'));
console.log('landing shows notice:', landing.includes('moved to 5 December'));
await desktop.screenshot({ path: `${out}/landing-updated-1440.png`, fullPage: true });

// Put the issued figures back, so the screenshots show the real call document.
await desktop.goto(`${base}/app/content`, { waitUntil: 'load' });
await desktop.waitForSelector('#content-rate');
await desktop.fill('#content-rate', '27000');
await desktop.fill('#content-notice', '');
await desktop.getByRole('button', { name: /publish changes/i }).click();
await desktop.waitForTimeout(2000);
await desktop.goto(`${base}/`, { waitUntil: 'load' });
await desktop.waitForTimeout(1500);
landing = await desktop.locator('body').innerText();
console.log('restored rate on landing:', landing.includes('27,000'));
console.log('notice cleared:', !landing.includes('moved to 5 December'));
await desktop.screenshot({ path: `${out}/landing-restored-1440.png`, fullPage: true });

// Mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await watch(mobile, 'mobile');
await signIn(mobile);
await mobile.goto(`${base}/app/content`, { waitUntil: 'load' });
await mobile.waitForSelector('#content-rate');
await mobile.screenshot({ path: `${out}/content-390.png`, fullPage: true });

const mobileLanding = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobileLanding.goto(`${base}/`, { waitUntil: 'load' });
await mobileLanding.screenshot({ path: `${out}/landing-updated-390.png`, fullPage: true });
await mobileLanding.close();

await browser.close();

console.log('console problems:', problems.length ? problems : 'none');
if (problems.length > 0) process.exitCode = 1;

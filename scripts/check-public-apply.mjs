// One-off check: a member applies without signing in, then reopens the receipt.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const OUT = 'design/shots';
await mkdir(OUT, { recursive: true });

const ADMIN = {
  id: 'm-001',
  name: 'Aisha Bello (secretariat)',
  email: 'admin@coop.example',
  role: 'admin',
  memberNumber: 'CBN/2019/0417',
  cadre: 'Assistant Manager',
};

const browser = await chromium.launch();
const errors = [];
const problems = [];
const note = (message) => {
  problems.push(message);
  console.log('PROBLEM:', message);
};

for (const size of [
  { width: 1440, height: 900, tag: '1440' },
  { width: 390, height: 844, tag: '390' },
]) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()} @ ${page.url()}`));
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/app/apply?size=300`, { waitUntil: 'networkidle' });
  if (!page.url().includes('/apply')) note('old apply link did not redirect to the public form');
  if (page.url().includes('/signin')) note('apply redirected to sign-in');
  await page.screenshot({ path: `${OUT}/public-apply-${size.tag}.png`, fullPage: true });

  const name = `Ifeoma Nwosu ${size.tag}`;
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Member ID').fill(`CBN/2021/${size.tag}`);
  await page.getByRole('button', { name: /continue to the conditions/i }).click();
  await page.waitForSelector('text=Conditions of application');

  const boxes = page.getByRole('checkbox');
  for (let index = 0; index < (await boxes.count()); index += 1) await boxes.nth(index).check();
  await page.screenshot({ path: `${OUT}/public-apply-terms-${size.tag}.png`, fullPage: true });

  await page.getByRole('button', { name: /accept and submit application/i }).click();
  await page.waitForURL(/\/apply\/received\//, { timeout: 15000 });

  const reference = decodeURIComponent(page.url().split('/').pop() ?? '');
  const heading = await page.getByRole('heading', { level: 1 }).innerText();
  const receiptName = await page.locator('dd', { hasText: name }).first().count();
  console.log(`${size.tag}: submitted ${reference} · heading "${heading}" · name on receipt ${receiptName > 0}`);
  if (receiptName === 0) note('receipt did not show the applicant name');
  await page.screenshot({ path: `${OUT}/public-receipt-${size.tag}.png`, fullPage: true });

  await page.reload({ waitUntil: 'networkidle' });
  const keptOnReload = await page.getByRole('heading', { name: /keep this reference/i }).count();
  console.log(`${size.tag}: refresh keeps the receipt: ${keptOnReload > 0}`);
  if (keptOnReload === 0) note('receipt lost on refresh');

  // A direct link has no history state, so it must ask for the ID number.
  const fresh = await context.newPage();
  await fresh.goto(`${BASE}/apply/received/${encodeURIComponent(reference)}`, { waitUntil: 'networkidle' });
  const lookupShown = await fresh.getByRole('heading', { name: /open your application/i }).count();
  if (lookupShown === 0) note('direct link did not show the lookup form');

  await fresh.getByLabel('Member ID').fill('CBN/2021/9999');
  await fresh.getByRole('button', { name: /open application/i }).click();
  const rejected = await fresh.getByText(/no application matches that reference and id number/i).count();
  console.log(`${size.tag}: wrong ID number rejected: ${rejected > 0}`);
  if (rejected === 0) note('a wrong ID number was not rejected');

  await fresh.getByLabel('Member ID').fill(`CBN/2021/${size.tag}`);
  await fresh.getByRole('button', { name: /open application/i }).click();
  await fresh.waitForSelector(`text=${reference}`);
  console.log(`${size.tag}: receipt reopened from a direct link with reference + ID`);
  await fresh.close();

  if (size.tag === '1440') {
    // Same browser context, so the secretariat sees the same sample storage.
    const admin = await context.newPage();
    admin.on('console', (m) => m.type() === 'error' && errors.push(`${m.text()} @ ${admin.url()}`));
    await admin.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await admin.evaluate((session) => {
      window.sessionStorage.setItem('gidan-daya:user', JSON.stringify(session));
    }, ADMIN);
    await admin.goto(`${BASE}/app/members`, { waitUntil: 'networkidle' });
    const listed = await admin.getByText(name).count();
    console.log('admin register lists the account-less applicant:', listed > 0);
    if (listed === 0) note('guest application missing from the secretariat register');
    await admin.close();
  }

  await context.close();
}

await browser.close();
console.log('console errors:', errors.length === 0 ? 'none' : errors);
console.log('problems:', problems.length);

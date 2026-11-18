// Design inspection captures. Run with the dev server already listening.
//   node scripts/shots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://localhost:5173';
const OUT = 'design/shots';

const SESSION = {
  id: 'm-001',
  name: 'Aisha Bello (secretariat)',
  email: 'admin@coop.example',
  role: 'admin',
};

const ROUTES = [
  { name: 'landing', path: '/', auth: false },
  { name: 'signin', path: '/signin', auth: false },
  { name: 'overview', path: '/app', auth: true },
  { name: 'projects', path: '/app/projects', auth: true },
  { name: 'project-detail', path: '/app/projects/p-housing', auth: true },
  { name: 'subscriptions', path: '/app/subscriptions', auth: true },
  { name: 'members', path: '/app/members', auth: true },
  { name: 'reports', path: '/app/reports', auth: true },
];

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

for (const size of WIDTHS) {
  const authed = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  await authed.addInitScript((session) => {
    window.sessionStorage.setItem('gidan-daya:user', JSON.stringify(session));
  }, SESSION);

  const publicContext = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });

  for (const route of ROUTES) {
    const context = route.auth ? authed : publicContext;
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${size.width} ${route.name}: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${size.width} ${route.name} pageerror: ${error.message}`));

    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${route.name}-${size.width}.png`, fullPage: true });
    console.log(`captured ${route.name}-${size.width}.png · ${page.url()}`);
    await page.close();
  }

  await authed.close();
  await publicContext.close();
}

await browser.close();

if (errors.length > 0) {
  console.log('\nCONSOLE ERRORS:');
  for (const error of errors) console.log(` - ${error}`);
} else {
  console.log('\nNo console errors.');
}

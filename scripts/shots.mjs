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
  memberNumber: 'CBN/2019/0417',
  cadre: 'Assistant Manager',
};

const REVIEWER = {
  id: 'm-004',
  name: 'Tunde Ajayi',
  email: 'tunde.ajayi@coop.example',
  role: 'admin',
  memberNumber: 'CBN/2018/0088',
  cadre: 'Senior Manager',
};

const ROUTES = [
  { name: 'landing', path: '/', auth: false },
  { name: 'signin', path: '/signin', auth: false },
  { name: 'overview', path: '/app', auth: true },
  { name: 'plots', path: '/app/plots', auth: true },
  { name: 'apply', path: '/app/apply?size=400', auth: true },
  {
    name: 'apply-terms',
    path: '/app/apply?size=400',
    auth: true,
    action: async (page) => {
      await page.getByRole('button', { name: /continue to the conditions/i }).click();
      await page.waitForTimeout(400);
    },
  },
  { name: 'application', path: '/app/application', auth: true },
  { name: 'application-review', path: '/app/application', auth: true, session: REVIEWER },
  { name: 'members', path: '/app/members', auth: true },
  { name: 'reports', path: '/app/reports', auth: true },
  { name: 'settings', path: '/app/settings', auth: true },
];

const WIDTHS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];

for (const size of WIDTHS) {
  const authedBySession = new Map();
  const publicContext = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });

  const contextFor = async (session) => {
    if (!authedBySession.has(session.id)) {
      const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
      await context.addInitScript((value) => {
        window.sessionStorage.setItem('gidan-daya:user', JSON.stringify(value));
      }, session);
      authedBySession.set(session.id, context);
    }
    return authedBySession.get(session.id);
  };

  for (const route of ROUTES) {
    const context = route.auth ? await contextFor(route.session ?? SESSION) : publicContext;
    const page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${size.width} ${route.name}: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`${size.width} ${route.name} pageerror: ${error.message}`));

    await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' });
    if (route.action) await route.action(page);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${OUT}/${route.name}-${size.width}.png`, fullPage: true });
    console.log(`captured ${route.name}-${size.width}.png · ${page.url()}`);
    await page.close();
  }

  for (const context of authedBySession.values()) await context.close();
  await publicContext.close();
}

await browser.close();

if (errors.length > 0) {
  console.log('\nCONSOLE ERRORS:');
  for (const error of errors) console.log(` - ${error}`);
} else {
  console.log('\nNo console errors.');
}

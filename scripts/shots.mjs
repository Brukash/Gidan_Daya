// Design inspection captures. Run with the dev server already listening.
//   node scripts/shots.mjs
//
// Signed-in screens are reached by signing in through the real form, so the
// same script works in sample mode and against a Supabase backend.
//   SHOTS_EMAIL / SHOTS_PASSWORD  sign-in for the /app routes (default: the
//                                 seeded demo secretariat account)
//   SHOTS_REVIEWER_EMAIL /        optional second account for application-review
//   SHOTS_REVIEWER_PASSWORD
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.SHOTS_BASE ?? 'http://localhost:5173';
const OUT = 'design/shots';

const ADMIN = {
  email: process.env.SHOTS_EMAIL ?? 'admin@coop.example',
  password: process.env.SHOTS_PASSWORD ?? 'gidandaya',
};

const REVIEWER =
  process.env.SHOTS_REVIEWER_EMAIL && process.env.SHOTS_REVIEWER_PASSWORD
    ? { email: process.env.SHOTS_REVIEWER_EMAIL, password: process.env.SHOTS_REVIEWER_PASSWORD }
    : null;

const ROUTES = [
  { name: 'landing', path: '/', auth: false },
  { name: 'signin', path: '/signin', auth: false },
  { name: 'apply', path: '/apply?size=400', auth: false },
  {
    name: 'apply-terms',
    path: '/apply?size=400',
    auth: false,
    action: async (page) => {
      await page.getByLabel('Full name').fill('Ifeoma Nwosu');
      await page.getByLabel('Cooperative ID number').fill('CBN/2021/0311');
      await page.getByRole('button', { name: /continue to the conditions/i }).click();
      await page.waitForTimeout(400);
    },
  },
  { name: 'application-received', path: '/apply/received/GD-300-0012', auth: false },
  { name: 'overview', path: '/app', auth: true },
  { name: 'plots', path: '/app/plots', auth: true },
  { name: 'application', path: '/app/application', auth: true },
  { name: 'application-review', path: '/app/application', auth: true, reviewer: true },
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

/**
 * Signs in through the sign-in form. Sample mode keeps the session in
 * sessionStorage, which belongs to one tab, so every capture for an account
 * must happen on the page that signed in.
 */
async function signIn(page, credentials) {
  await page.goto(`${BASE}/signin`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(credentials.email);
  await page.locator('#password').fill(credentials.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  try {
    await page.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 20_000 });
  } catch {
    const alert = await page
      .getByRole('alert')
      .textContent()
      .catch(() => null);
    throw new Error(
      `Could not sign in as ${credentials.email}${alert ? `: ${alert.trim()}` : '; check the backend and credentials.'}`,
    );
  }

  await page.waitForLoadState('networkidle');
}

function watch(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`${label} pageerror: ${error.message}`));
}

async function capture(page, route, label) {
  await page.goto(`${BASE}${route.path}`, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  if (route.auth && new URL(page.url()).pathname.startsWith('/signin')) {
    throw new Error(`${label} ${route.name}: redirected to sign-in, so the capture would be the sign-in page`);
  }

  if (route.action) await route.action(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${route.name}-${label}.png`, fullPage: true });
  console.log(`captured ${route.name}-${label}.png · ${page.url()}`);
}

for (const size of WIDTHS) {
  const label = String(size.width);

  const publicContext = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const publicPage = await publicContext.newPage();
  watch(publicPage, `${label} public`);

  for (const route of ROUTES.filter((item) => !item.auth)) {
    await capture(publicPage, route, label);
  }
  await publicContext.close();

  const authedContext = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
  const authedPage = await authedContext.newPage();
  watch(authedPage, `${label} ${ADMIN.email}`);
  await signIn(authedPage, ADMIN);
  console.log(`signed in as ${ADMIN.email} at ${label}`);

  for (const route of ROUTES.filter((item) => item.auth && !item.reviewer)) {
    await capture(authedPage, route, label);
  }
  await authedContext.close();

  if (REVIEWER) {
    const reviewerContext = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
    const reviewerPage = await reviewerContext.newPage();
    watch(reviewerPage, `${label} ${REVIEWER.email}`);
    await signIn(reviewerPage, REVIEWER);
    console.log(`signed in as ${REVIEWER.email} at ${label}`);

    for (const route of ROUTES.filter((item) => item.reviewer)) {
      await capture(reviewerPage, route, label);
    }
    await reviewerContext.close();
  } else {
    console.log(`skipped application-review at ${label}: set SHOTS_REVIEWER_EMAIL and SHOTS_REVIEWER_PASSWORD to capture it`);
  }
}

await browser.close();

if (errors.length > 0) {
  console.log('\nCONSOLE ERRORS:');
  for (const error of errors) console.log(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log('\nNo console errors.');
}

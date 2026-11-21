// Reduced-motion and narrow-viewport checks for the subscription form and the
// receipt it produces. Run against a sample-mode dev server, so a submission
// writes to this browser's local rows and never to a live database.
//   VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run dev -- --port 5174
//   BASE=http://localhost:5174 node scripts/check-apply-reduced-motion.mjs
//
// Emulates `prefers-reduced-motion: reduce` through a real media override, fills
// step one, accepts the conditions, submits, then inspects the receipt page for
// motion, overflow, faded blocks and fields that never became visible.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:5174';
const OUT = 'design/shots';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const SIZES = [
  { reduced: true, width: 1440, height: 900 },
  { reduced: true, width: 390, height: 844 },
  { reduced: false, width: 390, height: 844 },
];

const snapshot = (page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth;

    const faded = [
      ...document.querySelectorAll('main section, main h1, main h2, main h3, main li, main dl > div, footer > div'),
    ]
      .map((el) => ({
        what: `${el.tagName.toLowerCase()}.${[...el.classList][0] ?? ''}`,
        opacity: Number(getComputedStyle(el).opacity),
      }))
      .filter((item) => item.opacity < 1);

    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.right > vw + 1;
      })
      .slice(0, 8)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} right=${Math.round(rect.right)}`;
      });

    const fields = [...document.querySelectorAll('main input, main select, main textarea')].map((el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        id: el.id || el.name || el.type,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible:
          rect.width > 1 &&
          rect.height > 1 &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0' &&
          style.display !== 'none',
        offscreen: rect.right > vw + 1 || rect.right <= 0,
      };
    });

    return {
      path: location.pathname,
      mediaReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
      overflow: document.documentElement.scrollWidth - vw,
      faded,
      wide,
      hiddenFields: fields.filter((field) => !field.visible || field.offscreen).map((field) => field.id),
      runningAnimations: document
        .getAnimations()
        .filter((animation) => animation.playState === 'running')
        .map((animation) => {
          const timing = animation.effect?.getComputedTiming?.() ?? {};
          return {
            kind: animation.animationName ?? animation.transitionProperty ?? 'scripted',
            iterations: timing.iterations ?? null,
            durationMs: Math.round(timing.duration ?? 0),
          };
        }),
      stepChips: [...document.querySelectorAll('[aria-label="Application steps"] li')].map((li) =>
        li.innerText.replace(/\n/g, ' '),
      ),
      actions: [...document.querySelectorAll('main button, main a.btn')].map((el) =>
        el.innerText.trim().replace(/\s+/g, ' ').slice(0, 40),
      ),
    };
  });

async function inspect({ reduced, width, height }) {
  const label = `${width}-${reduced ? 'reduced' : 'default'}`;
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });

  await page.goto(`${BASE}/apply`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('#applicantName', { timeout: 15000 });
  await page.waitForTimeout(400);

  const step1 = await snapshot(page);
  await page.screenshot({ path: `${OUT}/apply-${label}-step1.png`, fullPage: true });

  await page.fill('#applicantName', 'Test Applicant');
  await page.fill('#memberNumber', '19159');
  await page.fill('#email', 'test.applicant@example.com');
  await page.selectOption('#memberCategory', 'active');

  // Start from the foot of the page so the step change's scroll is measurable.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);

  await page.getByRole('button', { name: 'Continue to the conditions' }).click();
  await page.getByRole('heading', { name: 'Conditions of application' }).waitFor({ timeout: 15000 });
  const scrollStart = await page.evaluate(() => Math.round(scrollY));
  await page.waitForTimeout(120);
  const scrollMid = await page.evaluate(() => Math.round(scrollY));
  await page.waitForTimeout(500);
  const scrollSettled = await page.evaluate(() => Math.round(scrollY));

  const step2 = await snapshot(page);
  await page.screenshot({ path: `${OUT}/apply-${label}-step2.png`, fullPage: true });

  const boxes = page.locator('main ol input[type="checkbox"]');
  const clauseCount = await boxes.count();
  for (let index = 0; index < clauseCount; index += 1) await boxes.nth(index).check();

  await page.getByRole('button', { name: /Accept and submit application/ }).click();
  await page.waitForURL(/\/apply\/received\//, { timeout: 20000 });
  await page.waitForTimeout(800);

  const receipt = await snapshot(page);
  const receiptText = await page.evaluate(() =>
    document.body.innerText.slice(0, 500).replace(/\n+/g, ' | '),
  );
  await page.screenshot({ path: `${OUT}/apply-${label}-receipt.png`, fullPage: true });

  // The receipt also has to work when it is opened cold, with only the reference
  // in the URL: the member ID form has to be reachable and usable at 390.
  // Go via the scheme page first: a reload of the receipt URL would keep the
  // history state that carries the submitted application.
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.goto(`${BASE}${receipt.path}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Open your application' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(300);
  const receiptLookup = await snapshot(page);
  await page.fill('#lookup-member-number', '19159');
  await page.getByRole('button', { name: 'Open application' }).click();
  await page.getByRole('heading', { name: 'Keep this reference.' }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
  const receiptFound = await snapshot(page);
  await page.screenshot({ path: `${OUT}/apply-${label}-receipt-lookup.png`, fullPage: true });

  await context.close();

  return {
    label,
    step1,
    step2,
    receipt,
    receiptLookup,
    receiptFound,
    receiptText,
    clauseCount,
    scroll: {
      start: scrollStart,
      at120ms: scrollMid,
      settled: scrollSettled,
      animated: scrollMid !== scrollSettled && scrollMid !== scrollStart,
    },
    errors,
  };
}

const results = [];
for (const size of SIZES) results.push(await inspect(size));
await browser.close();

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.errors.length > 0)) process.exitCode = 1;

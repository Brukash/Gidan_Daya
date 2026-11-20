// Reduced-motion and narrow-viewport checks. Run with the dev server listening.
//   node scripts/check-reduced-motion.mjs
//
// Emulates `prefers-reduced-motion: reduce` for real (a browser media override,
// not a hand-written CSS patch), walks the page so every scroll reveal has had
// its chance, then reports what is still moving, still invisible, or wider than
// the viewport. Captures land in design/shots/.
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const OUT = 'design/shots';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const SIZES = [
  { reduced: true, width: 1440, height: 900 },
  { reduced: true, width: 390, height: 844 },
  { reduced: false, width: 390, height: 844 },
];

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

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  const read = () =>
    page.evaluate(() => {
      const probe = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          transform: style.transform,
          animation: style.animationName,
          duration: style.animationDuration,
        };
      };
      return {
        float: probe('.float-slow'),
        grid: probe('.survey-grid'),
        tick: probe('.passbook > span'),
        card: probe('.plot-card'),
        tape: Boolean(document.querySelector('.tape')),
        mediaReduce: matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    });

  const before = await read();
  await page.waitForTimeout(1400);
  const after = await read();

  // Walk the whole page the way a visitor would, so every reveal has fired,
  // then come back to the top.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 220));
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => setTimeout(resolve, 1200));
  });

  const state = await page.evaluate(() => {
    const faded = [...document.querySelectorAll('main h2, main h3, main dl > div, main ol > li, .plot-card, footer > div')]
      .map((el) => ({ what: `${el.tagName.toLowerCase()}.${[...el.classList][0] ?? ''}`, opacity: Number(getComputedStyle(el).opacity) }))
      .filter((item) => item.opacity < 1);

    const viewportWidth = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.right > viewportWidth + 1;
      })
      .slice(0, 6)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} right=${Math.round(rect.right)}`;
      });

    return {
      overflow: document.documentElement.scrollWidth - viewportWidth,
      faded,
      wide,
      headlineIntact: (document.querySelector('h1')?.textContent ?? '').includes(
        'Plots at Gidan Daya, priced by the square metre.',
      ),
      plotCtAs: [...document.querySelectorAll('.plot-card a.btn')].map((a) => a.getAttribute('href')),
      runningAnimations: document
        .getAnimations()
        .filter((animation) => animation.playState === 'running')
        .map((animation) => {
          const timing = animation.effect?.getComputedTiming?.() ?? {};
          return {
            kind: animation.animationName ?? animation.transitionProperty ?? 'scripted',
            iterations: timing.iterations ?? null,
            durationMs: Math.round(timing.duration ?? 0),
            progress: timing.progress ?? null,
          };
        }),
    };
  });

  await page.screenshot({ path: `${OUT}/rm-${label}.png` });
  await page.screenshot({ path: `${OUT}/rm-${label}-full.png`, fullPage: true });
  await context.close();

  const moved = (first, second) => Boolean(first && second) && first.transform !== second.transform;

  return {
    label,
    mediaReduce: before.mediaReduce,
    tapePresent: before.tape,
    animationName: { float: before.float?.animation, grid: before.grid?.animation, passbookTick: before.tick?.animation },
    passbookTickDuration: before.tick?.duration,
    stillMoving: { float: moved(before.float, after.float), grid: moved(before.grid, after.grid) },
    runningAnimations: state.runningAnimations,
    faded: state.faded,
    overflow: state.overflow,
    wide: state.wide,
    headlineIntact: state.headlineIntact,
    plotCtAs: state.plotCtAs,
    errors,
  };
}

const results = [];
for (const size of SIZES) results.push(await inspect(size));
await browser.close();

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.errors.length > 0)) process.exitCode = 1;

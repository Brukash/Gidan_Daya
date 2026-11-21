import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'motion/react';
import { SchemeWindow } from '../components/SchemeWindow';
import { DataModeBadge, Passbook, TierPill } from '../components/ui';
import { useQuery } from '@tanstack/react-query';
import { listTiers } from '../data/repository';
import { SAMPLE_TIERS } from '../data/seed';
import { useScheme } from '../data/scheme';
import type { Scheme } from '../data/types';
import { allocationPercent, describeTier, schemeTotals } from '../lib/allocations';
import { formatDate, formatNaira, formatSqm } from '../lib/format';
import { dataMode } from '../lib/supabase';
import {
  EASE_EXPO,
  EASE_OUT,
  Reveal,
  fadeUp,
  loadIn,
  staggerContainer,
  useScrolled,
} from '../components/motion';

function paymentSteps(scheme: Scheme) {
  return [
    {
      number: '01',
      title: 'Start your subscription',
      body: `Complete the subscription and pay the ${formatNaira(scheme.applicationFee)} non-refundable fee by transfer, with your ID number and name in the narration. Applications close ${formatDate(scheme.closesOn)}.`,
    },
    {
      number: '02',
      title: `Pay 50% by ${formatDate(scheme.depositDueOn)}`,
      body: 'Half of the value of your plot secures your position, worked out on the size measured after survey. Allocation is first-come, first-served, determined by payment confirmation.',
    },
    {
      number: '03',
      title: `Clear the balance by ${formatDate(scheme.balanceDueOn)}`,
      body: `The remaining half falls due on ${formatDate(scheme.balanceDueOn)}. Temporary allocation letters are issued after full payment.`,
    },
  ];
}

const stepNumber: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT, delay: 0.12 } },
};

const drawLine: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 0.8, ease: EASE_OUT } },
};

/** The secretariat's notice, shown only while it has something to say. */
function NoticeBar() {
  const { scheme } = useScheme();
  if (!scheme.notice) return null;

  return (
    <div className="border-b border-gold/30 bg-gold-tint/70">
      <div className="mx-auto flex max-w-[1180px] items-start gap-2.5 px-5 py-2.5 text-sm text-[#6f4d12]">
        <span aria-hidden className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
        <p>{scheme.notice}</p>
      </div>
    </div>
  );
}

const TERMS = [
  {
    title: 'Allocation follows payment confirmation',
    body: 'Plots are allocated first-come, first-served. The cooperative gives priority to members in the lower grades — Assistant Manager through Drivers.',
  },
  {
    title: 'Sizes may be adjusted after survey',
    body: 'Variations are reconciled: extra square metres are payable by the subscriber, and payments in excess of the allotted size are refunded unconditionally.',
  },
] as const;

function SiteHeader() {
  const { scrolled, sentinelRef } = useScrolled();

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-px" />
      <header
        className="site-header sticky top-0 z-40 border-b border-line backdrop-blur-sm"
        data-scrolled={scrolled ? 'true' : 'false'}
      >
      <motion.div
        className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-3"
        initial="hidden"
        animate="show"
        variants={staggerContainer(0.06, 0.08)}
      >
        <motion.div variants={fadeUp} className="min-w-0">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/brand/coop-seal-64.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0"
            />
            <span className="hidden text-[0.625rem] uppercase leading-[1.3] tracking-[0.1em] text-ink-soft sm:block">
              CBN Staff Multipurpose Cooperative Society
            </span>
          </Link>
        </motion.div>

        <motion.nav
          aria-label="Sections"
          className="hidden items-center gap-6 text-sm text-ink-soft lg:flex"
          variants={staggerContainer(0.06)}
        >
          <motion.a variants={fadeUp} href="#plots" className="nav-link transition-colors hover:text-ink">
            Plot sizes
          </motion.a>
          <motion.a variants={fadeUp} href="#payment" className="nav-link transition-colors hover:text-ink">
            Payment plan
          </motion.a>
          <motion.a variants={fadeUp} href="#visits" className="nav-link transition-colors hover:text-ink">
            Site visits
          </motion.a>
          <motion.a variants={fadeUp} href="#terms" className="nav-link transition-colors hover:text-ink">
            Terms
          </motion.a>
        </motion.nav>

        <motion.div variants={fadeUp} className="flex shrink-0 items-center gap-1.5">
          <Link to="/signin" className="btn btn-quiet hidden text-sm sm:inline-flex">
            Sign in
          </Link>
          <Link to="/apply" className="btn btn-primary whitespace-nowrap text-sm">
            Start subscription
          </Link>
        </motion.div>
      </motion.div>
      </header>
    </>
  );
}

/** One headline line, revealed upward from behind a clip. */
function MaskLine({ children, delay, className = '' }: { children: ReactNode; delay: number; className?: string }) {
  return (
    <span
      aria-hidden
      className="block overflow-hidden pt-[0.06em] -mt-[0.06em] pb-[0.18em] -mb-[0.18em]"
    >
      <motion.span
        className={`block ${className}`}
        initial={{ y: '118%' }}
        animate={{ y: '0%' }}
        transition={{ duration: 0.95, ease: EASE_EXPO, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Hero() {
  const { scheme } = useScheme();
  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers, placeholderData: SAMPLE_TIERS });
  const totals = schemeTotals(tiersQuery.data ?? SAMPLE_TIERS, scheme);

  return (
    <section className="relative isolate overflow-x-clip border-b border-line">
      {/* A survey grid, drifting one cell at a time so the loop has no seam. */}
      <div aria-hidden className="survey-grid pointer-events-none absolute inset-0 -z-10" />
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 pt-12 pb-14 lg:grid-cols-[1.02fr_1fr] lg:items-start lg:gap-14 lg:pt-16 lg:pb-20">
        <div className="lg:border-l lg:border-line lg:pl-8">
          <motion.p className="eyebrow" {...loadIn(0.06, 8)}>
            CBN Staff Multipurpose Cooperative Society Estate
          </motion.p>
          <h1 className="mt-4 text-[2.45rem] leading-[0.98] sm:text-[3.1rem] lg:text-[3.55rem]">
            <span className="sr-only">Plots at Gidan Daya, priced by the square metre.</span>
            <MaskLine delay={0.14}>Plots at Gidan Daya,</MaskLine>
            <MaskLine delay={0.24} className="text-forest">
              priced by the square metre.
            </MaskLine>
          </h1>
          <motion.p
            className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-soft"
            {...loadIn(0.34, 10)}
          >
            Residential plots at Gidan Daya, near Loyola Jesuit College, FCT Abuja — {totals.plots} plots from 200 to
            500 sqm at {formatNaira(scheme.pricePerSqm)} per sqm, infrastructure inclusive. Choose a 4-bedroom
            semi-detached or detached duplex and pay in two instalments.
          </motion.p>

          <motion.ul
            className="mt-9 max-w-md border-t border-line text-sm"
            initial="hidden"
            animate="show"
            variants={staggerContainer(0.07, 0.44)}
          >
            {[
              `${totals.plots} plots: 200, 300, 400 and 500 sqm`,
              `${formatNaira(scheme.pricePerSqm)} per sqm, inclusive of infrastructure`,
              `Applications close ${formatDate(scheme.closesOn)}`,
            ].map((item) => (
              <motion.li
                key={item}
                variants={fadeUp}
                className="flex items-start gap-2.5 border-b border-line py-2.5 text-ink-soft"
              >
                <svg aria-hidden viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-forest" fill="none">
                  <path d="M2.5 8.5 6 12l7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <motion.div {...loadIn(0.62, 8)}>
              <Link to="/apply" className="btn btn-primary">
                Start subscription
              </Link>
            </motion.div>
            <motion.div {...loadIn(0.68, 8)}>
              <a href="#plots" className="btn btn-ghost">
                See plot sizes
              </a>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 26, y: 8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.85, ease: EASE_OUT, delay: 0.3 }}
        >
          <div className="float-slow">
            <SchemeWindow />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            A working replica of the plot screen. Switch sizes on the left; availability figures are sample data.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * The register's tally: how subscriptions sit against the plots on offer, by
 * size and in total. A roll-up of the same allocation figures, so it cannot
 * claim anything the plot data does not already hold.
 */
function SubscriptionsBanner() {
  const { scheme } = useScheme();
  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers, placeholderData: SAMPLE_TIERS });
  const tiers = tiersQuery.data ?? SAMPLE_TIERS;
  const totals = schemeTotals(tiers, scheme);

  return (
    <section aria-label="Subscriptions so far" className="border-b border-forest-2 bg-forest text-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-gold">
            Subscriptions so far
            {dataMode === 'sample' ? ' · sample data' : ''}
          </p>
          <p className="num mt-1.5 flex items-baseline gap-2 font-display text-[1.7rem] leading-none text-paper">
            {totals.allocated}
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-paper/60">
              {totals.allocated === 1 ? 'plot taken' : 'plots taken'}
            </span>
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-7 gap-y-3 sm:justify-end">
          {tiers.map((tier) => (
            <li key={tier.id} className="border-l border-paper/20 pl-3 first:border-l-0 first:pl-0 sm:border-l">
              <p className="text-[0.625rem] uppercase tracking-[0.09em] text-paper/55">{formatSqm(tier.sizeSqm)}</p>
              <p className="num mt-0.5 text-sm font-semibold text-paper">{tier.allocated}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function PlotPrices() {
  const { scheme } = useScheme();
  const tiersQuery = useQuery({ queryKey: ['tiers'], queryFn: listTiers, placeholderData: SAMPLE_TIERS });
  const rows = (tiersQuery.data ?? SAMPLE_TIERS).map((tier) => ({
    tier,
    status: describeTier(tier, scheme.closesOn),
  }));

  return (
    <section id="plots" className="border-b border-line">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <Reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Plot sizes and allocation</p>
            <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">Four sizes, one rate per square metre.</h2>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              {formatNaira(scheme.pricePerSqm)} per sqm covers the plot and infrastructure. Plot sizes are indicative:
              the price is the size measured after survey multiplied by this rate, and the deposit is half of that
              value, due {formatDate(scheme.depositDueOn)}.
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <DataModeBadge mode={dataMode} />
          </div>
        </Reveal>

        <Reveal delay={0.05} amount={0.1} className="mt-8 hidden md:block">
          <div className="overflow-hidden rounded-sm border border-line bg-paper-2">
            <table className="ledger">
              <caption className="sr-only">Plot sizes and availability</caption>
              <thead>
                <tr>
                  <th scope="col">Plot size</th>
                  <th scope="col">Plots</th>
                  <th scope="col" className="w-[22%]">
                    Allocated
                  </th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ tier, status }) => (
                  <tr key={tier.id}>
                    <td>
                      <Link to={`/apply?size=${tier.sizeSqm}`} className="font-medium hover:underline">
                        {formatSqm(tier.sizeSqm)}
                      </Link>
                    </td>
                    <td className="num text-ink-soft">{tier.totalPlots}</td>
                    <td className="min-w-[9rem]">
                      <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                      <span className="num mt-1 block text-xs text-ink-soft">
                        {allocationPercent(tier.allocated, tier.totalPlots)}% taken
                      </span>
                    </td>
                    <td>
                      <TierPill status={status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>

        <motion.ul
          className="mt-6 grid gap-3 md:hidden"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={staggerContainer(0.07)}
        >
          {rows.map(({ tier, status }) => (
            <motion.li key={tier.id} variants={fadeUp} className="card-raised p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[1.2rem] leading-none">{formatSqm(tier.sizeSqm)}</p>
                </div>
                <TierPill status={status} />
              </div>
              <div className="mt-3">
                <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                <p className="num mt-1.5 text-xs text-ink-soft">
                  {formatNaira(scheme.pricePerSqm)} per sqm
                </p>
              </div>
              <Link to={`/apply?size=${tier.sizeSqm}`} className="btn btn-ghost mt-3 w-full text-sm">
                Start subscription
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <Reveal>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-soft">
            Advertised plot sizes are indicative. The plot allocated is measured after survey, and the final price is
            that measured size multiplied by {formatNaira(scheme.pricePerSqm)} per sqm. A plot advertised as 200 sqm may
            measure 212 sqm; the extra 12 sqm is payable at the same rate.
            {dataMode === 'sample' ? ' Availability shown on this page is sample data.' : ''}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function PaymentPlan() {
  const { scheme } = useScheme();
  const steps = paymentSteps(scheme);

  return (
    <section id="payment" className="border-b border-line bg-paper-3/55">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Payment plan</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">Two instalments, with the fee up front.</h2>
        </Reveal>

        <motion.ol
          className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer(0.14, 0.04)}
        >
          {steps.map((step) => (
            <motion.li key={step.number} variants={fadeUp} className="relative pt-4">
              <motion.span
                aria-hidden
                variants={drawLine}
                className="absolute inset-x-0 top-0 h-px origin-left bg-forest/25"
              />
              <motion.span variants={stepNumber} className="num block font-display text-[2.1rem] leading-none text-clay">
                {step.number}
              </motion.span>
              <h3 className="mt-3 text-[1.15rem]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </motion.li>
          ))}
        </motion.ol>

        <Reveal className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-3" amount={0.15}>
          <p className="text-sm text-ink-soft">
            <span className="block text-[0.625rem] uppercase tracking-[0.09em]">Application fee</span>
            <span className="num mt-1 block font-display text-lg text-forest">{formatNaira(scheme.applicationFee)}</span>
            non-refundable
          </p>
          <p className="text-sm text-ink-soft">
            <span className="block text-[0.625rem] uppercase tracking-[0.09em]">50% deposit due</span>
            <span className="mt-1 block font-display text-lg text-forest">{formatDate(scheme.depositDueOn)}</span>
            by bank transfer only
          </p>
          <p className="text-sm text-ink-soft">
            <span className="block text-[0.625rem] uppercase tracking-[0.09em]">Balance due</span>
            <span className="mt-1 block font-display text-lg text-forest">{formatDate(scheme.balanceDueOn)}</span>
            temporary allocation follows full payment
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function SiteVisits() {
  const { siteVisit } = useScheme();

  return (
    <section id="visits" className="border-b border-line">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-18">
        <Reveal>
          <p className="eyebrow">Site visits</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">See the land before you commit.</h2>
          <p className="mt-3 max-w-[48ch] text-[0.9375rem] text-ink-soft">
            The cooperative has arranged inspections so subscribers can judge the site for themselves. Buses leave at{' '}
            {siteVisit.time} on both dates.
          </p>

          <motion.ul
            className="mt-6 border-t border-line"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={staggerContainer(0.08)}
          >
            {siteVisit.dates.map((date) => (
              <motion.li
                key={date}
                variants={fadeUp}
                className="flex items-baseline justify-between gap-4 border-b border-line py-3"
              >
                <span className="font-display text-lg">
                  {new Date(date).toLocaleDateString('en-NG', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <span className="num text-sm text-ink-soft">{siteVisit.time}</span>
              </motion.li>
            ))}
          </motion.ul>
        </Reveal>

        <Reveal delay={0.1} className="card-raised self-start p-5" amount={0.2}>
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Meeting point</p>
          <p className="mt-2 max-w-[40ch] font-display text-[1.2rem] leading-snug">{siteVisit.meetingPoint}</p>
          <div className="mt-4 flex gap-2 border-t border-line pt-4 text-xs text-ink-soft">
            <motion.svg
              aria-hidden
              viewBox="0 0 24 24"
              className="mt-0.5 h-4 w-4 shrink-0 text-forest"
              fill="none"
              initial={{ opacity: 0, y: -3 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.25 }}
            >
              <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            </motion.svg>
            <p>
              The estate is at Gidan Daya, near Loyola Jesuit College, FCT Abuja. Inspection is on site; travel to the
              meeting point is arranged by the cooperative.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Terms() {
  return (
    <section id="terms" className="border-b border-line bg-paper-3/40">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">Read before you pay</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">The conditions that come with a plot.</h2>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            These are the cooperative's terms, summarised. The full terms in the call for indication of interest govern.
          </p>
        </Reveal>

        <motion.dl
          className="mt-8 grid gap-x-10 gap-y-0 sm:grid-cols-2"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={staggerContainer(0.1)}
        >
          {TERMS.map((term) => (
            <motion.div key={term.title} variants={fadeUp} className="border-t border-line py-4">
              <dt className="text-[0.9375rem] font-semibold text-forest">{term.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{term.body}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}

function ClosingCta() {
  const { scheme } = useScheme();

  return (
    <section className="bg-forest text-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-14 sm:flex-row sm:items-end sm:justify-between lg:py-16">
        <Reveal className="max-w-xl" amount={0.25}>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold">
            Applications close {formatDate(scheme.closesOn)}
          </p>
          <h2 className="mt-3 text-[1.9rem] leading-tight text-paper sm:text-[2.4rem]">
            Choose a size, then secure your position.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-paper/75">
            No account needed: pick a size, acknowledge the conditions and submit. Sign in afterwards if you
            want to attach payment evidence and follow the balance. If this deployment is not yet connected to Supabase,
            it runs on sample data so you can walk the full flow.
          </p>
        </Reveal>
        <motion.div
          className="flex flex-wrap gap-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={staggerContainer(0.08, 0.1)}
        >
          <motion.div variants={fadeUp}>
            <Link to="/apply" className="btn btn-primary">
              Start subscription
            </Link>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Link to="/signin" className="btn btn-quiet text-paper" style={{ borderColor: 'rgba(247,243,234,0.32)', borderWidth: 1 }}>
              Sign in
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <motion.div
        className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:grid-cols-[1.4fr_1fr_1fr]"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer(0.09)}
      >
        <motion.div variants={fadeUp}>
          <img
            src="/brand/coop-seal-64.png"
            alt="The seal of the CBN Staff Multipurpose Cooperative Society"
            width={36}
            height={36}
            className="h-9 w-9"
          />
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            Residential plots at the CBN Staff Multipurpose Cooperative Society Estate, Gidan Daya, FCT Abuja.
          </p>
        </motion.div>
        <motion.nav aria-label="Scheme" className="text-sm" variants={fadeUp}>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Scheme</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <a href="#plots" className="nav-link inline-block">
                Plot sizes
              </a>
            </li>
            <li>
              <a href="#payment" className="nav-link inline-block">
                Payment plan
              </a>
            </li>
            <li>
              <a href="#visits" className="nav-link inline-block">
                Site visits
              </a>
            </li>
            <li>
              <a href="#terms" className="nav-link inline-block">
                Terms
              </a>
            </li>
          </ul>
        </motion.nav>
        <motion.nav aria-label="Applicants" className="text-sm" variants={fadeUp}>
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Applicants</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link to="/signin" className="nav-link inline-block">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/app/application" className="nav-link inline-block">
                My application
              </Link>
            </li>
            <li>
              <Link to="/app/plots" className="nav-link inline-block">
                Plot availability
              </Link>
            </li>
          </ul>
        </motion.nav>
      </motion.div>
      <div className="border-t border-line">
        <Reveal className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-4 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between" distance={8}>
          <p>© {new Date().getFullYear()} Gidan Daya · CBN Staff Multipurpose Cooperative Society</p>
          <p>Availability figures are sample data unless this deployment is connected to Supabase.</p>
        </Reveal>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <NoticeBar />
        <Hero />
        <SubscriptionsBanner />
        <PlotPrices />
        <PaymentPlan />
        <SiteVisits />
        <Terms />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

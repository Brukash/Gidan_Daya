import { Link } from 'react-router-dom';
import { SchemeWindow } from '../components/SchemeWindow';
import { DataModeBadge, Passbook, TierPill } from '../components/ui';
import { SAMPLE_TIERS, SCHEME, SITE_VISIT } from '../data/seed';
import {
  allocationPercent,
  depositFor,
  describeTier,
  priceForPlot,
  remainingPlots,
  schemeTotals,
} from '../lib/allocations';
import { formatCompactNaira, formatDate, formatNaira, formatSqm } from '../lib/format';
import { dataMode } from '../lib/supabase';

const PAYMENT_STEPS = [
  {
    number: '01',
    title: 'Apply and pay the fee',
    body: 'Complete the application and pay the ₦20,000 non-refundable fee by transfer, with your ID number and name in the narration. Applications close 30 December 2026.',
  },
  {
    number: '02',
    title: 'Pay 50% by 30 January 2027',
    body: 'Half of the plot price secures your position. Allocation is first-come, first-served, determined by payment confirmation.',
  },
  {
    number: '03',
    title: 'Clear the balance by 30 June 2027',
    body: 'The remaining half falls due on 30 June 2027. Temporary allocation letters are issued after full payment.',
  },
] as const;

const TERMS = [
  {
    title: 'Allocation follows payment confirmation',
    body: 'Plots are allocated first-come, first-served. The cooperative gives priority to members in the lower cadre — Clerk through Assistant Manager.',
  },
  {
    title: 'Sizes may be adjusted after survey',
    body: 'Variations are reconciled: extra square metres are payable by the subscriber, and payments in excess of the allotted size are refunded unconditionally.',
  },
  {
    title: 'Refunds are conditional',
    body: 'Refunds need a written request and happen only after the plot is resold, with penalties and administrative charges of up to 5%. Infrastructure funds already applied to site works are non-refundable, and resale can take months.',
  },
  {
    title: 'Title perfection is at your cost',
    body: 'Temporary allocation follows full payment; the permanent letter follows completion of the building. File opening, survey, ground rent, stamp duty, registration, consent and FCTA charges are borne by the subscriber.',
  },
  {
    title: 'Default has consequences',
    body: 'Missing a scheduled payment attracts administrative charges and interest at the prevailing project loan rate, and the plot may be reallocated without further notice.',
  },
  {
    title: 'The cooperative may vary the project',
    body: 'Layout, house types, plot sizes, infrastructure rates and timelines may change to meet regulatory or planning requirements. Subscribers waive claims for damages arising from such variations.',
  },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img
            src="/brand/coop-seal-64.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
          />
          <span className="flex flex-col leading-none">
            <span className="whitespace-nowrap font-display text-[1.15rem] leading-none tracking-[-0.03em]">
              Gidan Daya
            </span>
            <span className="mt-1 hidden text-[0.625rem] uppercase leading-none tracking-[0.1em] text-ink-soft sm:block">
              CBN Staff Multipurpose Cooperative Society
            </span>
          </span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-6 text-sm text-ink-soft lg:flex">
          <a href="#plots" className="transition-colors hover:text-ink">
            Plot sizes
          </a>
          <a href="#payment" className="transition-colors hover:text-ink">
            Payment plan
          </a>
          <a href="#visits" className="transition-colors hover:text-ink">
            Site visits
          </a>
          <a href="#terms" className="transition-colors hover:text-ink">
            Terms
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link to="/signin" className="btn btn-quiet hidden text-sm sm:inline-flex">
            Sign in
          </Link>
          <Link to="/apply" className="btn btn-primary whitespace-nowrap text-sm">
            Apply for a plot
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const totals = schemeTotals(SAMPLE_TIERS, SCHEME);

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 pt-12 pb-14 lg:grid-cols-[1.02fr_1fr] lg:items-start lg:gap-14 lg:pt-16 lg:pb-20">
        <div className="rise lg:border-l lg:border-line lg:pl-8">
          <p className="eyebrow">CBN Staff Multipurpose Cooperative Society Estate</p>
          <h1 className="mt-4 text-[2.45rem] leading-[0.98] sm:text-[3.1rem] lg:text-[3.55rem]">
            Plots at Gidan Daya,
            <br />
            <span className="text-forest">priced by the square metre.</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            Residential plots at Gidan Daya, near Loyola Jesuit College, FCT Abuja — {totals.plots} plots from 200 to
            500 sqm at {formatNaira(SCHEME.pricePerSqm)} per sqm, infrastructure inclusive. Choose a 4-bedroom
            semi-detached or detached duplex and pay in two instalments.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/apply" className="btn btn-primary">
              Start an application
            </Link>
            <a href="#plots" className="btn btn-ghost">
              See plot prices
            </a>
          </div>

          <ul className="mt-9 max-w-md border-t border-line text-sm">
            {[
              `${totals.plots} plots: 200, 300, 400 and 500 sqm`,
              `${formatNaira(SCHEME.pricePerSqm)} per sqm, inclusive of infrastructure`,
              'Applications close 30 December 2026',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 border-b border-line py-2.5 text-ink-soft">
                <svg aria-hidden viewBox="0 0 16 16" className="mt-1 h-3.5 w-3.5 shrink-0 text-forest" fill="none">
                  <path d="M2.5 8.5 6 12l7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rise" style={{ animationDelay: '120ms' }}>
          <SchemeWindow />
          <p className="mt-3 text-xs text-ink-soft">
            A working replica of the plot screen. Switch sizes on the left; availability figures are sample data.
          </p>
        </div>
      </div>
    </section>
  );
}

function PlotPrices() {
  const rows = SAMPLE_TIERS.map((tier) => ({
    tier,
    status: describeTier(tier, SCHEME.closesOn),
    price: priceForPlot(tier.sizeSqm, SCHEME.pricePerSqm),
  }));

  return (
    <section id="plots" className="border-b border-line">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">Plot sizes and allocation</p>
            <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">Four sizes, one rate per square metre.</h2>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              {formatNaira(SCHEME.pricePerSqm)} per sqm covers the plot and infrastructure. The deposit is half of the
              plot price, due 30 January 2027.
            </p>
          </div>
          <div className="self-start sm:self-auto">
            <DataModeBadge mode={dataMode} />
          </div>
        </div>

        <div className="mt-8 hidden overflow-hidden rounded-sm border border-line bg-paper-2 md:block">
          <table className="ledger">
            <caption className="sr-only">Plot sizes, prices and availability</caption>
            <thead>
              <tr>
                <th scope="col">Plot size</th>
                <th scope="col">Plots</th>
                <th scope="col">Remaining</th>
                <th scope="col" className="w-[22%]">
                  Allocated
                </th>
                <th scope="col">Plot price</th>
                <th scope="col">50% deposit</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tier, status, price }) => (
                <tr key={tier.id}>
                  <td>
                    <Link to={`/apply?size=${tier.sizeSqm}`} className="font-medium hover:underline">
                      {formatSqm(tier.sizeSqm)}
                    </Link>
                  </td>
                  <td className="num text-ink-soft">{tier.totalPlots}</td>
                  <td className="num text-ink-soft">{remainingPlots(tier)}</td>
                  <td className="min-w-[9rem]">
                    <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                    <span className="num mt-1 block text-xs text-ink-soft">
                      {allocationPercent(tier.allocated, tier.totalPlots)}% taken
                    </span>
                  </td>
                  <td className="num whitespace-nowrap">{formatNaira(price)}</td>
                  <td className="num whitespace-nowrap text-ink-soft">{formatNaira(depositFor(price))}</td>
                  <td>
                    <TierPill status={status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-6 grid gap-3 md:hidden">
          {rows.map(({ tier, status, price }) => (
            <li key={tier.id} className="card-raised p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[1.2rem] leading-none">{formatSqm(tier.sizeSqm)}</p>
                  <p className="num mt-1 text-xs text-ink-soft">
                    {remainingPlots(tier)} of {tier.totalPlots} plots left
                  </p>
                </div>
                <TierPill status={status} />
              </div>
              <div className="mt-3">
                <Passbook allocated={tier.allocated} totalPlots={tier.totalPlots} />
                <p className="num mt-1.5 text-xs text-ink-soft">
                  {formatNaira(price)} · deposit {formatCompactNaira(depositFor(price))}
                </p>
              </div>
              <Link to={`/apply?size=${tier.sizeSqm}`} className="btn btn-ghost mt-3 w-full text-sm">
                Apply for {formatSqm(tier.sizeSqm)}
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ink-soft">
          Plot sizes are subject to the size allocated after survey; additional square metres are payable by the
          subscriber. Availability shown on this page is sample data.
        </p>
      </div>
    </section>
  );
}

function PaymentPlan() {
  return (
    <section id="payment" className="border-b border-line bg-paper-3/55">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <div className="max-w-2xl">
          <p className="eyebrow">Payment plan</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">Two instalments, with the fee up front.</h2>
        </div>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {PAYMENT_STEPS.map((step) => (
            <li key={step.number} className="border-t border-forest/25 pt-4">
              <span className="num font-display text-[2.1rem] leading-none text-clay">{step.number}</span>
              <h3 className="mt-3 text-[1.15rem]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 grid gap-3 border-t border-line pt-6 sm:grid-cols-3">
          <p className="text-sm text-ink-soft">
            <span className="block text-[0.625rem] uppercase tracking-[0.09em]">Application fee</span>
            <span className="num mt-1 block font-display text-lg text-forest">{formatNaira(SCHEME.applicationFee)}</span>
            non-refundable
          </p>
          <p className="text-sm text-ink-soft">
            <span className="block text-[0.625rem] uppercase tracking-[0.09em]">50% deposit due</span>
            <span className="mt-1 block font-display text-lg text-forest">{formatDate(SCHEME.depositDueOn)}</span>
            by bank transfer only
          </p>
          <p className="text-sm text-ink-soft">
            <span className="block text-[0.625rem] uppercase tracking-[0.09em]">Balance due</span>
            <span className="mt-1 block font-display text-lg text-forest">{formatDate(SCHEME.balanceDueOn)}</span>
            temporary allocation follows full payment
          </p>
        </div>
      </div>
    </section>
  );
}

function SiteVisits() {
  return (
    <section id="visits" className="border-b border-line">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-18">
        <div>
          <p className="eyebrow">Site visits</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">See the land before you commit.</h2>
          <p className="mt-3 max-w-[48ch] text-[0.9375rem] text-ink-soft">
            The cooperative has arranged inspections so subscribers can judge the site for themselves. Buses leave at{' '}
            {SITE_VISIT.time} on both dates.
          </p>

          <ul className="mt-6 border-t border-line">
            {SITE_VISIT.dates.map((date) => (
              <li key={date} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                <span className="font-display text-lg">
                  {new Date(date).toLocaleDateString('en-NG', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <span className="num text-sm text-ink-soft">{SITE_VISIT.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-raised self-start p-5">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Meeting point</p>
          <p className="mt-2 max-w-[40ch] font-display text-[1.2rem] leading-snug">{SITE_VISIT.meetingPoint}</p>
          <div className="mt-4 flex gap-2 border-t border-line pt-4 text-xs text-ink-soft">
            <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-forest" fill="none">
              <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p>
              The estate is at Gidan Daya, near Loyola Jesuit College, FCT Abuja. Inspection is on site; travel to the
              meeting point is arranged by the cooperative.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Terms() {
  return (
    <section id="terms" className="border-b border-line bg-paper-3/40">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <div className="max-w-2xl">
          <p className="eyebrow">Read before you pay</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">The conditions that come with a plot.</h2>
          <p className="mt-3 text-[0.9375rem] text-ink-soft">
            These are the cooperative's terms, summarised. The full terms in the call for indication of interest govern.
          </p>
        </div>

        <dl className="mt-8 grid gap-x-10 gap-y-0 sm:grid-cols-2">
          {TERMS.map((term) => (
            <div key={term.title} className="border-t border-line py-4">
              <dt className="text-[0.9375rem] font-semibold text-forest">{term.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-soft">{term.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="bg-forest text-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-14 sm:flex-row sm:items-end sm:justify-between lg:py-16">
        <div className="max-w-xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold">
            Applications close {formatDate(SCHEME.closesOn)}
          </p>
          <h2 className="mt-3 text-[1.9rem] leading-tight text-paper sm:text-[2.4rem]">
            Choose a size, then secure your position.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-paper/75">
            No account needed to apply: pick a size, acknowledge the conditions and submit. Sign in afterwards if you
            want to attach payment evidence and follow the balance. If this deployment is not yet connected to Supabase,
            it runs on sample data so you can walk the full flow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/apply" className="btn btn-primary">
            Apply for a plot
          </Link>
          <Link to="/signin" className="btn btn-quiet text-paper" style={{ borderColor: 'rgba(247,243,234,0.32)', borderWidth: 1 }}>
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/coop-seal-64.png"
              alt="The seal of the CBN Staff Multipurpose Cooperative Society"
              width={36}
              height={36}
              className="h-9 w-9"
            />
            <p className="font-display text-lg leading-none">Gidan Daya</p>
          </div>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            Residential plots at the CBN Staff Multipurpose Cooperative Society Estate, Gidan Daya, FCT Abuja.
          </p>
        </div>
        <nav aria-label="Scheme" className="text-sm">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Scheme</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <a href="#plots" className="hover:underline">
                Plot sizes
              </a>
            </li>
            <li>
              <a href="#payment" className="hover:underline">
                Payment plan
              </a>
            </li>
            <li>
              <a href="#visits" className="hover:underline">
                Site visits
              </a>
            </li>
            <li>
              <a href="#terms" className="hover:underline">
                Terms
              </a>
            </li>
          </ul>
        </nav>
        <nav aria-label="Applicants" className="text-sm">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Applicants</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link to="/signin" className="hover:underline">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/app/application" className="hover:underline">
                My application
              </Link>
            </li>
            <li>
              <Link to="/app/plots" className="hover:underline">
                Plot availability
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-4 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Gidan Daya · CBN Staff Multipurpose Cooperative Society</p>
          <p>Availability figures are sample data unless this deployment is connected to Supabase.</p>
        </div>
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
        <Hero />
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

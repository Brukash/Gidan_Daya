import { Link } from 'react-router-dom';
import { ProductWindow } from '../components/ProductWindow';
import { DataModeBadge, Passbook, ProjectPill } from '../components/ui';
import { SAMPLE_CYCLE, SAMPLE_PROJECTS, SAMPLE_SUBSCRIPTIONS } from '../data/seed';
import { describeProject, fundingPercent, remainingUnits, sumBy } from '../lib/funding';
import { formatCompactNaira, formatDate, formatNaira } from '../lib/format';
import { dataMode } from '../lib/supabase';

const STEPS = [
  {
    number: '01',
    title: 'Read the project',
    body: 'Each open project lists its unit price, the units available and the day subscriptions close. Nothing is hidden behind a request form.',
  },
  {
    number: '02',
    title: 'Subscribe for units',
    body: 'Choose how many units you are taking. The amount is calculated against the unit price before you confirm, and capacity is checked again on submit.',
  },
  {
    number: '03',
    title: 'Follow the balance',
    body: 'Your commitments, what you have paid and the next installment sit on one page, with a statement you can download.',
  },
] as const;

const SECRETARIAT = [
  { title: 'Open and price a project', body: 'Set the unit price, total units and closing date. Funding progress updates as subscriptions land.' },
  { title: 'Keep the member register', body: 'Every commitment is tied to a member record, so the register and the ledger cannot disagree.' },
  { title: 'Watch the cycle', body: 'See committed, collected and outstanding totals for the cycle without rebuilding a spreadsheet.' },
  { title: 'Close the books', body: 'Export the register as PDF or the full cycle as an Excel workbook for the committee pack.' },
] as const;

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <svg aria-hidden viewBox="0 0 32 32" className="h-7 w-7">
            <rect width="32" height="32" rx="7" fill="#123628" />
            <path d="M8 9h10.5a4.5 4.5 0 0 1 0 9H8" stroke="#F7F3EA" strokeWidth="2.4" fill="none" strokeLinecap="square" />
            <path d="M8 18h11" stroke="#B8862B" strokeWidth="2.4" strokeLinecap="square" />
          </svg>
          <span className="whitespace-nowrap font-display text-[1.15rem] leading-none tracking-[-0.03em]">
            Gidan Daya
          </span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-6 text-sm text-ink-soft lg:flex">
          <a href="#projects" className="transition-colors hover:text-ink">
            This cycle
          </a>
          <a href="#how" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#secretariat" className="transition-colors hover:text-ink">
            For the secretariat
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link to="/signin" className="btn btn-quiet hidden text-sm sm:inline-flex">
            Sign in
          </Link>
          <Link to="/app" className="btn btn-primary whitespace-nowrap text-sm">
            Open dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 pt-12 pb-14 lg:grid-cols-[1.02fr_1fr] lg:items-start lg:gap-14 lg:pt-16 lg:pb-20">
        <div className="rise lg:border-l lg:border-line lg:pl-8">
          <p className="eyebrow">CBN Cooperative · Project subscriptions</p>
          <h1 className="mt-4 text-[2.55rem] leading-[0.97] sm:text-[3.3rem] lg:text-[3.75rem]">
            Every project,
            <br />
            every unit,
            <br />
            <span className="text-forest">on one ledger.</span>
          </h1>
          <p className="mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-soft">
            Gidan Daya is where cooperative members see which projects are open, what a unit costs and how far each
            one is funded. It is also where the secretariat keeps every commitment in one book, instead of a folder of
            spreadsheets.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/app" className="btn btn-primary">
              Open the dashboard
            </Link>
            <a href="#projects" className="btn btn-ghost">
              See what is open
            </a>
          </div>

          <ul className="mt-9 max-w-md border-t border-line text-sm">
            {[
              'Units priced per project, not per member',
              'Installments tracked against each commitment',
              'Cycle exports in PDF and Excel',
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
          <ProductWindow />
          <p className="mt-3 text-xs text-ink-soft">
            A working replica of the projects screen. Switch projects on the left; figures are sample data.
          </p>
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="border-b border-line bg-paper-3/55">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <div className="max-w-2xl">
          <p className="eyebrow">How a subscription runs</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">Three steps, and the arithmetic is done for you.</h2>
        </div>

        <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step) => (
            <li key={step.number} className="border-t border-forest/25 pt-4">
              <span className="num font-display text-[2.1rem] leading-none text-clay">{step.number}</span>
              <h3 className="mt-3 text-[1.15rem]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FundingLedger() {
  const rows = SAMPLE_PROJECTS.map((project) => ({ project, status: describeProject(project) }));

  return (
    <section id="projects" className="border-b border-line">
      <div className="mx-auto max-w-[1180px] px-5 py-14 lg:py-18">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow">This cycle</p>
            <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">What the cooperative is funding right now.</h2>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              Six projects are open to subscriptions this cycle. Each bar is the share of units already taken by
              members.
            </p>
          </div>
          <DataModeBadge mode={dataMode} />
        </div>

        <div className="mt-8 hidden overflow-hidden rounded-sm border border-line bg-paper-2 md:block">
          <table className="ledger">
            <caption className="sr-only">Projects open for subscription this cycle</caption>
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Unit price</th>
                <th scope="col">Units taken</th>
                <th scope="col" className="w-[26%]">
                  Funding
                </th>
                <th scope="col">Closes</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ project, status }) => {
                const percent = fundingPercent(project.unitsTaken, project.totalUnits);
                return (
                  <tr key={project.id}>
                    <td>
                      <Link to={`/app/projects/${project.id}`} className="group block">
                        <span className="num text-[0.6875rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                          {project.code}
                        </span>
                        <span className="mt-0.5 block font-medium text-ink underline-offset-4 group-hover:underline">
                          {project.name}
                        </span>
                      </Link>
                    </td>
                    <td className="num whitespace-nowrap">{formatNaira(project.unitPrice)}</td>
                    <td className="num whitespace-nowrap text-ink-soft">
                      {project.unitsTaken}/{project.totalUnits}
                    </td>
                    <td>
                      <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} />
                      <span className="num mt-1 block text-xs text-ink-soft">
                        {percent}% · {remainingUnits(project)} left
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-ink-soft">{formatDate(project.closesOn)}</td>
                    <td>
                      <ProjectPill status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ul className="mt-6 grid gap-3 md:hidden">
          {rows.map(({ project, status }) => {
            const percent = fundingPercent(project.unitsTaken, project.totalUnits);
            return (
              <li key={project.id} className="card-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="num text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                      {project.code}
                    </p>
                    <Link to={`/app/projects/${project.id}`} className="mt-0.5 block font-medium">
                      {project.name}
                    </Link>
                  </div>
                  <ProjectPill status={status} />
                </div>
                <div className="mt-3">
                  <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} label={`${percent}% funded`} />
                  <p className="num mt-1.5 text-xs text-ink-soft">
                    {percent}% · {formatNaira(project.unitPrice)} per unit · closes {formatDate(project.closesOn)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function Secretariat() {
  const committed = sumBy(SAMPLE_SUBSCRIPTIONS, (item) => item.amount);
  const collected = sumBy(SAMPLE_SUBSCRIPTIONS, (item) => item.paid);
  const outstanding = Math.max(0, committed - collected);
  const due = SAMPLE_SUBSCRIPTIONS.filter((item) => item.status === 'due');

  return (
    <section id="secretariat" className="border-b border-line bg-paper-3/40">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:py-18">
        <div>
          <p className="eyebrow">For the secretariat</p>
          <h2 className="mt-3 text-[1.85rem] sm:text-[2.3rem]">The register and the books, in the same place.</h2>
          <p className="mt-3 max-w-[48ch] text-[0.9375rem] text-ink-soft">
            Officers see funding progress, member commitments and outstanding balances without reconciling two files
            at the end of the month.
          </p>

          <dl className="mt-7 border-t border-line">
            {SECRETARIAT.map((item) => (
              <div key={item.title} className="border-b border-line py-3.5">
                <dt className="text-[0.9375rem] font-semibold text-forest">{item.title}</dt>
                <dd className="mt-1 max-w-[52ch] text-sm leading-relaxed text-ink-soft">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="lg:pt-10">
          <div className="card-raised overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-3/60 px-4 py-2.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">
                Cycle {SAMPLE_CYCLE.label} · close summary
              </p>
              <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[#6f4d12]">
                Sample data
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
              {[
                { label: 'Committed', value: formatCompactNaira(committed) },
                { label: 'Collected', value: formatCompactNaira(collected) },
                { label: 'Outstanding', value: formatCompactNaira(outstanding) },
              ].map((figure) => (
                <div key={figure.label} className="px-4 py-3.5">
                  <p className="text-[0.625rem] uppercase tracking-[0.09em] text-ink-soft">{figure.label}</p>
                  <p className="num mt-1 font-display text-lg text-forest">{figure.value}</p>
                </div>
              ))}
            </div>

            <div className="px-4 py-3.5">
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                Awaiting confirmation
              </p>
              <ul className="mt-2 divide-y divide-line">
                {due.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{item.memberName}</span>
                      <span className="num block text-xs text-ink-soft">{item.reference}</span>
                    </span>
                    <span className="num shrink-0 text-right">
                      <span className="block font-medium">{formatNaira(item.amount - item.paid)}</span>
                      <span className="block text-xs text-clay-deep">
                        due {item.nextDueOn ? formatDate(item.nextDueOn) : '—'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Exports are generated in the browser: a statement as PDF, the full cycle as an Excel workbook.
          </p>
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="bg-forest text-paper">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-5 py-14 sm:flex-row sm:items-end sm:justify-between lg:py-16">
        <div className="max-w-xl">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-gold">Subscriptions close 27 Feb 2027</p>
          <h2 className="mt-3 text-[1.9rem] leading-tight text-paper sm:text-[2.4rem]">
            See what is open, then take your units.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-paper/75">
            Sign in with your cooperative email. If this deployment is not yet connected to Supabase, the dashboard
            runs on sample data so you can walk the flow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/app" className="btn btn-primary">
            Open the dashboard
          </Link>
          <Link
            to="/signin"
            className="btn border-paper/30 text-paper hover:bg-paper/10"
            style={{ borderColor: 'rgba(247,243,234,0.32)' }}
          >
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
          <p className="font-display text-lg leading-none">Gidan Daya</p>
          <p className="mt-2 max-w-xs text-sm text-ink-soft">
            The CBN Cooperative's project subscription system: units, installments and funding progress in one ledger.
          </p>
        </div>
        <nav aria-label="Product" className="text-sm">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Product</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link to="/app" className="hover:underline">
                Overview
              </Link>
            </li>
            <li>
              <Link to="/app/projects" className="hover:underline">
                Projects
              </Link>
            </li>
            <li>
              <Link to="/app/subscriptions" className="hover:underline">
                My subscriptions
              </Link>
            </li>
            <li>
              <Link to="/app/reports" className="hover:underline">
                Reports
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Account" className="text-sm">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">Account</p>
          <ul className="mt-2 space-y-1.5">
            <li>
              <Link to="/signin" className="hover:underline">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/app/members" className="hover:underline">
                Member register
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-4 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Gidan Daya · CBN Cooperative</p>
          <p>Figures are sample data unless this deployment is connected to Supabase.</p>
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
        <HowItWorks />
        <FundingLedger />
        <Secretariat />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

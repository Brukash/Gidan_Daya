import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SAMPLE_PROJECTS } from '../data/seed';
import { describeProject, fundingPercent, remainingUnits } from '../lib/funding';
import { formatCompactNaira, formatDate } from '../lib/format';
import { Passbook, ProjectPill } from './ui';

/** A hand-built replica of the projects screen — interactive, not a screenshot. */
export function ProductWindow() {
  const [activeId, setActiveId] = useState(SAMPLE_PROJECTS[0]?.id ?? '');
  const active = SAMPLE_PROJECTS.find((project) => project.id === activeId) ?? SAMPLE_PROJECTS[0];

  if (!active) return null;

  const status = describeProject(active);
  const percent = fundingPercent(active.unitsTaken, active.totalUnits);

  return (
    <div className="overflow-hidden rounded-sm border border-line bg-paper-2 shadow-[0_1px_0_#fff_inset,0_18px_40px_-24px_rgb(26_36_32_/_0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-3/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-clay/70" />
            <span className="h-2 w-2 rounded-full bg-gold/70" />
            <span className="h-2 w-2 rounded-full bg-forest/40" />
          </span>
          <p className="ml-1 text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">
            Gidan Daya · Projects
          </p>
        </div>
        <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[#6f4d12]">
          Sample data
        </span>
      </div>

      <div className="grid sm:grid-cols-[11.5rem_1fr]">
        <div className="border-b border-line bg-paper/60 p-2 sm:border-r sm:border-b-0">
          <p className="px-2 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            This cycle
          </p>
          <ul className="flex flex-col gap-0.5">
            {SAMPLE_PROJECTS.slice(0, 4).map((project) => {
              const selected = project.id === active.id;
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(project.id)}
                    aria-pressed={selected}
                    className={`w-full rounded-sm px-2 py-2 text-left transition-colors ${
                      selected ? 'bg-paper-2 shadow-[inset_2px_0_0_#A8452A]' : 'hover:bg-paper-2/70'
                    }`}
                  >
                    <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                      {project.code}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-[0.8125rem] font-medium leading-snug text-ink">
                      {project.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {active.category} · {active.code}
              </p>
              <h3 className="mt-1 text-[1.05rem] leading-tight">{active.name}</h3>
            </div>
            <ProjectPill status={status} />
          </div>

          <div className="mt-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[0.6875rem] uppercase tracking-[0.09em] text-ink-soft">Funded</span>
              <span className="num text-sm font-semibold text-forest">{percent}%</span>
            </div>
            <Passbook unitsTaken={active.unitsTaken} totalUnits={active.totalUnits} label={`${percent}% funded`} />
            <p className="num mt-1.5 text-[0.6875rem] text-ink-soft">
              {active.unitsTaken} of {active.totalUnits} units taken · {remainingUnits(active)} left
            </p>
          </div>

          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Unit price</dt>
              <dd className="num mt-0.5 text-[0.8125rem] font-semibold text-ink">{formatCompactNaira(active.unitPrice)}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Closes</dt>
              <dd className="mt-0.5 text-[0.8125rem] font-semibold text-ink">{formatDate(active.closesOn)}</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Units left</dt>
              <dd className="num mt-0.5 text-[0.8125rem] font-semibold text-ink">{remainingUnits(active)}</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2">
            <Link to={`/app/projects/${active.id}`} className="btn btn-forest flex-1 text-sm">
              Open this project
            </Link>
            <span className="num rounded-sm border border-line px-2 py-2 text-[0.6875rem] text-ink-soft">
              {status.detail}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, Passbook, ProjectPill } from '../components/ui';
import { listProjects } from '../data/repository';
import { describeProject, fundingPercent, remainingUnits } from '../lib/funding';
import { formatDate, formatNaira } from '../lib/format';

type Filter = 'all' | 'open' | 'closing' | 'funded';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All projects' },
  { id: 'open', label: 'Open' },
  { id: 'closing', label: 'Closing soon' },
  { id: 'funded', label: 'Fully subscribed' },
];

export function Projects() {
  const [term, setTerm] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const query = useQuery({ queryKey: ['projects'], queryFn: listProjects });

  const rows = useMemo(() => {
    const projects = query.data ?? [];
    const needle = term.trim().toLowerCase();
    return projects
      .map((project) => ({ project, status: describeProject(project) }))
      .filter(({ project, status }) => {
        const matchesTerm =
          needle.length === 0 ||
          project.name.toLowerCase().includes(needle) ||
          project.code.toLowerCase().includes(needle) ||
          project.category.toLowerCase().includes(needle);
        const matchesFilter = filter === 'all' || status.state === filter;
        return matchesTerm && matchesFilter;
      });
  }, [query.data, term, filter]);

  const total = query.data?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="This cycle"
        title="Projects open to subscription"
        description="Unit prices and closing dates are set by the secretariat. Capacity is checked again when you subscribe, so a project can close while you are reading it."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter projects by status">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                filter === option.id
                  ? 'border-forest bg-forest text-paper'
                  : 'border-line bg-paper-2 text-ink-soft hover:border-forest/40 hover:text-ink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="sm:w-64">
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input
            id="project-search"
            type="search"
            className="input"
            placeholder="Search projects"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>
      </div>

      {query.isLoading ? <LoadingBlock /> : null}
      {query.isError ? <ErrorBlock message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isLoading && !query.isError ? (
        rows.length === 0 ? (
          <EmptyState
            title="No projects match that"
            body={
              total === 0
                ? 'No projects have been published for this cycle yet.'
                : 'Try a different search term, or clear the status filter.'
            }
            action={
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setTerm('');
                  setFilter('all');
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-sm border border-line bg-paper-2 sm:block">
              <div className="overflow-x-auto">
                <table className="ledger">
                  <caption className="sr-only">
                    {rows.length} of {total} projects shown
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col">Unit price</th>
                      <th scope="col">Units</th>
                      <th scope="col" className="w-[24%]">
                        Funding
                      </th>
                      <th scope="col">Closes</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ project, status }) => (
                      <tr key={project.id}>
                        <td>
                          <Link to={`/app/projects/${project.id}`} className="block hover:underline">
                            <span className="num text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                              {project.code} · {project.category}
                            </span>
                            <span className="block font-medium">{project.name}</span>
                          </Link>
                        </td>
                        <td className="num whitespace-nowrap">{formatNaira(project.unitPrice)}</td>
                        <td className="num whitespace-nowrap text-ink-soft">
                          {project.unitsTaken}/{project.totalUnits}
                        </td>
                        <td className="min-w-[8.5rem]">
                          <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} />
                          <span className="num mt-1 block text-xs text-ink-soft">
                            {fundingPercent(project.unitsTaken, project.totalUnits)}% · {remainingUnits(project)} left
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-ink-soft">{formatDate(project.closesOn)}</td>
                        <td>
                          <ProjectPill status={status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <ul className="grid gap-3 sm:hidden">
              {rows.map(({ project, status }) => (
                <li key={project.id} className="card-raised p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/app/projects/${project.id}`} className="min-w-0">
                      <span className="num block text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                        {project.code} · {project.category}
                      </span>
                      <span className="block font-medium leading-snug">{project.name}</span>
                    </Link>
                    <ProjectPill status={status} />
                  </div>
                  <div className="mt-3">
                    <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} />
                    <p className="num mt-1.5 text-xs text-ink-soft">
                      {fundingPercent(project.unitsTaken, project.totalUnits)}% · {formatNaira(project.unitPrice)} per
                      unit · closes {formatDate(project.closesOn)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-xs text-ink-soft">
              Showing {rows.length} of {total} projects.
            </p>
          </>
        )
      ) : null}
    </div>
  );
}

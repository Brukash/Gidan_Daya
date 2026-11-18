import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, ErrorBlock, Kpi, LoadingBlock, PageHeader, Passbook, useToast } from '../components/ui';
import { listMembers, listProjects, listSubscriptions } from '../data/repository';
import { SAMPLE_CYCLE } from '../data/seed';
import { describeProject, fundingPercent, remainingUnits, sumBy } from '../lib/funding';
import { exportCycleXlsx, exportStatementPdf } from '../lib/exports';
import { formatCompactNaira, formatDate, formatNaira, plural } from '../lib/format';

export function Reports() {
  const toast = useToast();
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const subsQuery = useQuery({ queryKey: ['subscriptions', 'all'], queryFn: () => listSubscriptions() });
  const membersQuery = useQuery({ queryKey: ['members'], queryFn: listMembers });

  const projects = projectsQuery.data ?? [];
  const subs = subsQuery.data ?? [];
  const members = membersQuery.data ?? [];

  const committed = sumBy(subs, (item) => item.amount);
  const collected = sumBy(subs, (item) => item.paid);
  const outstanding = Math.max(0, committed - collected);

  const loading = projectsQuery.isLoading || subsQuery.isLoading;

  const onRegister = async () => {
    setBusy('pdf');
    try {
      await exportStatementPdf(subs, 'Cooperative register');
      toast({ title: 'Register downloaded', detail: `${subs.length} ${plural(subs.length, 'subscription')} in the PDF.` });
    } catch (cause) {
      toast({ title: 'Could not build the PDF', detail: cause instanceof Error ? cause.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  };

  const onWorkbook = async () => {
    setBusy('xlsx');
    try {
      await exportCycleXlsx(projects, subs, members);
      toast({ title: 'Workbook downloaded', detail: 'Three sheets: projects, subscriptions, members.' });
    } catch (cause) {
      toast({ title: 'Could not build the workbook', detail: cause instanceof Error ? cause.message : 'Unknown error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Cycle ${SAMPLE_CYCLE.label}`}
        title="Cycle report"
        description={`Opened ${formatDate(SAMPLE_CYCLE.opensOn)} · closes ${formatDate(SAMPLE_CYCLE.closesOn)}. Totals are indexed from subscriptions, not typed in.`}
        actions={
          <>
            <Button variant="ghost" onClick={() => void onRegister()} disabled={busy !== null || subs.length === 0}>
              {busy === 'pdf' ? 'Building PDF…' : 'Register (PDF)'}
            </Button>
            <Button variant="forest" onClick={() => void onWorkbook()} disabled={busy !== null}>
              {busy === 'xlsx' ? 'Building workbook…' : 'Cycle workbook (Excel)'}
            </Button>
          </>
        }
      />

      {loading ? <LoadingBlock /> : null}
      {projectsQuery.isError ? (
        <ErrorBlock message={projectsQuery.error.message} onRetry={() => void projectsQuery.refetch()} />
      ) : null}

      {!loading && !projectsQuery.isError ? (
        <>
          <section aria-label="Cycle totals" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Committed" value={formatCompactNaira(committed)} context={`${subs.length} ${plural(subs.length, 'subscription')}`} />
            <Kpi label="Collected" value={formatCompactNaira(collected)} context="Payments recorded against references" />
            <Kpi label="Outstanding" value={formatCompactNaira(outstanding)} context="Balance across all members" />
            <Kpi
              label="Units taken"
              value={String(sumBy(projects, (project) => project.unitsTaken))}
              context={`Across ${projects.length} ${plural(projects.length, 'project')}`}
            />
          </section>

          <section aria-labelledby="breakdown-heading" className="card-raised overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 id="breakdown-heading" className="text-[1.05rem]">
                Breakdown by project
              </h2>
              <p className="text-xs text-ink-soft">Funding, commitments and units for the current cycle.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="ledger">
                <caption className="sr-only">Cycle totals per project</caption>
                <thead>
                  <tr>
                    <th scope="col">Project</th>
                    <th scope="col">Units</th>
                    <th scope="col" className="w-[22%]">
                      Funding
                    </th>
                    <th scope="col">Subscriptions</th>
                    <th scope="col">Committed</th>
                    <th scope="col">Collected</th>
                    <th scope="col">Closes</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => {
                    const own = subs.filter((item) => item.projectId === project.id);
                    const status = describeProject(project);
                    return (
                      <tr key={project.id}>
                        <td>
                          <span className="num text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-ink-soft">
                            {project.code}
                          </span>
                          <span className="block font-medium">{project.name}</span>
                          <span className="text-xs text-ink-soft">{status.label}</span>
                        </td>
                        <td className="num whitespace-nowrap text-ink-soft">
                          {project.unitsTaken}/{project.totalUnits}
                        </td>
                        <td className="min-w-[8rem]">
                          <Passbook unitsTaken={project.unitsTaken} totalUnits={project.totalUnits} />
                          <span className="num mt-1 block text-xs text-ink-soft">
                            {fundingPercent(project.unitsTaken, project.totalUnits)}% · {remainingUnits(project)} left
                          </span>
                        </td>
                        <td className="num">{own.length}</td>
                        <td className="num">{formatNaira(sumBy(own, (item) => item.amount))}</td>
                        <td className="num">{formatNaira(sumBy(own, (item) => item.paid))}</td>
                        <td className="whitespace-nowrap text-ink-soft">{formatDate(project.closesOn)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-ink-soft">
            Exports are generated in the browser from the data above. No file leaves the device.
          </p>
        </>
      ) : null}
    </div>
  );
}

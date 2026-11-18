import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import { Button, EmptyState, ErrorBlock, Kpi, LoadingBlock, PageHeader, SubscriptionPill, useToast } from '../components/ui';
import { listMembers, listProjects, listSubscriptions } from '../data/repository';
import { sumBy } from '../lib/funding';
import { exportCycleXlsx, exportStatementPdf } from '../lib/exports';
import { formatDate, formatNaira, plural } from '../lib/format';

export function Subscriptions() {
  const { user } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);

  const subsQuery = useQuery({
    queryKey: ['subscriptions', user?.id ?? 'anonymous'],
    queryFn: () => listSubscriptions(user?.id),
    enabled: Boolean(user),
  });
  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: listProjects });
  const membersQuery = useQuery({ queryKey: ['members'], queryFn: listMembers });

  const subs = subsQuery.data ?? [];
  const committed = sumBy(subs, (item) => item.amount);
  const paid = sumBy(subs, (item) => item.paid);
  const outstanding = Math.max(0, committed - paid);

  const onStatement = async () => {
    if (!user) return;
    setBusy('pdf');
    try {
      await exportStatementPdf(subs, user.name);
      toast({ title: 'Statement downloaded', detail: `${subs.length} ${plural(subs.length, 'line')} in the PDF.` });
    } catch (cause) {
      toast({
        title: 'Could not build the PDF',
        detail: cause instanceof Error ? cause.message : 'Unknown error',
      });
    } finally {
      setBusy(null);
    }
  };

  const onWorkbook = async () => {
    setBusy('xlsx');
    try {
      await exportCycleXlsx(projectsQuery.data ?? [], subs, membersQuery.data ?? []);
      toast({ title: 'Workbook downloaded', detail: 'Projects, subscriptions and members in one file.' });
    } catch (cause) {
      toast({
        title: 'Could not build the workbook',
        detail: cause instanceof Error ? cause.message : 'Unknown error',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your record"
        title="My subscriptions"
        description="Each commitment carries a reference, the units taken and what is still outstanding."
        actions={
          <>
            <Button variant="ghost" onClick={() => void onStatement()} disabled={busy !== null || subs.length === 0}>
              {busy === 'pdf' ? 'Building PDF…' : 'Statement (PDF)'}
            </Button>
            <Button variant="forest" onClick={() => void onWorkbook()} disabled={busy !== null}>
              {busy === 'xlsx' ? 'Building workbook…' : 'Cycle workbook (Excel)'}
            </Button>
          </>
        }
      />

      <section aria-label="Your totals" className="grid grid-cols-3 gap-3">
        <Kpi label="Committed" value={formatNaira(committed)} context={`${subs.length} ${plural(subs.length, 'subscription')}`} />
        <Kpi label="Paid" value={formatNaira(paid)} context="Across all projects" />
        <Kpi label="Outstanding" value={formatNaira(outstanding)} context="Balance still to settle" />
      </section>

      {subsQuery.isLoading ? <LoadingBlock /> : null}
      {subsQuery.isError ? (
        <ErrorBlock message={subsQuery.error.message} onRetry={() => void subsQuery.refetch()} />
      ) : null}

      {!subsQuery.isLoading && !subsQuery.isError ? (
        subs.length === 0 ? (
          <EmptyState
            title="You have no subscriptions yet"
            body="Once you subscribe to a project, its reference, units and balance will be listed here."
            action={
              <Link to="/app/projects" className="btn btn-primary">
                Browse projects
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-sm border border-line bg-paper-2">
            <div className="overflow-x-auto">
              <table className="ledger">
                <caption className="sr-only">Your subscription commitments</caption>
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Project</th>
                    <th scope="col">Units</th>
                    <th scope="col">Committed</th>
                    <th scope="col">Paid</th>
                    <th scope="col">Outstanding</th>
                    <th scope="col">Next due</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((item) => (
                    <tr key={item.id}>
                      <td className="num text-ink-soft">{item.reference}</td>
                      <td>
                        <Link to={`/app/projects/${item.projectId}`} className="font-medium hover:underline">
                          {item.projectName}
                        </Link>
                        <span className="block text-xs text-ink-soft">Taken {formatDate(item.createdAt)}</span>
                      </td>
                      <td className="num">{item.units}</td>
                      <td className="num">{formatNaira(item.amount)}</td>
                      <td className="num">{formatNaira(item.paid)}</td>
                      <td className="num">{formatNaira(Math.max(0, item.amount - item.paid))}</td>
                      <td className="whitespace-nowrap text-ink-soft">
                        {item.nextDueOn ? formatDate(item.nextDueOn) : '—'}
                      </td>
                      <td>
                        <SubscriptionPill status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : null}

      <p className="text-xs text-ink-soft">
        Installments are reminders, not automatic debits. The secretariat records each payment against the reference.
      </p>
    </div>
  );
}

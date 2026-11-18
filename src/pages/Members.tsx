import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useSession } from '../auth/session';
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from '../components/ui';
import { listMembers } from '../data/repository';
import { formatDate, formatNaira } from '../lib/format';

export function Members() {
  const { user } = useSession();
  const [term, setTerm] = useState('');
  const query = useQuery({ queryKey: ['members'], queryFn: listMembers, enabled: user?.role === 'admin' });

  const rows = useMemo(() => {
    const members = query.data ?? [];
    const needle = term.trim().toLowerCase();
    if (needle.length === 0) return members;
    return members.filter(
      (member) =>
        member.name.toLowerCase().includes(needle) ||
        member.email.toLowerCase().includes(needle) ||
        member.role.includes(needle),
    );
  }, [query.data, term]);

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Secretariat" title="Member register" description="Restricted to secretariat accounts." />
        <EmptyState
          title="This register is for the secretariat"
          body="Your account is a member account, so the full register is not shown. Sign in with a secretariat address to review it."
          action={
            <Link to="/app" className="btn btn-forest">
              Back to overview
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Secretariat"
        title="Member register"
        description="Every member with a commitment this cycle, with indexed totals from their subscriptions."
        actions={
          <div className="sm:w-64">
            <label htmlFor="member-search" className="sr-only">
              Search members
            </label>
            <input
              id="member-search"
              type="search"
              className="input"
              placeholder="Search name, email or role"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          </div>
        }
      />

      {query.isLoading ? <LoadingBlock label="Reading the register…" /> : null}
      {query.isError ? <ErrorBlock message={query.error.message} onRetry={() => void query.refetch()} /> : null}

      {!query.isLoading && !query.isError ? (
        rows.length === 0 ? (
          <EmptyState
            title="No member matches that"
            body="Clear the search to see the whole register."
            action={
              <button type="button" className="btn btn-ghost" onClick={() => setTerm('')}>
                Clear search
              </button>
            }
          />
        ) : (
          <>
          <div className="hidden overflow-hidden rounded-sm border border-line bg-paper-2 sm:block">
            <div className="overflow-x-auto">
              <table className="ledger">
                <caption className="sr-only">Cooperative member register</caption>
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Role</th>
                    <th scope="col">Joined</th>
                    <th scope="col">Units</th>
                    <th scope="col">Committed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <span className="block font-medium">{member.name}</span>
                        <span className="block text-xs text-ink-soft">{member.email || 'No email on record'}</span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            member.role === 'admin' ? 'bg-forest text-paper' : 'bg-sage text-forest'
                          }`}
                        >
                          {member.role === 'admin' ? 'Secretariat' : 'Member'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-ink-soft">{formatDate(member.joinedOn)}</td>
                      <td className="num">{member.units}</td>
                      <td className="num">{formatNaira(member.committed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="divide-y divide-line rounded-sm border border-line bg-paper-2 sm:hidden">
            {rows.map((member) => (
              <li key={member.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-ink-soft">{member.email || 'No email on record'}</p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                      member.role === 'admin' ? 'bg-forest text-paper' : 'bg-sage text-forest'
                    }`}
                  >
                    {member.role === 'admin' ? 'Secretariat' : 'Member'}
                  </span>
                </div>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                  <div>
                    <dt className="inline">Joined </dt>
                    <dd className="num inline">{formatDate(member.joinedOn)}</dd>
                  </div>
                  <div>
                    <dt className="inline">Units </dt>
                    <dd className="num inline">{member.units}</dd>
                  </div>
                  <div>
                    <dt className="inline">Committed </dt>
                    <dd className="num inline text-ink">{formatNaira(member.committed)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
          </>
        )
      ) : null}

      <p className="text-xs text-ink-soft">
        {rows.length} {rows.length === 1 ? 'member' : 'members'} shown. Roles in sample mode are derived from the
        sign-in address so both surfaces can be reviewed.
      </p>
    </div>
  );
}

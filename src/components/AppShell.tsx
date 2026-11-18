import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../auth/session';
import { SAMPLE_CYCLE } from '../data/seed';
import { dataMode } from '../lib/supabase';
import { DataModeBadge } from './ui';

const NAV = [
  { to: '/app', label: 'Overview', end: true, icon: 'grid' },
  { to: '/app/projects', label: 'Projects', end: false, icon: 'folder' },
  { to: '/app/subscriptions', label: 'My subscriptions', end: false, icon: 'receipt' },
  { to: '/app/members', label: 'Members', end: false, icon: 'users' },
  { to: '/app/reports', label: 'Reports', end: false, icon: 'chart' },
] as const;

function Icon({ name }: { name: (typeof NAV)[number]['icon'] }) {
  const paths: Record<string, string> = {
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    folder: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v7.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z',
    receipt: 'M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19c.6-3 2.8-4.5 5.5-4.5S13 16 13.5 19M17 11.5a2.5 2.5 0 1 0 0-5M15.5 14.8c2.4.3 4 1.8 4.5 4.2',
    chart: 'M4 19V5M4 19h16M8 15v-4M12.5 15V8M17 15v-6',
  };

  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
      <path d={paths[name] ?? paths.grid} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Rail({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useSession();

  return (
    <div className="flex h-full flex-col bg-forest px-3 py-5 text-paper">
      <div className="px-2">
        <p className="font-display text-[1.35rem] leading-none tracking-[-0.03em]">Gidan Daya</p>
        <p className="mt-1.5 text-[0.6875rem] uppercase tracking-[0.14em] text-paper/55">CBN Cooperative</p>
      </div>

      <div className="my-5 h-px bg-paper/15" />

      <nav aria-label="Primary" className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="rail-link" onClick={onNavigate}>
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-paper/15 pt-4">
        <p className="px-1 text-[0.6875rem] uppercase tracking-[0.12em] text-paper/50">Cycle {SAMPLE_CYCLE.label}</p>
        {user ? (
          <>
            <p className="mt-2 px-1 text-sm font-semibold text-paper">{user.name}</p>
            <p className="px-1 text-xs text-paper/60">
              {user.role === 'admin' ? 'Secretariat' : 'Member'} · {user.email}
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-3 w-full rounded-sm border border-paper/25 px-3 py-2 text-left text-sm text-paper/85 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              Sign out
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <aside className="hidden lg:block">
        <div className="sticky top-0 h-dvh">
          <Rail />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn btn-quiet -ml-2 lg:hidden"
                aria-expanded={open}
                aria-controls="mobile-rail"
                onClick={() => setOpen(true)}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                Menu
              </button>
              <div className="lg:hidden">
                <p className="font-display text-base leading-none">Gidan Daya</p>
              </div>
              <p className="hidden text-sm text-ink-soft lg:block">
                Cycle {SAMPLE_CYCLE.label} · subscriptions close 27 Feb 2027
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DataModeBadge mode={dataMode} />
            </div>
          </div>
        </header>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
          <Outlet />
        </main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-ink/50"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-rail"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-2xl"
          >
            <Rail onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

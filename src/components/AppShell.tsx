import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../auth/session';
import { useScheme } from '../data/scheme';
import { formatDate, formatNaira } from '../lib/format';
import { dataMode } from '../lib/supabase';
import { DataModeBadge } from './ui';

type IconName = 'grid' | 'plots' | 'plus' | 'receipt' | 'users' | 'chart' | 'edit' | 'settings';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
  icon: IconName;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/app', label: 'Overview', end: true, icon: 'grid' },
  { to: '/app/plots', label: 'Plot availability', end: false, icon: 'plots' },
  { to: '/apply', label: 'Start subscription', end: false, icon: 'plus' },
  { to: '/app/application', label: 'My application', end: false, icon: 'receipt' },
  { to: '/app/members', label: 'Applicants', end: false, icon: 'users', adminOnly: true },
  { to: '/app/reports', label: 'Reports', end: false, icon: 'chart', adminOnly: true },
  { to: '/app/content', label: 'Published content', end: false, icon: 'edit', adminOnly: true },
  { to: '/app/settings', label: 'Scheme settings', end: false, icon: 'settings', adminOnly: true },
];

function Icon({ name }: { name: IconName }) {
  const paths: Record<string, string> = {
    grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    plots: 'M4 7l8-3 8 3-8 3zM4 12l8 3 8-3M4 17l8 3 8-3',
    plus: 'M12 5v14M5 12h14',
    receipt: 'M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
    users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 19c.6-3 2.8-4.5 5.5-4.5S13 16 13.5 19M17 11.5a2.5 2.5 0 1 0 0-5M15.5 14.8c2.4.3 4 1.8 4.5 4.2',
    chart: 'M4 19V5M4 19h16M8 15v-4M12.5 15V8M17 15v-6',
    edit: 'M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5zM13.5 7 17 10.5',
    settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.66 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.06a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  };

  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none">
      <path d={paths[name] ?? paths.grid} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Rail({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useSession();
  const { scheme } = useScheme();
  const items = NAV.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="flex h-full flex-col bg-forest px-3 py-5 text-paper">
      <div className="flex items-start gap-2.5 px-2">
        <img
          src="/brand/coop-seal-64.png"
          alt=""
          width={40}
          height={40}
          className="mt-0.5 h-10 w-10 shrink-0"
        />
        <p className="min-w-0 pt-0.5 text-[0.625rem] uppercase leading-[1.35] tracking-[0.1em] text-paper/55">
          CBN Staff Multipurpose Cooperative Society
        </p>
      </div>

      <div className="my-5 h-px bg-paper/15" />

      <nav aria-label="Primary" className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="rail-link" onClick={onNavigate}>
            <Icon name={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-paper/15 pt-4">
        <p className="px-1 text-[0.6875rem] uppercase tracking-[0.12em] text-paper/50">
          Closes {formatDate(scheme.closesOn)}
        </p>
        {user ? (
          <>
            <p className="mt-2 px-1 text-sm font-semibold text-paper">{user.name}</p>
            <p className="px-1 text-xs text-paper/60">
              {user.role === 'admin' ? 'Secretariat' : user.cadre} · {user.memberNumber}
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
  const { scheme } = useScheme();

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
              <div className="flex items-center gap-2 lg:hidden">
                <img src="/brand/coop-seal-64.png" alt="" width={24} height={24} className="h-6 w-6" />
              </div>
              <p className="hidden text-sm text-ink-soft lg:block">
                Applications close {formatDate(scheme.closesOn)} · {formatNaira(scheme.pricePerSqm)} per sqm
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DataModeBadge mode={dataMode} />
            </div>
          </div>
        </header>

        {scheme.notice ? (
          <div className="border-b border-gold/30 bg-gold-tint/70 px-4 py-2 text-sm text-[#6f4d12] sm:px-6">
            {scheme.notice}
          </div>
        ) : null}

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

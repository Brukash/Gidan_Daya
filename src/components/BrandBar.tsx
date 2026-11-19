import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The slim public header used by the application flow, which no longer sits
 * behind sign-in. The landing page keeps its fuller header.
 */
export function BrandBar({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-3">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/brand/coop-seal-64.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          <span className="text-[0.625rem] uppercase leading-[1.3] tracking-[0.1em] text-ink-soft">
            CBN Staff Multipurpose Cooperative Society
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {children}
          <Link to="/" className="btn btn-quiet text-sm">
            Scheme page
          </Link>
          <Link to="/signin" className="btn btn-ghost text-sm">
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}

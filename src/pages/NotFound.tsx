import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 max-w-lg text-[2.1rem] leading-tight sm:text-[2.7rem]">This page is not in the ledger.</h1>
      <p className="mt-3 max-w-md text-[0.9375rem] text-ink-soft">
        The address may be mistyped, or the page may have moved. The projects list is the quickest way back in.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/app/projects" className="btn btn-primary">
          Browse projects
        </Link>
        <Link to="/" className="btn btn-ghost">
          Back to the project page
        </Link>
      </div>
    </div>
  );
}

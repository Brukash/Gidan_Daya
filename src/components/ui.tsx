import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ApplicationStatus, DataMode } from '../data/types';
import { PASSBOOK_TICKS, filledTicks, type TierStatus } from '../lib/allocations';
import { EASE_OUT } from './motion';

type Variant = 'primary' | 'forest' | 'ghost' | 'quiet';

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`btn btn-${variant} ${className}`} {...rest} />;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-[1.75rem] leading-[1.08] sm:text-[2.1rem]">{title}</h1>
        {description ? <p className="mt-2 text-[0.9375rem] text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Passbook({
  allocated,
  totalPlots,
  tone = 'forest',
  size = 'sm',
  label,
}: {
  allocated: number;
  totalPlots: number;
  tone?: 'forest' | 'gold';
  size?: 'sm' | 'lg';
  label?: string;
}) {
  const filled = filledTicks(allocated, totalPlots);
  const percent = totalPlots > 0 ? Math.round((allocated / totalPlots) * 100) : 0;

  return (
    <div
      className={`passbook${tone === 'gold' ? ' passbook--gold' : ''}${size === 'lg' ? ' passbook--lg' : ''}`}
      role="img"
      aria-label={label ?? `${percent}% of plots allocated`}
    >
      {Array.from({ length: PASSBOOK_TICKS }, (_, index) => (
        <span key={index} data-filled={index < filled} style={{ '--tick': index } as CSSProperties} />
      ))}
    </div>
  );
}

const TIER_TONE: Record<TierStatus['state'], string> = {
  available: 'bg-sage text-forest',
  limited: 'bg-gold-tint text-[#6f4d12]',
  exhausted: 'bg-forest text-paper',
  closed: 'bg-paper-3 text-ink-soft',
};

export function TierPill({ status }: { status: TierStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TIER_TONE[status.state]}`}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status.label}
    </span>
  );
}

const APPLICATION_TONE: Record<ApplicationStatus, { label: string; className: string }> = {
  reserved: { label: 'Reserved', className: 'bg-gold-tint text-[#6f4d12]' },
  'deposit-paid': { label: 'Deposit paid', className: 'bg-sage text-forest' },
  'fully-paid': { label: 'Fully paid', className: 'bg-forest text-paper' },
  allocated: { label: 'Allocated', className: 'bg-forest text-paper' },
};

export function ApplicationPill({ status }: { status: ApplicationStatus }) {
  const tone = APPLICATION_TONE[status];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${tone.className}`}
    >
      {tone.label}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <motion.p
          id={`${htmlFor}-error`}
          className="field-error"
          role="alert"
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          <svg aria-hidden viewBox="0 0 16 16" className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 4.6v4.2M8 11.2v.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {error}
        </motion.p>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card px-6 py-10 text-center">
      <div aria-hidden className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper-3">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-soft" fill="none">
          <path d="M5 7h14M5 12h9M5 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-lg">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">{body}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ label = 'Opening the register…' }: { label?: string }) {
  return (
    <div role="status" className="px-1 py-8">
      <div className="flex items-center gap-3 text-sm text-ink-soft">
        <span aria-hidden className="relative flex h-3 w-3">
          <span className="absolute inset-0 animate-ping rounded-full bg-forest/30" />
          <span className="relative h-3 w-3 rounded-full bg-forest" />
        </span>
        {label}
      </div>
      <div aria-hidden className="mt-4 grid max-w-md gap-2">
        <span className="skeleton h-2.5 w-2/5" />
        <span className="skeleton h-2.5 w-3/5" />
        <span className="skeleton h-2.5 w-1/3" />
      </div>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <motion.div
      role="alert"
      className="card border-clay/40 bg-clay-tint/50 px-5 py-4"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: EASE_OUT }}
    >
      <p className="text-sm font-semibold text-clay-deep">Something went wrong reading the register</p>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
      {onRetry ? (
        <div className="mt-3">
          <Button variant="ghost" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </motion.div>
  );
}

export function DataModeBadge({ mode }: { mode: DataMode }) {
  const isSample = mode === 'sample';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
        isSample ? 'border-gold/40 bg-gold-tint text-[#6f4d12]' : 'border-forest/25 bg-sage text-forest'
      }`}
      title={
        isSample
          ? 'No Supabase project is configured, so these figures are sample data.'
          : 'Connected to Supabase.'
      }
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {isSample ? 'Sample data' : 'Live data'}
    </span>
  );
}

export function Kpi({ label, value, context }: { label: string; value: string; context?: string }) {
  return (
    <div className="card-raised px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.09em] text-ink-soft">{label}</p>
      <p className="num mt-2 font-display text-[1.65rem] leading-none text-forest">{value}</p>
      {context ? <p className="mt-2 text-xs text-ink-soft">{context}</p> : null}
    </div>
  );
}

interface ToastItem {
  id: number;
  title: string;
  detail?: string;
}

const ToastContext = createContext<(toast: { title: string; detail?: string }) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((toast: { title: string; detail?: string }) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current, { ...toast, id }]);
    window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id));
    }, 6000);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
              className="pointer-events-auto w-full max-w-sm rounded-sm border border-forest/20 bg-forest px-4 py-3 text-paper shadow-lg"
            >
              <p className="text-sm font-semibold">{item.title}</p>
              {item.detail ? <p className="mt-0.5 text-xs text-paper/75">{item.detail}</p> : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

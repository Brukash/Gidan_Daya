import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { SAMPLE_TIERS } from '../data/seed';
import { useScheme } from '../data/scheme';
import { allocationPercent, describeTier } from '../lib/allocations';
import { formatNaira, formatSqm } from '../lib/format';
import { AnimatedNumber, EASE_OUT, fadeUp, staggerContainer } from './motion';
import { Passbook, TierPill } from './ui';

/** A hand-built replica of the plot screen — interactive, not a screenshot. */
export function SchemeWindow() {
  const { scheme } = useScheme();
  const [activeSize, setActiveSize] = useState(SAMPLE_TIERS[0]?.sizeSqm ?? 200);
  const active = SAMPLE_TIERS.find((tier) => tier.sizeSqm === activeSize) ?? SAMPLE_TIERS[0];

  if (!active) return null;

  const status = describeTier(active, scheme.closesOn);
  const percent = allocationPercent(active.allocated, active.totalPlots);

  return (
    <div className="plot-card overflow-hidden rounded-sm border border-line bg-paper-2 shadow-[0_1px_0_#fff_inset,0_18px_40px_-24px_rgb(26_36_32_/_0.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-3/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-clay/70" />
            <span className="h-2 w-2 rounded-full bg-gold/70" />
            <span className="h-2 w-2 rounded-full bg-forest/40" />
          </span>
          <p className="ml-1 text-[0.6875rem] font-semibold uppercase tracking-[0.11em] text-ink-soft">
            Gidan Daya · Plots
          </p>
        </div>
        <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-[#6f4d12]">
          Sample data
        </span>
      </div>

      <motion.div
        className="grid sm:grid-cols-[10.5rem_1fr]"
        initial="hidden"
        animate="show"
        variants={staggerContainer(0.12, 0.55)}
      >
        <motion.div variants={fadeUp} className="border-b border-line bg-paper/60 p-2 sm:border-r sm:border-b-0">
          <p className="px-2 py-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-ink-soft">
            Plot sizes
          </p>
          <ul className="flex flex-col gap-0.5">
            {SAMPLE_TIERS.map((tier) => {
              const selected = tier.sizeSqm === active.sizeSqm;
              return (
                <li key={tier.id}>
                  <motion.button
                    type="button"
                    onClick={() => setActiveSize(tier.sizeSqm)}
                    aria-pressed={selected}
                    whileTap={{ scale: 0.985 }}
                    transition={{ duration: 0.18, ease: EASE_OUT }}
                    className={`relative w-full overflow-hidden rounded-sm px-2 py-2 text-left transition-colors duration-200 ${
                      selected ? 'text-ink' : 'hover:bg-paper-2/70'
                    }`}
                  >
                    {selected ? (
                      <motion.span
                        aria-hidden
                        layoutId="plot-selection"
                        className="absolute inset-0 rounded-sm bg-paper-2"
                        style={{ boxShadow: 'inset 2px 0 0 #A8452A' }}
                        transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
                      />
                    ) : null}
                    <span className="relative block text-[0.8125rem] font-medium leading-snug text-ink">
                      {formatSqm(tier.sizeSqm)}
                    </span>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.div variants={fadeUp} className="p-4">
          <motion.div
            key={active.sizeSqm}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                  Residential plot
                </p>
                <h3 className="mt-1 text-[1.15rem] leading-tight">{formatSqm(active.sizeSqm)}</h3>
              </div>
              <TierPill status={status} />
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-[0.6875rem] uppercase tracking-[0.09em] text-ink-soft">Allocated</span>
                <span className="num text-sm font-semibold text-forest">
                  <AnimatedNumber value={percent} />%
                </span>
              </div>
              <Passbook allocated={active.allocated} totalPlots={active.totalPlots} label={`${percent}% allocated`} />
            </div>
          </motion.div>

          <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Rate</dt>
              <dd className="num mt-0.5 text-[0.8125rem] font-semibold text-ink">{formatNaira(scheme.pricePerSqm)}/sqm</dd>
            </div>
            <div>
              <dt className="text-[0.625rem] uppercase tracking-[0.08em] text-ink-soft">Deposit</dt>
              <dd className="mt-0.5 text-[0.8125rem] font-semibold text-ink">50% of the measured plot value</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center gap-2">
            <Link to={`/apply?size=${active.sizeSqm}`} className="btn btn-forest flex-1 text-sm">
              Start subscription
            </Link>
            <span className="num rounded-sm border border-line px-2 py-2 text-[0.6875rem] text-ink-soft">
              {status.label}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

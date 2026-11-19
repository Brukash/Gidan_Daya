# PROJECT BRIEF (approved: yes, 2026-11-18)

**Approval basis:** the user instructed, in this order, "run the AGENTS.md kickoff, write `design/PROJECT_BRIEF.md`, then implement it so `npm run build` succeeds" — that instruction is the approval. The kickoff menus (mode, references, components) were therefore decided and recorded here instead of being sent back as questions.

## Product / audience / goal

**Scope change (2026-11-18):** the first build treated the app as a catalogue of the cooperative's projects. The user corrected that — *"The app is just for Gidan Daya subscription and not for all projects"* — and everything below describes the rebuilt, single-scheme product. The project/subscription model, its pages and its exports are gone.

**Product:** Gidan Daya — the application and allocation system for one scheme: the CBN Staff Multipurpose Cooperative Society estate plots at Gidan Daya, FCT Abuja. 102 residential plots in four sizes (200, 300, 400, 500 sqm) at ₦27,000 per sqm inclusive of infrastructure, a ₦20,000 non-refundable application fee, a 50% deposit due 30 January 2027 and the balance due 30 June 2027. Members apply for a plot and track what they owe; the secretariat reviews the register, records payments and exports the allocation.

**Audience:**
1. Applicant (primary): a cooperative member on a laptop or phone who wants to know which plot sizes remain, what each costs, and what the next payment is.
2. Secretariat / admin (secondary): needs the applicant register, payment verification, cadre-priority ordering and an export of the allocation.

**Goal:** a member can go from "what sizes are left?" to a submitted application in under a minute, and the secretariat can see the allocation and export it in two clicks.

**Source of truth:** `design/SCHEME_FACTS.md`, which records the scheme exactly as the cooperative's *Call for Indication of Interest — Gidan Daya* states it: the 102-plot inventory, the rate per square metre, the fee, the closing and payment dates, the allocation rule, the default/refund/title conditions and the site visits, plus the conflicts the document leaves open. Precedence is **the call document → `SCHEME_FACTS.md` → this brief → the code**; a figure that disagrees with the facts file is a bug, not a preference. Sample availability figures and demo applicants are labelled as sample data, never presented as the cooperative's actual allocation.

## Data model versus the real scheme

The model is judged against `design/SCHEME_FACTS.md`, not against the sample data it ships with. Three buckets:

**Represented 1:1.** Plot inventory (4 × 200, 44 × 300, 44 × 400, 10 × 500 = 102), the ₦27,000/sqm rate inclusive of infrastructure, the non-refundable ₦20,000 fee, the two 4-bedroom designs, applications closing 30 December 2026, the 50% deposit by 30 January 2027 and balance by 30 June 2027, size variation with unconditional refund of excess, default and penalty conditions, the refund conditions (written request, resale first, up to 5%, infrastructure non-refundable, months not guaranteed), title-perfection costs and the temporary/permanent letter rule, the site-visit dates, time and meeting point, and the acceptance statements. Each lives in `src/data/seed.ts`, `src/data/terms.ts` or the migration, and `src/data/scheme.test.ts` pins the seeded figures so drift fails the suite.

**Represented as a decision, because the document contradicts itself.** Allocation says *strictly first-come by payment confirmation* and also *priority to Clerk–Assistant Manager*. The model records the confirmed payment date per application (`confirmedOn`), and applies one of three explicit rules chosen by the secretariat — first-come, payment date then cadre (default), or cadre first. The rule in force is visible to applicants with the reason for their position, and every change is audited. That is the honest treatment of a document that does not say what happens when a senior cadre pays first.

**Deliberately not modelled.** Transfer and assignment, dispute resolution and governing law, cooperative project-loan funding, the construction milestones behind the permanent allocation letter, and the actual penalty rate (the document only says "prevailing project loan rate"). These are listed as gaps in the facts file so the app is not mistaken for a complete implementation of every clause.

**Ours, not the document's.** The evidence-verification workflow, the audit trail, the three-option rule setting, sample applicants and availability, the five-cadre list (the call names only the ends of the priority band), and the 5 MB upload limit. Each is labelled as an addition in the facts file.

## Stack and constraints

- Vite 8 + React 19 + TypeScript 6 (strict), Tailwind 4, React Router 7, TanStack Query 5, React Hook Form + Zod 4.
- Supabase (Postgres + Auth + RLS) is the backend. The hosted project `gidan-daya` (`cqdnioyleasggvqlaept`, eu-west-1) has run both migrations, and Vercel production carries `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` for it, so the deployed app reads and writes the hosted database. Local development still uses the local stack; wherever those variables are absent the app falls back to a clearly labelled sample-data repository. Sample data is labelled in the UI, never presented as real.
- Reports: jsPDF + jspdf-autotable (PDF), ExcelJS (XLSX), both code-split.
- Deployment: Vercel static SPA (`vercel.json` rewrite), build command `npm run build`, output `dist`.
- No invented cooperative facts: no registration numbers, addresses, phone numbers, member counts, testimonials or logos. Copy describes the product's real function only.

## Mode

**Mode: Original** · **Surface: Code-first**

Original because there is no reference the user asked to transfer or replicate, and the product has a specific enough subject (cooperative ledger, naira, units, installments) to synthesise a direction from. No layout, palette or composition was carried over from another project.

## What the user loves / said (their words)

No aesthetic preference was given. The only stated requirements are the twelve capabilities from the setup phase (React/TS, Supabase, Postgres design, RLS, responsive dashboards, forms and validation, secure uploads, PDF+Excel reports, testing, Git/GitHub, API+email, deployment+docs).

## References chosen (principles only)

Read as search results/summaries on 2026-11-18, **not** captured as screenshots. Each gave one transferable principle; none was replicated.

| # | Reference | Why it fits | What to study | Risk |
|---|---|---|---|---|
| 1 | OnePangea — https://onepangea.com/ | Cooperative ERP that shows its own portal as a labelled "management portal · sample data" mock | Frame the real product in the hero; label sample data | ERP copy density, generic SaaS tone — do not copy wording |
| 2 | Eswatini SACCO case study — https://www.lyomu.com/case-studies/eswatini-sacco | SACCO members self-serving balances, contributions and repayments | Membership-first framing; currency and locale honesty | Generic mobile-banking patterns; placeholder-data pitfalls |
| 3 | Monarch spec — https://designmunk.com/monarch | Paper-white ground, deep ink text, one accent, editorial serif at tight tracking, 8px spacing | Paper + ink + single accent; serif/sans division of labour | Consumer-fintech softness; too warm for a financial record |
| 4 | Cooperative Admin case study — https://saheedibikunle.com/designs | Officer-facing cooperative admin: approvals, audit note, permission layers | Paper trail as part of the interaction, not a separate screen | Admin-only framing; ignores the member |

## Direction brief

**Visual thesis:** a cooperative passbook, set in type — warm ledger paper, deep forest ink for structure, one clay accent reserved for "act here", and money always in tabular figures so columns line up like a book of account.

- **Hierarchy:** (1) what plot sizes remain and what they cost, (2) a member's own application and the next payment, (3) everything else (applicants, reports, exports).
- **Type pairing:** Fraunces (variable display serif, `opsz` 9–144, weight 400–900, tight tracking at large sizes) for headings and figures that should feel printed; IBM Plex Sans (400/500/600/700) for UI, tables and body. Money and quantities use `font-variant-numeric: tabular-nums`.
- **Palette with roles:** `paper #F7F3EA` page ground · `paper-2 #FBF8F1` raised surfaces · `ink #1A2420` text · `ink-soft #4A5751` secondary text · `forest #123628` structure, rail, headings · `forest-2 #1C4A36` hover/active structure · `clay #A8452A` primary action and open states · `gold #B8862B` progress fill and "closing soon" · `line #DCD5C4` hairlines · `sage #DDE4DC` tints. Light theme only, committed. Contrast: ink on paper ≈ 13:1, paper on forest ≈ 11:1, paper on clay ≈ 5.6:1, ink-soft on paper ≈ 7:1.
- **Layout idea:** an editorial left column (eyebrow, serif headline, one paragraph, actions, a ruled fact list) against a right-hand **product window** — a hand-coded, interactive replica of the plot screen (switch size, see price, deposit and remaining plots), not a screenshot. In the app, a forest rail runs the height of the page like the spine of a ledger, with a ruled content column.
- **Signature moment:** the **passbook meter** — allocation progress drawn as 24 ruled ticks that fill left to right in forest, with the percentage and the plots taken set in tabular type beside it, and a perforated edge on the final tick. It appears on the landing window, the availability tables and the application page. One signature component; everything else stays quiet.
- **Imagery plan:** no photography exists and none can be invented, so the page is built from type, rules, meters and a live product window — nothing decorative stands in for a photo. A missing-asset list is in `design/ASSETS.md`.
- **Motion language:** 160–220 ms ease-out for state changes, 420 ms staggered rise for entrance of a checkpoint's content, a single 24-tick fill on the meter (600 ms, ease-out). Nothing loops. All motion is suppressed under `prefers-reduced-motion` and essential content is visible without JS.

## Component plan

| Slot | Choice | Why |
|---|---|---|
| Header | Minimal bar (seal + wordmark, 3 links, ghost "Sign in", primary "Apply for a plot") | Calm, product-first; the real seal carries the identity |
| Hero | Split asymmetric: editorial type left, interactive plot window right | Shows the product instead of describing it |
| Proof | **None** — no real logos, counts or quotes exist | Honesty rule: an empty proof strip is worse than none |
| Sections | Plot prices table, two-instalment payment plan (01–03), site visits, conditions | Each answers a real question: what is left, what does it cost, when do I pay, what am I agreeing to |
| Footer | Closing CTA band + quiet minimal footer | Confident close without invented legal details |
| App shell | Forest rail + ruled content column + topbar with closing date and data-mode badge | Dashboard reads like a ledger page |
| Tables | Semantic tables, tabular figures, status pills with text labels | Data density with hierarchy |

## Asset plan / what the user will supply

- **Brand mark:** the cooperative's own seal, supplied by the user, trimmed to the medallion and used in the app rail, the landing header, sign-in, the footer and as the favicon/app icon. Its gold already agrees with the `gold` token, so the palette is unchanged. Everything else shipped is code-drawn (SVG/CSS) or self-hosted type. Photography of the estate and the layout plan is **missing** and is the user's to supply; nothing was faked in its place. See `design/ASSETS.md`.

## Missing assets / open questions

1. Official colour/type guidelines, and a vector or higher-resolution copy of the seal — the supplied file is 200 × 200 px, so larger uses are upscaled.
2. Photography: the Gidan Daya site, the layout plan and the show houses (with permission for the people shown).
3. A Supabase project (URL + anon key) to replace sample data; the initial migration has never been executed, so the schema, RLS and the two public RPCs (`create_public_application`, `get_public_application`) are unverified. Until there is a server-side rate limit, the public RPC is the one place an abuser could create applications in a loop; the consequence is capped by the tier capacity check and by the secretariat verifying every payment before allocation.
4. Official legal/registration details for the footer (none were invented).
5. **Open questions for the cooperative** (full list in `design/SCHEME_FACTS.md` §11): (a) applications close 30 December 2026 but the 50% deposit is not due until 30 January 2027 — does an application without a deposit hold a plot? (b) "first-come by payment confirmation" and priority for Clerk-to-Assistant-Manager cadre can disagree; which wins when a senior cadre pays first? (c) what exactly counts as "payment confirmation" — the fee, the 50% deposit, or full payment? (d) what is the prevailing project loan rate used for default interest?
6. **Bank details are intentionally absent from the repository.** The call names the UBA project account and its number; the number is not committed here. If the app is later asked to display payment instructions, load them from server-side configuration at deployment, never from the repo or the browser bundle.

## Status checklist

| Section | L1 | L2 | L3 | L4 | L5 | Inspected | Drift-checked |
|---|---|---|---|---|---|---|---|
| Landing — header, hero, plot window | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Landing — plot prices, payment plan, site visits, terms, footer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Sign in | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Dashboard overview | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Plot availability | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Apply — plot and details, no account required (validation, live pricing) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Apply — four acceptance clauses, recorded with version and time | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Application receipt (public; reopens with reference + ID number) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Payment evidence upload + secretariat verification + audit note | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Scheme settings — allocation rule with queue preview | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Published content — rate, fee, dates, site visits, notice, plot totals (admin) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| My application + statement PDF | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Applicant register (admin) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| Allocation report + PDF/XLSX exports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ 1440/390 | ✓ |
| 404 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Decision log

- **2026-11-19 — The published content is edited in the portal, not in code.** The rate, the application fee, the four payment dates, the site-visit dates/time/meeting point, the notice banner and the plot totals are now written by the secretariat at `/app/content`. They live on the `scheme` row (new columns for the site visits and notice, migration `20261119120000_scheme_content.sql`) and in local storage in sample mode; one `SchemeProvider` query feeds the landing page, the apply form, the receipt, the dashboard, the report and the PDF/XLSX exports, so a save is visible everywhere at once. Reason: the cooperative revises dates and rates during a scheme, and a code change and redeploy for a date is not a workflow a secretariat can run. Amounts already recorded on an application keep the price they were created at; the database functions still price and validate new applications from the same row, so the app cannot disagree with itself. Limits: `SCHEME` in `src/data/seed.ts` remains the issued record and the test fixture, and the terms clause now refers to "the published rate per square metre" instead of a figure (acceptance text bumped to v2) so a rate change cannot leave a stale number in the acceptance record.

- **2026-11-18 — Applying does not require an account.** The call sets out an application, a non-refundable fee with evidence, and a payment schedule; it never mentions a portal login, and requiring one put a wall in front of the fee. `/apply` and the receipt are public. The form asks for the applicant's full name and cooperative ID number, records them on the application, and the secretariat verifies both against the register and the transfer before any allocation. A matching ID number links the application to that profile so it appears on the member's page if they do sign in, but it is not treated as proof of identity. Signing in stays optional and is how a member attaches payment evidence, follows the balance and downloads a statement. Trust model: an anonymous applicant can claim any ID number, so no payment is credited and no plot allocated without the secretariat's verification — recorded in the audit trail as submitted without signing in.
- **2026-11-18 — The cooperative's seal replaces the invented mark.** The user supplied the seal and asked for the app to be branded with it. It is trimmed from its transparent 200 × 200 WebP to the medallion, rendered at 32–512 px, and used in the rail, landing header, sign-in, footer and as the icon set; the hand-drawn `favicon.svg` was deleted so two marks do not compete. It is used as supplied — not redrawn, recoloured or cropped into a badge. Reason: a real cooperative should look like itself, and an invented mark is a fact the project cannot support. Limitation: the source is 200 px, so large sizes are upscaled.
- **2026-11-18 — The call document is the source of truth, recorded in `design/SCHEME_FACTS.md`.** Facts, the conflicts they contain, the mapping from each fact to code and the deliberate gaps now live in one file; the brief, the data model and the tests are judged against it rather than against invented sample data. `src/data/scheme.test.ts` asserts the seeded figures so a drift fails the build. The document's bank account number is deliberately not copied into the repository: it is a payment destination published in the call, and the app refers members to "the UBA project account in the document".
- **2026-11-18 — Acceptance, evidence and a configurable rule.** Applying is now two steps: plot and details, then four acknowledgement clauses (refunds, default penalties, plot-size variation, title perfection). The clause ids, terms version and timestamp are stored on the application and shown back on it. Payment evidence is attached to an application and reviewed by the secretariat, which records the payment, its confirmation date and an audit entry carrying the reviewer's note. The allocation rule — first-come, date-then-cadre, or cadre-first — is a secretariat setting that orders the queue and is shown to applicants with the reason for their position. Reason: the call's conditions need a record that can be defended, and its two allocation sentences conflict, so the reading has to be explicit and auditable rather than buried in code.
- **2026-11-18 — Evidence in sample mode is a data URL.** With no Supabase Storage, uploads are validated (type, size), kept under 1.5 MB as a preview in local storage, and labelled sample data. In Supabase mode the file goes to a private `payment-evidence` bucket and only the path is stored. Reason: the flow must be demonstrable without a backend, without pretending a real bucket exists.
- **2026-11-18 — Single scheme, not a catalogue.** The user's correction ("just for Gidan Daya subscription") replaced the six-project subscription model with one scheme: four plot tiers priced per square metre, one application per plot, a 50% deposit and a balance, and a secretariat that verifies payments. Reason: the cooperative's call is for one estate, and a multi-project catalogue invented a product that does not exist.
- **2026-11-18 — Sample-data mode.** No Supabase credentials exist, so the repository layer serves labelled sample data and switches to Supabase when env vars are present. Reason: the deliverable must build and deploy, and the UI must never claim live data it does not have.
- **2026-11-18 — No proof strip / no testimonials.** Reason: none are real. Article: honesty rule 4.
- **2026-11-18 — Self-hosted fonts.** Fraunces + IBM Plex Sans downloaded by `scripts/fetch-fonts.mjs` into `public/fonts` (OFL 1.1) rather than loaded from a third-party CDN at runtime. Reason: performance and no runtime dependency.
- **2026-11-18 — No design skills installed.** Hallmark/UI-UX Pro Max/Impeccable were not installed: rule 6 requires approval before installing anything, and the user asked for the build, not new tooling. The two already-installed official Supabase skills were read for the schema/RLS design.
- **2026-11-18 — Kickoff menus answered, not asked.** Mode, surface, components and asset plan were decided here because the user asked for implementation in the same instruction; the brief records each choice so it can be contested.

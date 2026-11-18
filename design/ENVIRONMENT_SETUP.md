# Environment & Skill Setup — CBN Cooperative Project Subscription Management System

**Status:** setup complete, application implementation **not started** (as instructed).
**Date:** 18 November 2026 · **Mode:** environment preparation (AGENTS.md Quick change, reduced build loop).

---

## 1. Environment snapshot (verified by command)

| Item | Value |
|---|---|
| OS / shell | Windows 11, MSYS2 MINGW64 bash (x64) |
| Node.js | v26.13.0 |
| npm | 11.20.0 (registry: registry.npmjs.org) |
| TypeScript | 6.0.3 |
| Docker | 29.5.3, daemon reachable → local Supabase stack is possible |
| Git | 2.56.0.windows.2 — repository initialised, **no commits yet** |
| Git identity | **not set** (`user.name` / `user.email` empty) — required before the first commit |
| Missing CLIs | `gh` (GitHub CLI), Bun, pnpm, yarn |
| Playwright browsers | chromium-1255 + headless shell installed; headless **and** headed launch verified (Chromium 159.0.8154.6) |

## 2. Skill installation methods available on this machine

| Method | What it is | Used here |
|---|---|---|
| Freebuff account skills (Settings → Skills) | Agent-native, available in every chat/device; read with `cloud_read_skill` | Library is **empty**; nothing added (see §8) |
| `npx skills` CLI (skills.sh registry) | Installs Agent Skills (`SKILL.md`) from GitHub repos into agent directories; records `skills-lock.json` | **Used** for the official Supabase pack |
| Global user dir `~/.agents/skills` | 40 skills already present before this task, linked to the Codex agent | **Inspected only**, not modified |
| MCP servers (`~/.agents/mcp.json`) | `supabase` (HTTP, **read-only**, database+docs), `playwright`, `canva` | Pre-existing; not exposed as tools in this chat session |

## 3. Skills installed in this task

| Skill name | Source repository | Purpose | Installation status | Installation location | Dependencies | Verification result |
|---|---|---|---|---|---|---|
| `supabase` | `supabase/agent-skills` (github.com/supabase/agent-skills), commit `c9be0e93`, skill v0.1.2 — official, maintained by Supabase | Any Supabase work: Database, Auth, Edge Functions, Realtime, Storage, `supabase-js` usage, RLS/auth debugging, schema changes, migrations, security audits, logs | **Installed** | Project: `.agents/skills/supabase/` (copied, not symlinked); pinned in `skills-lock.json` | None (instructions + reference docs only; no code executed) | `npx skills list` shows it: `…\.agents\skills\supabase … Source: supabase/agent-skills`. `SKILL.md` read and confirmed to contain the RLS/security and "verify against current docs" rules |
| `supabase-postgres-best-practices` | `supabase/agent-skills`, commit `c9be0e93` — official | Postgres schema design, column types, migrations, indexes, RLS policy patterns and their tests, pg_cron/pgmq/pgvector, query performance and EXPLAIN diagnosis | **Installed** | Project: `.agents/skills/supabase-postgres-best-practices/`; pinned in `skills-lock.json` | None | `npx skills list` shows it with the same source; `SKILL.md` frontmatter verified (64-line skill + reference set) |

Both were installed with `npx -y skills add supabase/agent-skills --all --copy`. Note: `--all` made the CLI scatter copies into ~50 dot-directories for other agents (`.windsurf/`, `.roo/`, `.qwen/`, `.claude/`, …). Those were **deleted**; only `.agents/skills/` was kept.

## 4. Skills already present (not installed in this task)

Global, user-level `~/.agents/skills`, linked to Codex. The skills CLI reports their source as **`untracked`**, so provenance cannot be asserted from local records — only their `SKILL.md` descriptions were verified.

| Skill | Capability it covers | Status | Verification |
|---|---|---|---|
| `vercel-react-best-practices` | React/Next performance, hooks, rendering rules | Present | frontmatter read |
| `vercel-composition-patterns` | Component composition patterns | Present | frontmatter read |
| `shadcn` | shadcn/ui components, theming, registry | Present | frontmatter read |
| `web-design-guidelines` | UI code review vs Web Interface Guidelines | Present | frontmatter read |
| `uxui-audit`, `interface-review`, `explain-interface` | Rendered-interface UX/UI audit | Present | frontmatter read |
| `better-ui`, `better-layout`, `better-typography`, `better-colors`, `better-interface`, `better-accessibility` | Visual/typographic/layout craft | Present | frontmatter read |
| `accessibility` | WCAG 2.2 audit and fixes | Present | frontmatter read |
| `playwright-skill` | Browser automation, responsive checks, screenshots | Present | frontmatter read |
| `performance`, `core-web-vitals`, `seo`, `web-quality-audit`, `website-audit-agent` | Performance/SEO/quality auditing | Present | frontmatter read |
| `deploy-to-vercel` | Deployment to Vercel | Present | frontmatter read |
| `best-practices`, `writing-guidelines` | Security/compat baselines; docs & prose review | Present | frontmatter read |
| 15 × `canva-*` | Canva design/presentation workflows | Present, **not relevant** to this project | frontmatter read |

## 5. Project dependencies installed locally (`.node_modules`, tracked in `package.json`)

| Capability | Packages | Version |
|---|---|---|
| App runtime | `react`, `react-dom` | 19.3.1 |
| Routing | `react-router-dom` | 7.18.5 |
| Supabase client | `@supabase/supabase-js` | 2.119.0 |
| Supabase CLI (migrations, local DB, type gen) | `supabase`, `@supabase/cli-windows-x64` | 3.2.0 |
| Data layer | `@tanstack/react-query` | 5.108.0 |
| Forms + validation | `react-hook-form`, `@hookform/resolvers`, `zod` | 7.92.0 / 7.0.7 / 4.6.7 |
| Styling | `tailwindcss`, `@tailwindcss/vite`, `clsx`, `tailwind-merge`, `lucide-react` | 4.3.5 / 4.3.5 |
| PDF / Excel reports | `jspdf`, `jspdf-autotable`, `exceljs` | 4.2.1 / 5.0.9 / 4.4.0 |
| Dates | `date-fns` | 4.4.0 |
| Build | `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@types/node` | 8.3.8 / 6.3.0 / 6.0.3 |
| Unit/integration tests | `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | 5.1.1 |
| E2E tests | `@playwright/test` | 1.65.1 |
| Quality | `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, `prettier` | 10.15.0 / 3.10.1 |

Files created: `package.json`, `package-lock.json`, `tsconfig.json`, `src/vite-env.d.ts`, `.env.example`, `.gitignore`, `supabase/config.toml`, `skills-lock.json`, `.agents/skills/*`.

`tsconfig.json` is strict (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `verbatimModuleSyntax`) and uses `@/*` → `./src/*` path mapping **without** `baseUrl`, because TypeScript 6 rejects `baseUrl` as deprecated (error TS5101).

## 6. Capability coverage

| # | Required capability | Covered by | Status |
|---|---|---|---|
| 1 | React + TypeScript development | `vercel-react-best-practices`, `vercel-composition-patterns`, `shadcn` + TS/Vite toolchain | Covered |
| 2 | Supabase database and backend | `supabase` skill + `@supabase/supabase-js` + Supabase CLI | Covered |
| 3 | PostgreSQL architecture | `supabase-postgres-best-practices` | Covered |
| 4 | RLS and application security | `supabase` (RLS rules inline) + `best-practices` + Postgres skill policy guidance | Covered |
| 5 | UI/UX, responsive dashboards | `better-*`, `web-design-guidelines`, `uxui-audit`, `accessibility`, `shadcn` | Covered |
| 6 | Forms and validation | `react-hook-form` + `zod` + `@hookform/resolvers` installed; **no dedicated skill** | Dependencies ready, skill gap |
| 7 | Secure file uploads/downloads | `supabase` skill (Storage + signed URLs) | Covered by skill, no code yet |
| 8 | PDF and Excel reports | `jspdf`/`jspdf-autotable`/`exceljs` installed; **no skill** | Dependencies ready, skill gap |
| 9 | Automated testing | `playwright-skill` + Vitest/RTL/Playwright installed and launch-verified | Covered |
| 10 | Git and GitHub | Git 2.56 installed, repo initialised; `gh` absent; **no skill** | Partial — see §8 |
| 11 | API and email integration | `supabase` skill covers Edge Functions/API; email provider not chosen | Partial |
| 12 | Deployment and documentation | `deploy-to-vercel` + `writing-guidelines` | Covered (deployment target unconfirmed) |

## 7. Verification performed

| Check | Command | Result |
|---|---|---|
| TypeScript config compiles | `npx tsc --noEmit` | **Pass** (exit 0) |
| Vite | `npx vite --version` | 8.3.8 |
| Vitest | `npx vitest --version` | 5.1.1 |
| ESLint | `npx eslint --version` | 10.15.0 |
| Supabase CLI | `npx supabase --version` → **3.2.0**; `npx supabase init` wrote `supabase/config.toml` | **Pass** |
| Skill discovery | `npx skills list` (project scope) | **Pass** — both Supabase skills listed with path + source |
| Skill instructions reviewed | read both `SKILL.md` files | **Done** before use, per instruction 5 |
| Playwright browser | `npx playwright install chromium` (exit 0) + launch smoke test | **Pass** — `headless ok: ok \| chromium 159.0.8154.6` and `headed ok: ok` |
| Local Supabase stack | `supabase start` | **Not run** — pulls multi-GB images; Docker is ready when needed |

Issues found and fixed during setup:
1. **Truncated npm binary** — `@supabase/cli-windows-x64@3.2.0` first resolved to a 56 MB corrupt `supabase.exe` (`spawn EFTYPE`). Deleting and reinstalling produced the correct 143 MB binary that runs.
2. **npm 11 install-script gating** — Supabase's setup was blocked until `npm install-scripts approve supabase` (recorded in `package.json` → `allowScripts`).
3. **`baseUrl` deprecated in TypeScript 6** — removed from `tsconfig.json`.
4. **Skills CLI scatter** — removed ~50 stray per-agent dot-directories created by `--all`.

## 8. Gaps and recommendations

| Gap | Why it matters | Recommendation |
|---|---|---|
| No Git/GitHub skill; `gh` missing | PR/issue workflow stays manual | Install GitHub CLI (`winget install GitHub.cli` — winget failed from this network during setup, retry later), then set `git config --global user.name/user.email`. A community `git-workflow` skill exists (`hjewkes/agent-skills`) but is **third-party and unreviewed** — approve before installing |
| No forms skill | RHF + Zod conventions could drift | Official React Hook Form + Zod docs are authoritative here. `PyModel/react-frontend-skills` bundles react/typescript/tailwind/RHF/Zod lessons but is third-party and unverified — optional |
| No PDF/Excel skill | Report layout decisions not guided | `anthropics/skills` ships `pdf` and `xlsx` skills, but they are **Python**-oriented (pypdf/openpyxl) and do not match a browser-side jsPDF/ExcelJS stack — deliberately not installed |
| No email-integration skill | Email sending will need a provider + Edge Function | Decide the provider during the build phase; the `supabase` skill already covers Edge Function deployment and secrets |
| Account skill library empty | Supabase skills are workspace files, not registered account skills | Optionally mirror them into Settings → Skills so they auto-load in every chat; say so and I will do it |
| Supabase MCP not invocable here | The configured MCP server is `read_only` and not exposed as tools in this session | Use the Supabase CLI (`npx supabase …`) or the dashboard; enable the MCP server via the agent's MCP config if live schema reads are wanted |

## 9. Deliberately not done

- No React components, routes, pages, schema, migrations or RLS policies — implementation is gated on this report's approval.
- No commits made; repository is initialised but empty of history.
- No global npm installs; no account/global skill was overwritten or removed.

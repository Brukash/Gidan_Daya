# SCHEME FACTS — Gidan Daya (source of truth)

**What this file is:** the facts of the cooperative's scheme, extracted from the call document, so the app, its data model and its copy can be judged against the real scheme rather than against invented sample data.

**Source document:** *Call for Indication of Interest — CBN Staff Multipurpose Cooperative Society Estate, Gidan Daya, near Loyola Jesuit College, FCT, Abuja*, issued by the Management Committee of the CBN Staff Multipurpose Cooperative Society Limited. Read from the copy the user attached to this project (extracted text, `.cloud-attachments/1a4b8d911aec49d880c08b321256c327a71956258417a6853787520b93754c0d.txt`) on 2026-11-18.

**Status of the values:** every figure below is taken from that document and quoted or paraphrased from it. Items marked **[derived]** are arithmetic on those figures (the document does not print them). Items marked **[assumption]** are ours and are recorded as such — they are not the cooperative's facts.

**Precedence:** the document itself outranks this file; this file outranks `PROJECT_BRIEF.md`, which outranks the code. If the cooperative issues a revised call, update this file first, then the brief, then the code and tests.

---

## 1. The scheme

| Fact | Value |
|---|---|
| Estate | CBN Staff Multipurpose Cooperative Society Estate, Gidan Daya, near Loyola Jesuit College, FCT, Abuja |
| Purpose | Residential |
| Infrastructure | Already existing on site; the cooperative provides further infrastructure **on a best-efforts basis**, subject to available funds, government approvals and market conditions |
| Funding | Self-funded — direct subscriber payments, loans, or a mix; members funding with the Coop Project Loan must meet the loan's own terms |
| Eligible applicant | A member of the cooperative ("eligible members" are invited to indicate interest); the cooperative reserves the right to determine other terms of eligibility |
| House designs | 1. 4-bedroom semi-detached duplex · 2. 4-bedroom detached duplex |

## 2. Plot sizes and counts

| Plot size | Number of units |
|---|---|
| 200 sqm | 4 |
| 300 sqm | 44 |
| 400 sqm | 44 |
| 500 sqm | 10 |
| **Total** | **102** |

- Sizes range from 200 sqm to 500 sqm.
- **Variation:** sizes are subject to the size actually allocated, based on the approved survey, regulatory requirements or other justified reasons.
- **Reconciliation:** additional square metres are payable by the subscriber; payments in excess of the allotted plot size are **refunded unconditionally**.

## 3. Cost and payment plan

| Fact | Value |
|---|---|
| Rate | **₦27,000 per sqm**, inclusive of infrastructure |
| 50% initial deposit | **on or before 30 January 2027** |
| 50% balance | **30 June 2027** |
| Application fee | **₦20,000**, **non-refundable**, paid to the designated project account, with **evidence of payment attached** to the application |
| Applications close | **30 December 2026** |
| Payment method | Transfer only, in line with the cashless policy (**no cash**) |
| Reference on transfer | The applicant's **ID number and name** must appear in the payment narration |

**[derived]** At ₦27,000/sqm:

| Plot | Price | 50% deposit | Balance |
|---|---|---|---|
| 200 sqm | ₦5,400,000 | ₦2,700,000 | ₦2,700,000 |
| 300 sqm | ₦8,100,000 | ₦4,050,000 | ₦4,050,000 |
| 400 sqm | ₦10,800,000 | ₦5,400,000 | ₦5,400,000 |
| 500 sqm | ₦13,500,000 | ₦6,750,000 | ₦6,750,000 |

**[derived]** Total inventory 36,600 sqm (4×200 + 44×300 + 44×400 + 10×500) ⇒ **₦988,200,000** at the published rate.

**Bank details:** the document names the account "CBN STAFF MULTIPURPOSE COOP SOCIETY LTD - Project Acct" at UBA, with an account number. **The account number is deliberately not copied into this repository** — it is published in the call document, and a public repository is the wrong place for a payment destination that members might mistype or that could be swapped. The app refers to "the UBA project account in the document" and never prints an account number itself.

## 4. Allocation

1. Allocation is **strictly first-come, first-served, determined by payment confirmation**.
2. **Priority** is given to members in the **lower cadre — Clerk to Assistant Manager**.
3. The cooperative may determine other terms of eligibility.
4. The cooperative may adjust plot sizes based on the approved survey, regulatory requirements or other justified reasons.
5. Variations are reconciled: extra square metres are payable, and excess payments are refunded unconditionally.

## 5. Default and penalties

1. Failure to pay on schedule constitutes **default**.
2. Default attracts **penalties, including administrative charges and/or interest on the outstanding amount at the prevailing project loan rate**.
3. After default the cooperative **may reallocate the plot without further notice**.

## 6. Refunds

1. Refunds require a **written request**; they are **not automatic**.
2. A refund happens **only after the cooperative successfully reallocates or resells the plot**.
3. Refunds are subject to **penalties and administrative charges of up to 5% of the amount paid**.
4. **Infrastructure funds already applied to site works are non-refundable.**
5. The cooperative **does not guarantee a timeline** for resale or refund; refunds **may take several months** depending on market conditions.

## 7. Title perfection

1. **Temporary** allocation letters are issued **after full payment**.
2. **Permanent** allocation letters are issued **on 100% completion of the buildings**.
3. The **subscriber bears all statutory costs of perfecting title**, including file opening, survey fees, ground rent, stamp duties, registration fees, consent fees, legal documentation and **FCTA charges**.
4. The cooperative is **not liable for delays caused by government agencies**.

## 8. Variation, transfer, disputes, governing law

- **Project variation:** the cooperative may vary layout, house types, plot sizes, infrastructure rates or timelines where required by regulatory directives, planning approvals or project realities. The subscriber **waives any claim for damages** arising from such variations.
- **Transfer / assignment:** only with the cooperative's **written approval**; complete on **registration with the cooperative**; all sums owed must be **fully settled** first; **prevailing transfer charges** apply.
- **Dispute resolution:** internal resolution first, otherwise through the **Office of the Director of Cooperatives, FCT**, and/or **mandatory arbitration in FCT Abuja**, with a jointly appointed arbitrator whose decision is final and binding.
- **Governing law:** the laws of the Federal Republic of Nigeria, applicable in the FCT.
- **Other terms:** the cooperative may vary the terms of the notification at any time; changes are communicated to all subscribers.

## 9. Site visits

| Fact | Value |
|---|---|
| Dates | **Saturday 28 November 2026** and **Saturday 5 December 2026** |
| Time | From **10:00 am** |
| Meeting point | **The National Ecumenical Centre, opposite CBN Head Office back entrance, CBD, FCT Abuja** |

## 10. Acceptance

By submitting an application the subscriber confirms that they have read and understood the agreement, accept all risks associated with land investment, relied on no verbal assurances or representations, and agree to the agreement's conditions.

---

## 11. Conflicts and ambiguities in the source

These are unresolved in the document itself. The app must not silently pick a side.

1. **Two closing dates.** Applications close **30 December 2026**, but the 50% deposit is due **30 January 2027**. The document does not say whether an application without a deposit holds a plot.
2. **First-come versus cadre priority.** Allocation is "strictly first-come… determined by payment confirmation" **and** "priority will be given to members in the lower cadre". It does not say what happens when a Manager pays before a Clerk. The app exposes this as a secretariat setting with three readings (see §12).
3. **"Payment confirmation" is undefined.** It is not stated whether the fee, the 50% deposit, or full payment fixes a position. The app treats the **confirmed 50% deposit** as the confirming payment and records the date.
4. **Fee evidence.** The document asks for evidence of the ₦20,000 fee to be attached to the application; the app records the fee as paid at submission and lets the applicant upload the receipt for verification. An applicant who does not sign in has no upload path from the browser, so the secretariat verifies those applications from the transfer itself — the evidence requirement is met at the desk, not in the form.
5. **"Up to 5%"** is a ceiling, not a fixed rate; the penalty actually charged is at the cooperative's discretion.
6. **"Prevailing project loan rate"** is not stated anywhere in the document.
7. **Cadre list.** The document names only the two ends of the priority band. The app's five cadres (Clerk, Executive Officer, Assistant Manager, Manager, Senior Manager) are an **[assumption]** used to place applicants inside the band.
8. **Permanent allocation** depends on 100% building completion, which is a construction milestone the document does not define further.

## 12. Where each fact lives in the app

| Fact | Code | Status |
|---|---|---|
| 102 plots: 4 / 44 / 44 / 10 | `src/data/seed.ts` `SAMPLE_TIERS`; `plot_tiers` table; `src/lib/allocations.ts` `schemeTotals` | Modelled (counts are real; `allocated` is sample data) |
| ₦27,000 per sqm | `SCHEME.pricePerSqm`, `priceForPlot()`, `scheme.price_per_sqm` | Modelled |
| Plot prices and deposits | `priceForPlot()`, `depositFor()` | Modelled (derived) |
| ₦20,000 non-refundable fee | `SCHEME.applicationFee`, payment schedule, application record `fee_paid` | Modelled |
| Close 30 Dec 2026 | `SCHEME.closesOn`; blocks applications after the date in the RPC | Modelled |
| Deposit by 30 Jan 2027, balance 30 Jun 2027 | `SCHEME.depositDueOn` / `balanceDueOn`; payment schedule | Modelled |
| Two 4-bedroom designs | `HouseDesign`, `HOUSE_DESIGNS`, `applications.house_design` | Modelled |
| First-come by payment confirmation | `confirmedOn`, `allocationOrder()`, queue on Reports and the application page | Modelled (as a configurable rule) |
| Lower-cadre priority | `hasPriority()`, all three `POLICY_OPTIONS` | Modelled (as a configurable rule) |
| Size variation and reconciliation | Copy on landing, plots and apply; clause `variation` in `src/data/terms.ts` | Modelled as terms + copy |
| Default and penalties | Clause `default`; landing conditions | Modelled as terms |
| Refund policy (written request, resale, up to 5%, infrastructure non-refundable, months) | Clause `refunds`; landing conditions | Modelled as terms |
| Title perfection costs and letters | Clause `title`; landing conditions | Modelled as terms |
| Site visits, dates, time, meeting point | `SITE_VISIT`; landing section | Modelled |
| Acceptance statements (§10) | `TERMS_VERSION`, `accepted_clauses` | **Partially modelled** — the four money conditions are acknowledged one by one; the document's four blanket confirmations (understood, accepts land-investment risk, no verbal assurances, agrees to the conditions) are shown as the reason for the step but not asked as separate ticks |
| Payment narration must carry ID and name | Copy in apply and evidence sections | Modelled as guidance |
| Transfer / assignment rules | — | **Not modelled** |
| Dispute resolution and governing law | — | **Not modelled** |
| Infrastructure best-efforts, project variation waiver | Partial: variation sentence on landing | **Partially modelled** |
| Coop project loan funding | — | **Not modelled** |
| Building completion to 100% for the permanent letter | — | **Not modelled** (no construction milestones) |

**Deliberate additions that are not in the document** (ours, and labelled as such): sample availability counts; the demo applicants; the secretariat's evidence-verification workflow and audit trail; the three-option allocation setting; the five-cadre list; a 5 MB upload limit and accepted file types.

**Known gap in the acceptance step:** the call's four blanket confirmations in §10 are not captured as separate acknowledgements — only the four money conditions are. If the cooperative wants §10 recorded verbatim, it becomes a fifth clause and a bump to `TERMS_VERSION`.

## 13. Keeping the code honest

`src/data/scheme.test.ts` asserts the seed constants against the figures in §2–§4 and §9, so a drift between this file and the app fails the test suite. `src/lib/allocations.test.ts` asserts the pricing arithmetic and the 102-plot inventory. Update both when the cooperative revises the call.

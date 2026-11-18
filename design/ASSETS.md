# ASSET PLAN

| Section | Visual needed | Source | Status | Licence |
|---|---|---|---|---|
| Global | Display + UI typefaces | `scripts/fetch-fonts.mjs` → `public/fonts/*.woff2` (Google Fonts CSS API) | Shipped, self-hosted | SIL Open Font License 1.1 |
| Global | Favicon / mark | Hand-authored SVG (`public/favicon.svg`) | Shipped | Original work for this project |
| Landing hero | Product window (plot sizes, passbook meters, prices) | Built in code from the sample-data set; interactive, labelled "Sample data" | Shipped | Original work |
| Landing steps | Numerals, rules, arrows | CSS + SVG drawn to the token palette | Shipped | Original work |
| Landing ledger | Funding table with passbook meters | Data table component over sample data | Shipped | Original work |
| Secretariat panel | Reconciliation / approvals list | Code-drawn UI replica over sample data | Shipped | Original work |
| Dashboard | KPI figures, funding trend | Hand-authored SVG chart (no chart library) | Shipped | Original work |
| Throughout | Icons | Inline SVG paths, 1.5px stroke (no icon pack) | Shipped | Original work |

## Missing — only the user can supply

| Need | Why it matters | Status |
|---|---|---|
| Cooperative logo (SVG) | The wordmark is currently set in Fraunces, not a logo | Missing — placeholder is honest type, not a fake mark |
| Photography: the Gidan Daya site, layout plan, show houses, secretariat at work | A land offering is more credible when buyers can see the land | Missing — no stock people were substituted, because presenting stock as members would be false |
| Official colour / type guidelines | If CBN Cooperative has brand rules, they outrank this palette | Missing |
| Legal details: registration number, address, support hours | Required for a trust footer in finance | Missing — footer uses functional links only, no invented details |
| Supabase project URL + anon key | Switches the app from sample data to live data | Missing |

## Rules applied

- No photograph is presented as a member, staff or event unless it is real and licensed.
- No logo strip: there are no real partners or customers to show.
- Every number rendered in the UI comes from the seeded sample set and is labelled as sample data; none is a claim about the cooperative.

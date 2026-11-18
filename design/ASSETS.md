# ASSET PLAN

| Section | Visual needed | Source | Status | Licence |
|---|---|---|---|---|
| Global | Display + UI typefaces | `scripts/fetch-fonts.mjs` → `public/fonts/*.woff2` (Google Fonts CSS API) | Shipped, self-hosted | SIL Open Font License 1.1 |
| Global | Cooperative seal | **Supplied by the user in this chat** as a 200 × 200 WebP with a transparent background; trimmed to the medallion and rendered at 32/64/180/192/512 px by `scripts/brand-assets.mjs` into `public/brand/` | Shipped | User-supplied; the user asked for it to be used as the app's mark. No formal licence statement was supplied, so no third-party claim is made about it. |
| Global | Favicon + app icons | `public/brand/coop-seal-{32,64,180}.png` | Shipped; the earlier hand-drawn `public/favicon.svg` was deleted rather than left as a competing mark | Same as above |
| Landing hero | Product window (plot sizes, passbook meters, prices) | Built in code from the sample-data set; interactive, labelled "Sample data" | Shipped | Original work |
| Landing steps | Numerals, rules, arrows | CSS + SVG drawn to the token palette | Shipped | Original work |
| Landing prices / app tables | Plot inventory and passbook meters | Data table and meter component over sample data | Shipped | Original work |
| Landing visits | Meeting-point card | Code-drawn card, no map tile | Shipped | Original work |
| Apply | Term cards, stepper, pricing sidebar | Code-drawn from `src/data/terms.ts` | Shipped | Original work |
| Throughout | Icons | Inline SVG paths, 1.5px stroke (no icon pack) | Shipped | Original work |
| Exports | Statement PDF, register PDF, allocation workbook | Generated in the browser (jsPDF, ExcelJS) with the cooperative named in the header; **no logo image in the exports yet** | Shipped | Original work |

## Missing — only the user can supply

| Need | Why it matters | Status |
|---|---|---|
| Photography: the Gidan Daya site, layout plan, show houses, secretariat at work | A land offering is more credible when buyers can see the land | Missing — no stock people were substituted, because presenting stock as members would be false |
| Official colour / type guidelines | If the cooperative has brand rules, they outrank this palette. The seal's gold already matches the app's `gold` token, but that is our reading, not a guideline | Missing |
| Higher-resolution seal | The supplied file is 200 × 200 px, so the 512 px and 180 px icons are upscaled and slightly soft at large sizes. A vector or 1000 px original would sharpen the landing header and any print use | Missing |
| Legal details: registration number, address, support hours | Required for a trust footer in finance | Missing — footer uses functional links only, no invented details |
| Supabase project URL + anon key | Switches the app from sample data to live data | Missing |

## Rules applied

- No photograph is presented as a member, staff or event unless it is real and licensed.
- The logo is used as supplied, not redrawn or recoloured; it is only trimmed and resized.
- No logo strip: there are no real partners or customers to show.
- Every number rendered in the UI comes from the seeded sample set and is labelled as sample data; none is a claim about the cooperative.

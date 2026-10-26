# Phase 3 — Supervisor Clinical Review Checklist

Five master medication drafts were prepared from official UK eMC SmPC sources for **local admin workspace review only**.

- Record status: **draft** (not hospital-approved, not published)
- Monograph sections: **draft / unpublished** (not visible on the public site until section approve & publish + drug export)
- Hospital formulary availability: **OFF** for all four hospitals
- Medication alert classification: **unspecified** (no High Alert / LASA / Hazardous / Low labels assigned)
- No medication photographs added

## Source verification (retrieved for this phase)

| # | Generic (master) | Reference product | Manufacturer (eMC) | eMC URL | eMC last updated | SmPC text revision |
|---|------------------|-------------------|--------------------|---------|------------------|--------------------|
| 1 | Apixaban | Eliquis 5 mg film-coated tablets | Bristol-Myers Squibb-Pfizer | https://www.medicines.org.uk/emc/medicine/27220 | 17 Aug 2026 | 28/07/2026 |
| 2 | Adalimumab | Humira 40 mg solution for injection in pre-filled pen | AbbVie Ltd | https://www.medicines.org.uk/emc/product/7986/smpc | 16 Feb 2026 | 06 Feb 2026 |
| 3 | Aspirin | Aspirin 75 mg gastro-resistant tablets | Dexcel Pharma Ltd | https://www.medicines.org.uk/emc/product/2614/smpc | 16 Oct 2026 | 09/10/2026 |
| 4 | Paracetamol | Paracetamol 500 mg tablets | Flamingo Pharma (UK) Ltd | https://www.medicines.org.uk/emc/product/101491/smpc | 24 Oct 2025 | 06/10/2025 |
| 5 | Metformin | Glucophage 500 mg film-coated tablets | Merck / Merck Serono Ltd | https://www.medicines.org.uk/emc/product/987/smpc | 22 Dec 2025 | November 2025 |

Stable draft IDs: `drug-hhc-apixaban`, `drug-hhc-adalimumab`, `drug-hhc-aspirin`, `drug-hhc-paracetamol`, `drug-hhc-metformin`.

## Must verify before any public clinical use

### Cross-cutting

- [ ] Confirm each SmPC URL still matches the intended licensed product (strength, form, MAH).
- [ ] Re-check eMC revision dates; update monograph if the SmPC changed after this draft.
- [ ] Confirm summaries are accurate for **local practice** (UK SmPC wording may differ from Saudi/SFDA labelling).
- [ ] Decide institutional High Alert / LASA / Hazardous / Low classifications (left unspecified).
- [ ] Assign hospital ON/OFF availability explicitly (all currently OFF).
- [ ] Approve individual monograph sections, then drug workflow, then export → import-catalog → deploy.
- [ ] Confirm therapeutic class taxonomy names (including new “Immunosuppressants” for adalimumab).
- [ ] Confirm brand display names for multi-source molecules (especially aspirin/paracetamol generics).

### Apixaban (`drug-hhc-apixaban`)

- [ ] NVAF 5 mg BID and 2.5 mg BID dose-reduction criteria (age / weight / creatinine).
- [ ] VTE 10→5 mg and secondary-prevention 2.5 mg schedules.
- [ ] Renal (including CrCl &lt;15 / dialysis not recommended) and hepatic contraindications.
- [ ] Peri-procedural hold timing (24 h / 48 h) and restart messaging.
- [ ] Whether local formulary stocks 2.5 mg as well as 5 mg.
- [ ] Reversal-agent availability wording for local pathways.

### Adalimumab / Humira (`drug-hhc-adalimumab`)

- [ ] Adult indication list completeness vs full Humira SmPC.
- [ ] Adult dosing table summaries (RA, SpA/PsA, psoriasis, HS, Crohn’s, UC, uveitis).
- [ ] **Paediatric regimens** (intentionally not fully reproduced — must be completed from SmPC if needed).
- [ ] TB screening / infection / heart-failure contraindication content.
- [ ] Pregnancy contraception (5 months) and infant live-vaccine (5 months) advice.
- [ ] Device/strength interchangeability (pen 40 mg/0.4 mL vs other Humira presentations).
- [ ] Biosimilar policy: this draft is originator Humira-specific.

### Aspirin (`drug-hhc-aspirin`)

- [ ] Secondary-prevention indication only (not analgesic dosing).
- [ ] Gastro-resistant administration (swallow whole).
- [ ] Age &lt;16 / Reye’s messaging.
- [ ] Pregnancy dose thresholds (including &gt;100 mg/day third-trimester contraindication).
- [ ] Lactose excipient warning.
- [ ] Local preferred aspirin product may differ from Dexcel 75 mg GR tablets.

### Paracetamol (`drug-hhc-paracetamol`)

- [ ] **Resolve internal SmPC dosing tension:** age table allows up to 8 doses/24 h (≥16 y, every 3 h) while general text says max 4 doses/24 h every 4–6 h. Choose local standard before publication.
- [ ] Paediatric fraction dosing from the SmPC table.
- [ ] Overdose / N-acetylcysteine referral messaging.
- [ ] HAGMA / flucloxacillin caution.
- [ ] Sodium metabisulphite hypersensitivity note.
- [ ] Confirm Flamingo Pharma product is the intended reference vs local tendered brands.

### Metformin (`drug-hhc-metformin`)

- [ ] GFR-banded maximum daily doses and GFR &lt;30 contraindication.
- [ ] Lactic acidosis sick-day / contrast / surgery stop-restart rules.
- [ ] Pregnancy vs breast-feeding recommendations (breast-feeding not recommended per this SmPC).
- [ ] Vitamin B12 monitoring expectation.
- [ ] Whether 850 mg (also in same SmPC) should appear as an additional formulation locally.
- [ ] Confirm Glucophage vs local generic metformin hydrochloride products.

## Explicitly out of scope for this draft (do not invent)

- Hospital stock / ward availability
- Local P&T approvals, fees, REMS-equivalents, or restricted-antimicrobial-style rules unless institutionally documented
- Non-reference dosage forms mixed into the same master record without documentation
- Fabricated packaging images
- Published public monograph sections without supervisor section approval

## Suggested admin workflow after approval

1. Open each draft under **Manage Drugs** (local admin).
2. Edit any clinically corrected text.
3. Set hospital formulary toggles ON only where approved.
4. Approve & publish monograph sections intentionally.
5. Complete drug review/publish workflow.
6. **Settings → Export catalog** → `npm run import-catalog` → commit → deploy GitHub Pages.

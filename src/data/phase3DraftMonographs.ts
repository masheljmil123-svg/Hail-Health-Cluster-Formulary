/**
 * Phase 3 — five master medication drafts for supervisor clinical review.
 *
 * Sources: official UK eMC SmPC pages (retrieved Oct 2025 / product revision dates below).
 * Status: draft only. Sections are unpublished. Hospital formulary assignments default OFF.
 * Institutional alert classifications are intentionally unspecified pending supervisor approval.
 *
 * Do not use legacy demo IDs (drug-apixaban, drug-metformin, etc.) — those are purged.
 */

import { createDefaultMonographSections } from '@/config/monograph';
import { DEFAULT_HOSPITALS } from '@/config/hospitals';
import { newId } from '@/lib/format';
import { bullets, heading, linkParagraph, paragraph, richDoc, table } from '@/lib/richDocBuilders';
import type {
  ContentState,
  DosingEntry,
  Drug,
  DrugFormulation,
  HospitalDrugAssignment,
  MonographSection,
  RichDoc,
} from '@/types';

export const PHASE3_DRAFT_DRUG_IDS = [
  'drug-hhc-apixaban',
  'drug-hhc-adalimumab',
  'drug-hhc-aspirin',
  'drug-hhc-paracetamol',
  'drug-hhc-metformin',
] as const;

type SourceMeta = {
  productName: string;
  manufacturer: string;
  url: string;
  emcLastUpdated: string;
  textRevisionDate: string;
  atc?: string;
};

function allHospitalsOff(): HospitalDrugAssignment[] {
  return DEFAULT_HOSPITALS.map((hospital) => ({
    hospitalId: hospital.id,
    enabled: false,
  }));
}

function dose(
  partial: Omit<DosingEntry, 'id'> & { id?: string },
): DosingEntry {
  return { id: partial.id ?? newId('dose'), ...partial };
}

function form(partial: Omit<DrugFormulation, 'id'> & { id?: string }): DrugFormulation {
  return { id: partial.id ?? newId('form'), ...partial };
}

function fillSection(
  sections: MonographSection[],
  key: string,
  richText: RichDoc | null,
  structured?: MonographSection['structured'],
): MonographSection[] {
  return sections.map((section) => {
    if (section.key !== key) return section;
    const next: MonographSection = {
      ...section,
      status: 'draft',
      publishedContent: null,
    };
    if (section.contentType === 'structured') {
      next.structured = {
        ...(section.structured ?? {}),
        ...(structured ?? {}),
      };
      next.richText = null;
    } else {
      next.richText = richText;
    }
    return next;
  });
}

function referenceDoc(source: SourceMeta): RichDoc {
  return richDoc(
    heading(3, 'Primary SmPC reference'),
    paragraph(
      `Reference product: ${source.productName}. Marketing authorisation holder / company (eMC): ${source.manufacturer}.`,
    ),
    paragraph(`eMC last updated: ${source.emcLastUpdated}. SmPC text revision date: ${source.textRevisionDate}.`),
    ...(source.atc ? [paragraph(`ATC code: ${source.atc}.`)] : []),
    linkParagraph('Open full eMC SmPC', source.url, ' — review the complete document before clinical use.'),
    paragraph(
      'This monograph is an original clinical summary for institutional review. It does not reproduce the SmPC verbatim and is not a substitute for the licensed product information.',
    ),
    paragraph(
      'Hospital formulary availability, high-alert/LASA/hazardous classifications, fees, and local protocols are not asserted here and require separate institutional approval.',
    ),
  );
}

function buildMonograph(input: {
  brandNames: string[];
  synonyms: string[];
  therapeuticClass: string;
  source: SourceMeta;
  sections: Record<string, RichDoc | { structured: MonographSection['structured'] }>;
}): MonographSection[] {
  let sections = createDefaultMonographSections({
    brandNames: input.brandNames,
    synonyms: input.synonyms,
    therapeuticClass: input.therapeuticClass,
  });

  sections = fillSection(sections, 'brand-name', richDoc(paragraph(input.brandNames.join(', '))));
  sections = fillSection(sections, 'synonyms', richDoc(paragraph(input.synonyms.join('; '))));
  sections = fillSection(sections, 'therapeutic-class', richDoc(paragraph(input.therapeuticClass)));
  sections = fillSection(sections, 'guidelines-protocols', referenceDoc(input.source));

  for (const [key, value] of Object.entries(input.sections)) {
    if (value && typeof value === 'object' && 'structured' in value) {
      sections = fillSection(sections, key, null, value.structured as MonographSection['structured']);
    } else {
      sections = fillSection(sections, key, value as RichDoc);
    }
  }

  // Medication safety: leave institutional flags OFF; note pending review.
  sections = fillSection(sections, 'medication-safety', null, {
    highAlert: false,
    lasa: false,
    hazardous: false,
    notes:
      'Institutional High Alert / LASA / Hazardous classifications are not assigned. Supervisor must apply approved local medication-safety policy before publication.',
  });

  sections = fillSection(sections, 'fee', null, { applicable: null });

  return sections;
}

function baseDrug(
  partial: Pick<Drug, 'id' | 'genericName'> &
    Partial<Omit<Drug, 'id' | 'genericName'>> & {
      brandNames: string[];
      synonyms: string[];
      pharmacologicalClass: string;
      therapeuticClass: string;
      keywords: string[];
      indicationsSummary: string;
      formulations: DrugFormulation[];
      dosingEntries: DosingEntry[];
      monographSections: MonographSection[];
    },
): Drug {
  return {
    therapeuticClassIds: [],
    hospitalAssignments: allHospitalsOff(),
    images: [],
    relatedResourceIds: [],
    references: [],
    safetyFlags: [],
    hasBoxedWarning: false,
    alertClassification: 'unspecified',
    publishedAlertClassification: 'unspecified',
    formularyStatus: 'pending',
    feeApplicable: null,
    lastUpdated: '2026-10-25',
    lastReviewedAt: '2026-10-25',
    version: '0.1-draft',
    status: 'draft',
    reviewHistory: [],
    authorLabel: 'Phase 3 eMC draft preparation',
    ...partial,
  };
}

/* -------------------------------------------------------------------------- */
/* 1. Apixaban — Eliquis 5 mg film-coated tablets                             */
/* -------------------------------------------------------------------------- */

const APIXABAN_SOURCE: SourceMeta = {
  productName: 'Eliquis 5 mg film-coated tablets',
  manufacturer: 'Bristol-Myers Squibb-Pfizer',
  url: 'https://www.medicines.org.uk/emc/medicine/27220',
  emcLastUpdated: '17 Aug 2026',
  textRevisionDate: '28/07/2026',
  atc: 'B01AF02',
};

function createApixaban(): Drug {
  const brandNames = ['Eliquis'];
  const synonyms = ['Factor Xa inhibitor', 'DOAC', 'direct oral anticoagulant'];
  const therapeuticClass = 'Anticoagulants';

  return baseDrug({
    id: 'drug-hhc-apixaban',
    genericName: 'Apixaban',
    brandNames,
    synonyms,
    pharmacologicalClass: 'Direct Factor Xa inhibitor',
    therapeuticClass,
    keywords: ['apixaban', 'eliquis', 'doac', 'nvaf', 'dvt', 'pe', 'anticoagulant'],
    indicationsSummary:
      'Draft summary (Eliquis 5 mg SmPC): prevention of stroke/systemic embolism in adult NVAF with risk factors; treatment of DVT/PE and prevention of recurrent DVT/PE in adults. Supervisor review required before publication.',
    formulations: [
      form({
        id: 'form-hhc-apixaban-5',
        dosageForm: 'Tablet',
        route: 'Oral',
        strengthValue: '5',
        strengthUnit: 'mg',
        notes: 'Reference product: Eliquis 5 mg film-coated tablets (pink, oval, debossed 894 / 5). Contains lactose.',
      }),
      form({
        id: 'form-hhc-apixaban-25',
        dosageForm: 'Tablet',
        route: 'Oral',
        strengthValue: '2.5',
        strengthUnit: 'mg',
        notes: 'Dose-reduction strength referenced in the same SmPC family for NVAF criteria / VTE recurrence prevention — confirm local stock separately.',
      }),
    ],
    dosingEntries: [
      dose({
        id: 'dose-hhc-apix-nvaf',
        indication: 'NVAF — stroke / systemic embolism prevention',
        population: 'Adults',
        dose: '5',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: 'Twice daily',
        notes: 'Reduce to 2.5 mg twice daily if ≥2 of: age ≥80 y, body weight ≤60 kg, serum creatinine ≥1.5 mg/dL (133 µmol/L).',
        references: APIXABAN_SOURCE.url,
      }),
      dose({
        id: 'dose-hhc-apix-vte-acute',
        indication: 'Treatment of acute DVT / PE',
        population: 'Adults',
        dose: '10 then 5',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: '10 mg twice daily for 7 days, then 5 mg twice daily',
        maximumDose: '20 mg/day during first 7 days',
        references: APIXABAN_SOURCE.url,
      }),
      dose({
        id: 'dose-hhc-apix-vte-prev',
        indication: 'Prevention of recurrent DVT / PE',
        population: 'Adults after ≥6 months treatment',
        dose: '2.5',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: 'Twice daily',
        notes: 'Initiate 2.5 mg BID after completion of 6 months of 5 mg BID (or other anticoagulant) when extended prevention is indicated.',
        references: APIXABAN_SOURCE.url,
      }),
    ],
    monographSections: buildMonograph({
      brandNames,
      synonyms,
      therapeuticClass,
      source: APIXABAN_SOURCE,
      sections: {
        'alert-boxed-warning': richDoc(
          paragraph(
            'UK SmPC for Eliquis does not use a US-style boxed warning format. Key product warnings centre on haemorrhage risk, peri-procedural interruption, and drug interactions that increase exposure or bleeding risk. Institutional “High Alert” labelling is not assigned in this draft.',
          ),
          bullets([
            'Observe carefully for bleeding; discontinue if severe haemorrhage occurs.',
            'Concomitant use with other anticoagulants is contraindicated except defined switching / catheter situations.',
            'Antiplatelet agents increase bleeding risk.',
            'A reversal agent for factor Xa inhibitors is available (see SmPC sections 4.4 and 4.9).',
          ]),
        ),
        dosing: richDoc(
          heading(3, 'Adult dosing (Eliquis SmPC §4.2)'),
          heading(4, 'NVAF'),
          paragraph('Recommended dose: 5 mg orally twice daily. Continue long-term.'),
          paragraph(
            'Dose reduction to 2.5 mg twice daily when at least two of: age ≥80 years, body weight ≤60 kg, serum creatinine ≥1.5 mg/dL (133 µmol/L).',
          ),
          heading(4, 'VTE treatment and secondary prevention'),
          table(
            ['Indication', 'Dosing schedule', 'Maximum daily dose'],
            [
              ['Treatment of DVT or PE', '10 mg BID for 7 days, then 5 mg BID', '20 mg then 10 mg'],
              [
                'Prevention of recurrent DVT/PE after 6 months treatment',
                '2.5 mg BID',
                '5 mg',
              ],
            ],
          ),
          paragraph('Missed dose: take as soon as possible, then resume twice-daily schedule.'),
          paragraph('Paediatric: safety and efficacy below 18 years not established; no posology recommendation.'),
        ),
        'dosage-adjustment': {
          structured: {
            kidney:
              'Mild/moderate: VTE — usually no adjustment; NVAF — reduce only if creatinine criterion combines with age/weight criteria. Severe (CrCl 15–29 mL/min): VTE — use with caution; NVAF — 2.5 mg BID. CrCl <15 mL/min or dialysis: not recommended.',
            liver:
              'Contraindicated in hepatic disease with coagulopathy and clinically relevant bleeding risk. Not recommended in severe hepatic impairment. Mild/moderate (Child-Pugh A/B): caution; no routine dose adjustment. Perform liver tests before initiation; caution if ALT/AST >2× ULN or total bilirubin ≥1.5× ULN.',
            obesity:
              'NVAF body-weight ≤60 kg contributes to dose-reduction criteria (with age/creatinine). VTE: no routine weight-based adjustment per SmPC. Extreme weights alter exposure (~30% lower if >120 kg; ~30% higher if <50 kg) — clinical judgement required.',
          },
        },
        'prescribing-restrictions': richDoc(
          bullets([
            'Oral anticoagulant — specialist / protocol-directed initiation and peri-procedural planning recommended locally (not specified as REMS in this UK SmPC).',
            'Do not combine with other anticoagulants except defined switching or catheter situations.',
            'Avoid strong dual CYP3A4 + P-gp inhibitors (e.g. ketoconazole, itraconazole, voriconazole, posaconazole, ritonavir).',
            'Strong CYP3A4 + P-gp inducers (e.g. rifampicin, phenytoin, carbamazepine, phenobarbital, St John’s Wort) may reduce exposure ~50%.',
          ]),
        ),
        'warnings-contraindications': richDoc(
          heading(3, 'Contraindications (summary)'),
          bullets([
            'Hypersensitivity to apixaban or excipients (includes lactose).',
            'Active clinically significant bleeding.',
            'Hepatic disease associated with coagulopathy and clinically relevant bleeding risk.',
            'Lesion/condition with significant major bleeding risk (e.g. recent GI ulceration, high-risk malignancy, recent CNS injury/surgery/ICH, known varices/AVMs/aneurysms as listed in SmPC).',
            'Concomitant anticoagulant therapy except specified exceptions.',
          ]),
          heading(3, 'Selected warnings'),
          bullets([
            'Haemorrhage risk; temporary discontinuation increases thrombotic risk — restart promptly when safe.',
            'Stop ≥48 h before elective procedures with moderate/high bleeding risk; ≥24 h before low bleeding risk.',
            'Active cancer: high risk of both VTE and bleeding.',
            'Limited experience with ACS/PCI dual pathway therapy — increased bleeding with ASA.',
          ]),
        ),
        'pregnancy-lactation': richDoc(
          heading(3, 'Pregnancy'),
          paragraph(
            'No data in pregnant women. Preferable to avoid use during pregnancy as a precautionary measure (SmPC §4.6).',
          ),
          heading(3, 'Breast-feeding'),
          paragraph(
            'Unknown whether apixaban/metabolites are excreted in human milk; animal data show excretion. Decide whether to discontinue breast-feeding or discontinue/abstain from therapy.',
          ),
        ),
        'monitoring-parameters': richDoc(
          bullets([
            'Routine coagulation monitoring not required for dose adjustment.',
            'Calibrated quantitative anti-Factor Xa assay may help in overdose or emergency surgery.',
            'Clinical surveillance for bleeding and anaemia.',
            'Liver function testing before initiation.',
            'Renal function / creatinine when assessing NVAF dose-reduction criteria and severe impairment.',
          ]),
        ),
        'adverse-drug-reactions': richDoc(
          paragraph(
            'Common ADR theme: haemorrhage-related events (e.g. contusion, epistaxis, haematoma). Frequencies differ for NVAF vs VTE populations — see SmPC Table 2.',
          ),
          bullets([
            'Blood: anaemia (common in tabulated data).',
            'Eye / GI / GU bleeding events reported; major GI bleed incidence cited in NVAF warfarin comparison (~0.76%/year).',
            'Skin rash, alopecia (uncommon); rare serious skin reactions listed in SmPC.',
            'LFTs / enzyme increases reported.',
          ]),
          paragraph('Report suspected ADRs via local pharmacovigilance / MHRA Yellow Card when applicable.'),
        ),
        'mechanism-of-action': richDoc(
          paragraph(
            'Apixaban is a selective, reversible, direct inhibitor of Factor Xa. It inhibits free and clot-bound Factor Xa and prothrombinase activity, reducing thrombin generation and thrombus development (pharmacotherapeutic group: direct Factor Xa inhibitors; ATC B01AF02).',
          ),
        ),
        pharmacokinetics: richDoc(
          bullets([
            'Absolute bioavailability ~50% (doses up to 10 mg); Cmax ~3–4 h; can be taken with or without food.',
            'Plasma protein binding ~87%; Vss ~21 L.',
            'Multiple elimination routes; renal excretion ~27% of clearance; t½ ~12 h; total clearance ~3.3 L/h.',
            'Metabolised mainly via CYP3A4/5; substrate of P-gp and BCRP.',
            'AUC increases with declining CrCl (mild ~16%, moderate ~29%, severe ~44%).',
          ]),
        ),
        'dosage-forms': richDoc(
          paragraph(
            'Reference: Eliquis 5 mg film-coated tablets — pink oval tablets debossed 894 / 5; each contains 5 mg apixaban and 102.9 mg lactose.',
          ),
          paragraph(
            'Other strengths/presentations exist in the Eliquis range (e.g. 2.5 mg) for dose reduction / VTE secondary prevention — do not assume local stock without formulary confirmation.',
          ),
        ),
        administration: {
          structured: {
            specificInstructions:
              'Swallow with water, with or without food. If unable to swallow whole tablets, may crush and suspend in water, G5W, or apple juice, or mix with apple puree and give immediately; or crush/suspend in 60 mL water or G5W for NG tube. Crushed tablets stable in those media up to 4 hours.',
            noSpecialInstructions: false,
          },
        },
        'patient-counseling': richDoc(
          bullets([
            'Take twice daily as prescribed; if a dose is missed, take it when remembered then continue the usual schedule.',
            'Seek urgent care for unusual bleeding, black stools, coughing/vomiting blood, severe headache, or falls with head injury.',
            'Tell clinicians and dentists you take an anticoagulant before procedures.',
            'Do not start/stop other medicines (including OTC NSAIDs, herbal St John’s Wort) without advice.',
            'Contains lactose — relevant if lactose intolerant.',
          ]),
        ),
      },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* 2. Adalimumab — Humira 40 mg pre-filled pen                                */
/* -------------------------------------------------------------------------- */

const HUMIRA_SOURCE: SourceMeta = {
  productName: 'Humira 40 mg solution for injection in pre-filled pen',
  manufacturer: 'AbbVie Ltd',
  url: 'https://www.medicines.org.uk/emc/product/7986/smpc',
  emcLastUpdated: '16 Feb 2026',
  textRevisionDate: '06 February 2026',
  atc: 'L04AB04',
};

function createAdalimumab(): Drug {
  const brandNames = ['Humira'];
  const synonyms = ['TNF-α inhibitor', 'anti-TNF monoclonal antibody'];
  const therapeuticClass = 'Immunosuppressants';

  return baseDrug({
    id: 'drug-hhc-adalimumab',
    genericName: 'Adalimumab',
    brandNames,
    synonyms,
    pharmacologicalClass: 'Tumour necrosis factor alpha (TNF-α) inhibitor',
    therapeuticClass,
    keywords: ['adalimumab', 'humira', 'tnf', 'biologic', 'ra', 'ibd', 'psoriasis'],
    indicationsSummary:
      'Draft summary (Humira 40 mg pre-filled pen SmPC): TNF-α inhibitor for multiple licensed adult/paediatric inflammatory indications (RA, SpA, PsA, psoriasis, HS, Crohn’s, UC, uveitis, JIA, etc.). Complex indication-specific dosing — verify full SmPC. Supervisor review required.',
    formulations: [
      form({
        id: 'form-hhc-humira-40-pen',
        dosageForm: 'Injection',
        route: 'SC',
        strengthValue: '40',
        strengthUnit: 'mg',
        concentrationValue: '40',
        concentrationUnit: 'mg/0.4 mL',
        notes: 'Reference: Humira 40 mg solution for injection in pre-filled pen (0.4 mL). Clear, colourless. Contains polysorbate 80 0.4 mg per 40 mg dose. Other Humira strengths/presentations exist.',
      }),
    ],
    dosingEntries: [
      dose({
        id: 'dose-hhc-humira-ra',
        indication: 'Rheumatoid arthritis (adult)',
        population: 'Adults',
        dose: '40',
        doseUnit: 'mg',
        route: 'SC',
        frequency: 'Every other week',
        notes: 'Usually with methotrexate. Monotherapy: some patients may need 40 mg weekly or 80 mg every other week if response wanes.',
        references: HUMIRA_SOURCE.url,
      }),
      dose({
        id: 'dose-hhc-humira-spa-psa',
        indication: 'AS / nr-axSpA / PsA (adult)',
        population: 'Adults',
        dose: '40',
        doseUnit: 'mg',
        route: 'SC',
        frequency: 'Every other week',
        references: HUMIRA_SOURCE.url,
      }),
      dose({
        id: 'dose-hhc-humira-pso',
        indication: 'Plaque psoriasis (adult)',
        population: 'Adults',
        dose: '80 then 40',
        doseUnit: 'mg',
        route: 'SC',
        frequency: '80 mg initially, then 40 mg every other week starting 1 week later',
        references: HUMIRA_SOURCE.url,
      }),
    ],
    monographSections: buildMonograph({
      brandNames,
      synonyms,
      therapeuticClass,
      source: HUMIRA_SOURCE,
      sections: {
        'alert-boxed-warning': richDoc(
          paragraph(
            'UK Humira SmPC emphasises serious infections (including tuberculosis and opportunistic infections), malignancy considerations, and heart-failure contraindications. This draft does not apply an institutional High Alert label.',
          ),
          bullets([
            'Increased susceptibility to serious infections; screen/monitor for TB before, during, and for up to ~4 months after treatment (elimination may take up to four months).',
            'Do not start with active infection until controlled; stop if new serious infection/sepsis develops.',
            'Record product name and batch number for biological traceability.',
            'Patient Reminder Card should be provided.',
          ]),
        ),
        dosing: richDoc(
          heading(3, 'Selected adult regimens (Humira 40 mg pen SmPC §4.2)'),
          paragraph(
            'Initiate and supervise by specialists experienced in the relevant indication. Optimise concomitant therapies. Self-injection only after training when appropriate.',
          ),
          table(
            ['Indication', 'Usual adult SC regimen (summary)'],
            [
              ['Rheumatoid arthritis', '40 mg every other week (± MTX); monotherapy escalation options per SmPC'],
              ['AS / nr-axSpA / PsA', '40 mg every other week'],
              ['Plaque psoriasis', '80 mg day 0 → 40 mg every other week from week 1'],
              ['Hidradenitis suppurativa', '160 mg day 1 → 80 mg day 15 → 40 mg weekly or 80 mg every other week from day 29'],
              ['Crohn’s disease', 'Induction 80/40 or 160/80 mg then 40 mg every other week (see SmPC)'],
              ['Ulcerative colitis', '160 mg week 0 → 80 mg week 2 → 40 mg every other week'],
              ['Uveitis', '80 mg then 40 mg every other week starting 1 week later'],
            ],
          ),
          paragraph(
            'Paediatric dosing is indication- and weight-based and is not fully reproduced here — use the complete SmPC before any paediatric prescribing.',
          ),
          paragraph('Elderly: no dose adjustment required. Renal/hepatic impairment: not studied; no dose recommendation.'),
        ),
        'dosage-adjustment': {
          structured: {
            kidney: 'Not studied; no SmPC dose recommendation for renal impairment.',
            liver: 'Not studied; no SmPC dose recommendation for hepatic impairment.',
            obesity:
              'Population PK shows higher clearance with increasing body weight. Some adolescent HS patients with higher weight/inadequate response may need adult weekly dosing per SmPC discussion.',
          },
        },
        'prescribing-restrictions': richDoc(
          bullets([
            'Specialist initiation/supervision required (SmPC §4.2).',
            'Provide Patient Reminder Card.',
            'Concomitant biologic DMARDs (e.g. anakinra, abatacept) or other TNF antagonists not recommended.',
            'Live vaccines: avoid in infants exposed in utero for 5 months after mother’s last dose; follow immunisation guidance for treated patients.',
          ]),
        ),
        'warnings-contraindications': richDoc(
          heading(3, 'Contraindications'),
          bullets([
            'Hypersensitivity to adalimumab or excipients.',
            'Active tuberculosis or other severe infections (e.g. sepsis, opportunistic infections).',
            'Moderate to severe heart failure (NYHA III/IV).',
          ]),
          heading(3, 'Selected warnings'),
          bullets([
            'TB evaluation (history, tuberculin/IGRA per local practice, chest X-ray) before initiation; treat latent TB before starting when indicated.',
            'Serious bacterial, mycobacterial, invasive fungal, parasitic, viral, and opportunistic infections reported; hospitalisation/fatal outcomes have occurred.',
            'Malignancy caution (including patients with COPD/heavy smoking history — class concern).',
            'Higher serious infection rate in patients ≥65 years.',
          ]),
        ),
        'pregnancy-lactation': richDoc(
          heading(3, 'Pregnancy'),
          paragraph(
            'Large prospective pregnancy datasets do not indicate an increased malformation rate; use only if clearly needed. May affect neonatal immune responses; live vaccines (e.g. BCG) not recommended for infants exposed in utero for 5 months after the mother’s last injection.',
          ),
          paragraph('Women of childbearing potential: adequate contraception during treatment and for at least 5 months after the last dose.'),
          heading(3, 'Breast-feeding'),
          paragraph(
            'Excreted in breast milk at very low concentrations (≈0.1–1% of maternal serum). Humira can be used during breast-feeding per SmPC.',
          ),
        ),
        'monitoring-parameters': richDoc(
          bullets([
            'Infection surveillance before, during, and after therapy (including TB symptoms).',
            'Document TB screening results (Patient Reminder Card).',
            'Clinical response checkpoints (often ~12 weeks for many rheumatology indications; indication-specific stopping rules in SmPC).',
            'Heart failure status; discontinue/reassess if worsening.',
            'Traceability: record brand name and batch number.',
          ]),
        ),
        'adverse-drug-reactions': richDoc(
          paragraph(
            'Most common: infections (e.g. nasopharyngitis, URTI, sinusitis), injection-site reactions, headache, musculoskeletal pain.',
          ),
          bullets([
            'Serious infections including TB and opportunistic infections.',
            'Injection-site erythema, itching, haemorrhage, pain, swelling.',
            'Vertigo and visual impairment may affect driving/machine use.',
          ]),
          paragraph('Full tabulated ADR list is extensive — consult SmPC §4.8.'),
        ),
        'mechanism-of-action': richDoc(
          paragraph(
            'Adalimumab is a recombinant human monoclonal antibody that binds TNF and blocks interaction with p55/p75 TNF receptors, modulating TNF-driven inflammatory responses (ATC L04AB04).',
          ),
        ),
        pharmacokinetics: richDoc(
          bullets([
            'After single 40 mg SC dose: slow absorption; peak ~5 days; absolute bioavailability ~64%.',
            'Mean terminal half-life ~2 weeks; Vss ~5–6 L after IV doses in PK studies.',
            'RA steady-state trough ~5 µg/mL without MTX and ~8–9 µg/mL with MTX at 40 mg every other week.',
            'Clearance tends to increase with body weight; anti-drug antibodies associated with lower free adalimumab levels.',
          ]),
        ),
        'dosage-forms': richDoc(
          paragraph(
            'Reference product: Humira 40 mg solution for injection in pre-filled pen — 40 mg in 0.4 mL; clear, colourless. Contains polysorbate 80.',
          ),
          paragraph(
            'Humira is available in other strengths/presentations depending on treatment needs. Do not interchange assumptions across devices/volumes without checking the specific SmPC.',
          ),
        ),
        administration: {
          structured: {
            specificInstructions:
              'Subcutaneous injection. After training, patients may self-inject when the physician agrees, with medical follow-up. Follow device Instructions for Use for the pre-filled pen. Rotate injection sites; avoid tender/bruised/red/hard skin.',
            noSpecialInstructions: false,
          },
        },
        'patient-counseling': richDoc(
          bullets([
            'Report fever, persistent cough, weight loss, or other infection symptoms promptly.',
            'Keep the Patient Reminder Card and show it to healthcare professionals.',
            'Do not receive certain live vaccines without specialist advice.',
            'Inform clinicians of planned surgery or pregnancy plans (contraception advice applies).',
            'Injection-site reactions are common; seek advice if severe.',
          ]),
        ),
      },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Aspirin — 75 mg gastro-resistant tablets                                */
/* -------------------------------------------------------------------------- */

const ASPIRIN_SOURCE: SourceMeta = {
  productName: 'Aspirin 75mg Gastro-Resistant Tablets',
  manufacturer: 'Dexcel Pharma Ltd',
  url: 'https://www.medicines.org.uk/emc/product/2614/smpc',
  emcLastUpdated: '16 Oct 2026',
  textRevisionDate: '09/10/2026',
  atc: 'B01AC06',
};

function createAspirin(): Drug {
  const brandNames = ['Aspirin 75 mg (Dexcel gastro-resistant)'];
  const synonyms = ['Acetylsalicylic acid', 'ASA', 'low-dose aspirin'];
  const therapeuticClass = 'Antiplatelet Agents';

  return baseDrug({
    id: 'drug-hhc-aspirin',
    genericName: 'Aspirin',
    brandNames,
    synonyms,
    pharmacologicalClass: 'Platelet aggregation inhibitor (acetylsalicylic acid)',
    therapeuticClass,
    keywords: ['aspirin', 'acetylsalicylic acid', 'asa', 'antiplatelet', '75 mg'],
    indicationsSummary:
      'Draft summary (Aspirin 75 mg gastro-resistant tablets, Dexcel): secondary prevention of thrombotic cerebrovascular or cardiovascular disease and following bypass surgery. Not for anti-inflammatory/analgesic/antipyretic use at this product positioning. Supervisor review required.',
    formulations: [
      form({
        id: 'form-hhc-asa-75-gr',
        dosageForm: 'Tablet',
        route: 'Oral',
        strengthValue: '75',
        strengthUnit: 'mg',
        notes: 'Gastro-resistant (enteric-coated) tablet. Contains lactose (~17 mg/tablet). Swallow whole — do not cut, chew, or crush.',
      }),
    ],
    dosingEntries: [
      dose({
        id: 'dose-hhc-asa-cv',
        indication: 'Secondary CV / cerebrovascular prevention',
        population: 'Adults (≥16 years)',
        dose: '75–150',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: 'Once daily',
        maximumDose: 'Up to 300 mg/day short-term on medical advice',
        notes: 'Usual long-term dose 75–150 mg once daily. Seek medical advice before first-time therapy.',
        references: ASPIRIN_SOURCE.url,
      }),
    ],
    monographSections: buildMonograph({
      brandNames,
      synonyms,
      therapeuticClass,
      source: ASPIRIN_SOURCE,
      sections: {
        'alert-boxed-warning': richDoc(
          paragraph(
            'No US-style boxed warning in this UK SmPC. Critical cautions include bleeding risk, Reye’s syndrome concern under 16 years, and third-trimester contraindications for higher doses. Institutional alert class not assigned in this draft.',
          ),
        ),
        dosing: richDoc(
          heading(3, 'Posology (SmPC §4.2)'),
          paragraph(
            'Usual long-term dose for cardiovascular/cerebrovascular disease: 75–150 mg once daily. In some circumstances higher short-term doses up to 300 mg/day may be used on medical advice.',
          ),
          paragraph(
            'Not indicated in children and young people <16 years (Reye’s syndrome risk). Adults/adolescents from 16 years.',
          ),
          paragraph('Review treatment regularly, especially in the elderly.'),
        ),
        'dosage-adjustment': {
          structured: {
            kidney:
              'Contraindicated in severe renal impairment. Caution in moderate impairment / dehydration — NSAIDs may worsen renal function.',
            liver:
              'Contraindicated in severe hepatic impairment. Caution in mild/moderate impairment; monitor LFTs if slight/moderate insufficiency.',
            obesity: 'No specific obesity dose adjustment in this SmPC.',
          },
        },
        'prescribing-restrictions': richDoc(
          bullets([
            'Product not suitable as anti-inflammatory / analgesic / antipyretic.',
            'Avoid in <16 years unless benefits outweigh risks (Reye’s syndrome).',
            'Methotrexate >15 mg/week: contraindicated combination.',
            'Combination with other haemostasis-altering drugs not recommended unless strictly indicated.',
          ]),
        ),
        'warnings-contraindications': richDoc(
          heading(3, 'Contraindications (summary)'),
          bullets([
            'Hypersensitivity to salicylates / certain prostaglandin synthetase inhibitors / excipients.',
            'Active or recurrent peptic ulcer / GI bleed, or other significant bleeding (e.g. cerebrovascular haemorrhage).',
            'Haemorrhagic diathesis; coagulation disorders (e.g. haemophilia, thrombocytopenia).',
            'Gout.',
            'Severe hepatic or severe renal impairment.',
            'Doses >100 mg/day in the third trimester of pregnancy.',
            'Methotrexate used at >15 mg/week.',
          ]),
          heading(3, 'Selected warnings'),
          bullets([
            'Increased haemorrhage risk peri-procedure (including dental); temporary interruption may be needed.',
            'Caution in hypertension, prior ulcer/bleed, anticoagulant therapy.',
            'May provoke bronchospasm/asthma exacerbations in susceptible patients.',
            'Rare serious skin reactions (including SJS); stop at first signs of hypersensitivity.',
            'Contains lactose.',
          ]),
        ),
        'pregnancy-lactation': richDoc(
          heading(3, 'Pregnancy'),
          paragraph(
            'Low doses (≤100 mg/day) for specialised obstetric use appear safe with monitoring. Doses >100 mg/day contraindicated in the third trimester. From week 20 onward, risk of oligohydramnios / ductus arteriosus constriction — monitor and discontinue if found. Use lowest effective dose for shortest time in 1st/2nd trimester if clearly necessary.',
          ),
          heading(3, 'Breast-feeding'),
          paragraph(
            'Low quantities excreted in milk. Short-term recommended doses usually do not require stopping breast-feeding; long-term/higher doses — discontinue breast-feeding.',
          ),
        ),
        'monitoring-parameters': richDoc(
          bullets([
            'Bleeding symptoms; stop if GI bleeding/ulceration occurs.',
            'Periodic clinical review on long-term therapy (especially elderly).',
            'LFTs in mild/moderate hepatic insufficiency.',
            'Renal function awareness in at-risk patients.',
          ]),
        ),
        'adverse-drug-reactions': richDoc(
          bullets([
            'Common: increased bleeding tendency.',
            'GI effects including ulceration/bleeding (frequency categories in SmPC §4.8).',
            'Hypersensitivity reactions; rare serious skin reactions.',
            'Possible Kounis syndrome (acute myocardial ischemia as hypersensitivity) — discontinue if confirmed.',
          ]),
        ),
        'mechanism-of-action': richDoc(
          paragraph(
            'Acetylsalicylic acid irreversibly acetylates platelet cyclooxygenase, inhibiting thromboxane A2 synthesis and platelet aggregation. Effect persists for the platelet lifespan (~7–10 days). ATC B01AC06.',
          ),
        ),
        pharmacokinetics: richDoc(
          bullets([
            'Rapid GI absorption; substantial first-pass hydrolysis to salicylic acid.',
            'Extensive plasma protein binding; wide distribution.',
            'ASA half-life ~15–30 minutes; salicylate elimination dose-dependent (t½ ~2–3 h after low doses 75–160 mg).',
            'Renal excretion of salicylate and metabolites.',
            'Note: this product is gastro-resistant — absorption profile differs from immediate-release aspirin.',
          ]),
        ),
        'dosage-forms': richDoc(
          paragraph(
            'Aspirin 75 mg gastro-resistant tablets (Dexcel): white film-coated round gastro-resistant tablets containing 75 mg aspirin and lactose.',
          ),
        ),
        administration: {
          structured: {
            specificInstructions:
              'Oral, adults. Take with water. Do not cut, chew, or crush — swallow whole (gastro-resistant coating).',
            noSpecialInstructions: false,
          },
        },
        'patient-counseling': richDoc(
          bullets([
            'Swallow tablets whole with water; do not crush or chew.',
            'Report unusual bleeding, black stools, severe stomach pain, rash, or breathing difficulty.',
            'Tell clinicians/dentists before procedures.',
            'Avoid other medicines that increase bleeding risk unless advised.',
            'Not for use as a general painkiller/fever medicine in this product role.',
          ]),
        ),
      },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Paracetamol — 500 mg tablets                                            */
/* -------------------------------------------------------------------------- */

const PARACETAMOL_SOURCE: SourceMeta = {
  productName: 'Paracetamol 500mg Tablets',
  manufacturer: 'Flamingo Pharma (UK) Ltd',
  url: 'https://www.medicines.org.uk/emc/product/101491/smpc',
  emcLastUpdated: '24 Oct 2025',
  textRevisionDate: '06/10/2025',
  atc: 'N02BE01',
};

function createParacetamol(): Drug {
  const brandNames = ['Paracetamol 500 mg (Flamingo Pharma)'];
  const synonyms = ['Acetaminophen'];
  const therapeuticClass = 'Analgesics';

  return baseDrug({
    id: 'drug-hhc-paracetamol',
    genericName: 'Paracetamol',
    brandNames,
    synonyms,
    pharmacologicalClass: 'Analgesic and antipyretic',
    therapeuticClass,
    keywords: ['paracetamol', 'acetaminophen', 'analgesic', 'antipyretic', '500 mg'],
    indicationsSummary:
      'Draft summary (Paracetamol 500 mg tablets, Flamingo Pharma): mild to moderate pain and symptomatic relief of feverish illnesses as licensed. Overdose can cause delayed serious liver injury. Supervisor review required.',
    formulations: [
      form({
        id: 'form-hhc-paracetamol-500',
        dosageForm: 'Tablet',
        route: 'Oral',
        strengthValue: '500',
        strengthUnit: 'mg',
        notes: 'White to off-white circular flat bevelled tablet with breakline; divisible into equal doses. Contains sodium metabisulphite 0.56 mg per tablet.',
      }),
    ],
    dosingEntries: [
      dose({
        id: 'dose-hhc-paracetamol-adult',
        indication: 'Mild–moderate pain / fever',
        population: 'Adults, elderly, children ≥16 years',
        dose: '500–1000',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: 'Every 3–4 hours as needed (see SmPC table)',
        maximumDose: 'Maximum 8 doses/24 h for ≥16 y per this SmPC table; also “not more than 4 doses/24 h” instruction in general dosage text — reconcile with full label before use',
        notes: 'SmPC includes both an age-table (16+: 1–2 tablets every 3 hours, max 8 doses/24 h) and general text (every 4–6 h, max 4 doses/24 h). Supervisor must confirm which local dosing standard applies.',
        references: PARACETAMOL_SOURCE.url,
      }),
    ],
    monographSections: buildMonograph({
      brandNames,
      synonyms,
      therapeuticClass,
      source: PARACETAMOL_SOURCE,
      sections: {
        'alert-boxed-warning': richDoc(
          paragraph(
            'Label/leaflet emphasise: talk to a doctor at once if too much is taken, even if feeling well — overdose can cause delayed, serious liver damage. Do not take with other paracetamol-containing medicines. Institutional alert class not assigned in this draft.',
          ),
        ),
        dosing: richDoc(
          heading(3, 'Posology from this SmPC (§4.2)'),
          paragraph('Oral administration.'),
          table(
            ['Age', '500 mg tablet dose', 'Frequency / maximum'],
            [
              ['16 years and over', 'One–two tablets', 'Every 3 hours when necessary; maximum 8 doses in 24 hours (SmPC age table)'],
              ['12–15 years', 'One–one & half', 'Every 4–6 hours; max 4 doses/24 h'],
              ['10–12 years', 'One', 'Every 4–6 hours; max 4 doses/24 h'],
              ['8–10 years', 'Half', 'Every 4–6 hours; max 4 doses/24 h'],
              ['6–8 years', 'Half', 'Every 4–6 hours; max 4 doses/24 h'],
            ],
          ),
          paragraph(
            'General dosage instruction in the same SmPC also states: take every 4–6 hours as required; not more frequently than every 4 hours; not more than 4 doses in 24 hours. These statements should be reconciled under local policy before publication.',
          ),
          paragraph('Do not continue >3 days except on medical advice (warnings section).'),
        ),
        'dosage-adjustment': {
          structured: {
            kidney: 'Care in severe renal impairment (SmPC warning).',
            liver:
              'Care in severe hepatic impairment. Overdose hazard greater with non-cirrhotic alcoholic liver disease. Chronic alcohol use reduces hepatic capacity to handle paracetamol.',
            obesity: 'No specific obesity adjustment in this SmPC.',
          },
        },
        'prescribing-restrictions': richDoc(
          bullets([
            'Do not combine with other paracetamol-containing products.',
            'Hypersensitivity to paracetamol or excipients (includes sodium metabisulphite).',
            'Prolonged therapeutic use / combination with flucloxacillin: risk of high anion gap metabolic acidosis (pyroglutamic acidosis) in at-risk patients.',
          ]),
        ),
        'warnings-contraindications': richDoc(
          heading(3, 'Contraindications'),
          bullets([
            'Hypersensitivity to paracetamol or any other ingredients.',
            'If taking any other medicines that contain paracetamol.',
          ]),
          heading(3, 'Selected warnings'),
          bullets([
            'Do not exceed the stated dose.',
            'Overdose advice even if asymptomatic.',
            'HAGMA due to pyroglutamic acidosis reported with prolonged therapeutic dosing in severe illness, malnutrition, glutathione deficiency, or with flucloxacillin — stop and investigate if suspected.',
            'Sodium metabisulphite may rarely cause severe hypersensitivity / bronchospasm.',
          ]),
        ),
        'pregnancy-lactation': richDoc(
          heading(3, 'Pregnancy'),
          paragraph(
            'Large data do not indicate malformative or feto/neonatal toxicity; neurodevelopmental epidemiology inconclusive. If clinically needed, use lowest effective dose for shortest time at lowest frequency.',
          ),
          heading(3, 'Breast-feeding'),
          paragraph('Excreted in breast milk but not in clinically significant quantities; published data do not contraindicate breast-feeding.'),
        ),
        'monitoring-parameters': richDoc(
          bullets([
            'In overdose: timed plasma paracetamol concentration (from 4 h post-ingestion) and N-acetylcysteine protocols per toxicology guidance.',
            'Suspect HAGMA/pyroglutamic acidosis in at-risk patients on prolonged therapy — consider urinary 5-oxoproline.',
            'Chronic use may enhance warfarin effect — monitor anticoagulation if relevant.',
          ]),
        ),
        'adverse-drug-reactions': richDoc(
          paragraph('Generally rare at labelled doses; frequency often “not known” from post-marketing data.'),
          bullets([
            'Hypersensitivity including rash; anaphylaxis/angioedema (not known).',
            'Blood dyscrasias including thrombocytopenia, agranulocytosis (not known).',
            'Bronchospasm (especially aspirin-sensitive asthmatics).',
            'Hepatic dysfunction; very rare serious skin reactions (SJS/TEN/AGEP).',
            'HAGMA (not known).',
          ]),
        ),
        'mechanism-of-action': richDoc(
          paragraph(
            'Analgesic and antipyretic with weak anti-inflammatory activity. Likely central prostaglandin synthesis inhibition with some peripheral effects; antipyresis via hypothalamic heat-regulation centre (ATC N02BE01).',
          ),
        ),
        pharmacokinetics: richDoc(
          bullets([
            'Rapid GI absorption; peak concentrations ~30–60 minutes.',
            'Hepatic metabolism to glucuronide and sulphate conjugates; minor CYP-mediated toxic metabolite normally detoxified by glutathione.',
            'Elimination half-life ~1–4 hours after therapeutic doses.',
            'Protein binding variable (~20–30% in intoxication concentrations).',
          ]),
        ),
        'dosage-forms': richDoc(
          paragraph(
            'Paracetamol 500 mg tablets (Flamingo Pharma): white/off-white circular flat bevelled tablets with breakline; each contains 500 mg paracetamol and sodium metabisulphite 0.56 mg.',
          ),
        ),
        administration: {
          structured: {
            specificInstructions: 'Oral tablets. May be divided into equal doses along the breakline.',
            noSpecialInstructions: false,
          },
        },
        'patient-counseling': richDoc(
          bullets([
            'Do not take with any other paracetamol products.',
            'Do not exceed the labelled dose; seek urgent help after overdose even if well.',
            'Ask a pharmacist/doctor before use in pregnancy or with other medicines.',
            'Stop and seek advice if rash, breathing difficulty, or symptoms persist >3 days.',
          ]),
        ),
      },
    }),
  });
}

/* -------------------------------------------------------------------------- */
/* 5. Metformin — Glucophage 500 mg film-coated tablets                       */
/* -------------------------------------------------------------------------- */

const METFORMIN_SOURCE: SourceMeta = {
  productName: 'Glucophage 500 mg film-coated tablets',
  manufacturer: 'Merck (Merck Serono Ltd)',
  url: 'https://www.medicines.org.uk/emc/product/987/smpc',
  emcLastUpdated: '22 Dec 2025',
  textRevisionDate: 'November 2025',
  atc: 'A10BA02',
};

function createMetformin(): Drug {
  const brandNames = ['Glucophage'];
  const synonyms = ['Metformin hydrochloride', 'biguanide'];
  const therapeuticClass = 'Antidiabetics';

  return baseDrug({
    id: 'drug-hhc-metformin',
    genericName: 'Metformin',
    brandNames,
    synonyms,
    pharmacologicalClass: 'Biguanide antihyperglycaemic',
    therapeuticClass,
    keywords: ['metformin', 'glucophage', 'biguanide', 'type 2 diabetes', 't2dm'],
    indicationsSummary:
      'Draft summary (Glucophage 500 mg film-coated tablets SmPC): type 2 diabetes mellitus when diet/exercise alone are insufficient; adults ± other agents/insulin; children ≥10 years as monotherapy or with insulin. Lactic acidosis warning — renal function critical. Supervisor review required.',
    formulations: [
      form({
        id: 'form-hhc-metformin-500',
        dosageForm: 'Tablet',
        route: 'Oral',
        strengthValue: '500',
        strengthUnit: 'mg',
        notes: 'Reference: Glucophage 500 mg film-coated tablets (500 mg metformin hydrochloride ≈ 390 mg base). White circular convex tablets engraved GL 500. SmPC also covers 850 mg strength.',
      }),
    ],
    dosingEntries: [
      dose({
        id: 'dose-hhc-met-adult',
        indication: 'Type 2 diabetes — adults with normal renal function',
        population: 'Adults, GFR ≥90 mL/min',
        dose: '500 or 850',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: '2–3 times daily with/after meals; titrate',
        maximumDose: '3000 mg metformin hydrochloride daily in 3 divided doses',
        notes: 'Adjust after 10–15 days based on glucose; slow titration improves GI tolerability.',
        references: METFORMIN_SOURCE.url,
      }),
      dose({
        id: 'dose-hhc-met-paed',
        indication: 'Type 2 diabetes — paediatric',
        population: 'Children ≥10 years and adolescents',
        dose: '500 or 850',
        doseUnit: 'mg',
        route: 'Oral',
        frequency: 'Once daily initially with/after meals; titrate',
        maximumDose: '2000 mg daily in 2–3 doses',
        references: METFORMIN_SOURCE.url,
      }),
    ],
    monographSections: buildMonograph({
      brandNames,
      synonyms,
      therapeuticClass,
      source: METFORMIN_SOURCE,
      sections: {
        'alert-boxed-warning': richDoc(
          paragraph(
            'Prominent SmPC warning: lactic acidosis — rare but serious, often with acute renal deterioration, cardiorespiratory illness, or sepsis. This draft does not assign institutional High Alert status.',
          ),
          bullets([
            'Assess GFR before initiation and regularly thereafter.',
            'Contraindicated if GFR <30 mL/min.',
            'Temporarily stop in dehydration, hypoxia risk, surgery (with restart rules), and around iodinated contrast per SmPC.',
          ]),
        ),
        dosing: richDoc(
          heading(3, 'Adults with normal renal function (GFR ≥90)'),
          paragraph(
            'Start 500 mg or 850 mg two or three times daily during or after meals. Titrate after 10–15 days. Maximum 3 g daily in three divided doses.',
          ),
          heading(3, 'Renal impairment — maximum daily dose (SmPC table)'),
          table(
            ['GFR (mL/min)', 'Max total daily dose', 'Notes'],
            [
              ['60–89', '3000 mg', 'Dose reduction may be considered as GFR declines'],
              ['45–59', '2000 mg', 'Review lactic acidosis risk factors; start at most half of max'],
              ['30–44', '1000 mg', 'As above'],
              ['<30', '—', 'Contraindicated'],
            ],
          ),
          heading(3, 'Paediatric (≥10 years)'),
          paragraph('Start 500 or 850 mg once daily with/after meals; max 2 g daily in 2–3 doses.'),
        ),
        'dosage-adjustment': {
          structured: {
            kidney:
              'Dose by GFR table above. Contraindicated GFR <30. Hold when renal function acutely altered. Elderly: adjust for renal function; assess GFR more often (e.g. every 3–6 months) if higher risk.',
            liver: 'Hepatic insufficiency is a contraindication (lactic acidosis risk).',
            obesity:
              'Indicated particularly in overweight type 2 diabetes after diet failure; no separate mg/kg obesity titration table in SmPC beyond standard dosing.',
          },
        },
        'prescribing-restrictions': richDoc(
          bullets([
            'Not for acute metabolic acidosis / DKA / diabetic pre-coma.',
            'Stop around iodinated contrast: discontinue prior to or at imaging; restart after ≥48 h if renal function re-checked and stable.',
            'Alcohol intoxication increases lactic acidosis risk.',
            'Not recommended in known mitochondrial diseases (MELAS, MIDD).',
          ]),
        ),
        'warnings-contraindications': richDoc(
          heading(3, 'Contraindications'),
          bullets([
            'Hypersensitivity to metformin/excipients.',
            'Any acute metabolic acidosis (lactic acidosis, DKA).',
            'Diabetic pre-coma.',
            'Severe renal failure (GFR <30 mL/min).',
            'Acute conditions altering renal function (dehydration, severe infection, shock).',
            'Diseases causing tissue hypoxia (e.g. decompensated HF, respiratory failure, recent MI, shock).',
            'Hepatic insufficiency; acute alcohol intoxication; alcoholism.',
          ]),
        ),
        'pregnancy-lactation': richDoc(
          heading(3, 'Pregnancy'),
          paragraph(
            'Large human data do not show increased congenital anomalies/toxicity risk. Metformin crosses the placenta. If clinically needed, may be considered in pregnancy/periconception as addition or alternative to insulin. Maintain near-normal glycaemia.',
          ),
          heading(3, 'Breast-feeding'),
          paragraph(
            'Excreted into breast milk. Limited data — breast-feeding not recommended during metformin; weigh benefits vs potential infant risk.',
          ),
        ),
        'monitoring-parameters': richDoc(
          bullets([
            'GFR before initiation and at least annually (more often if declining risk/elderly).',
            'Blood glucose to guide titration.',
            'Vitamin B12 periodically (decrease/deficiency is a listed ADR).',
            'Educate on lactic acidosis symptoms; stop and seek care if suspected (pH <7.35, lactate >5 mmol/L, etc.).',
            'Cardiac/renal monitoring if stable chronic heart failure.',
          ]),
        ),
        'adverse-drug-reactions': richDoc(
          paragraph(
            'Very common at initiation: nausea, vomiting, diarrhoea, abdominal pain, loss of appetite — often transient; slow titration and split dosing help.',
          ),
          bullets([
            'Common: vitamin B12 decrease/deficiency.',
            'Very rare: lactic acidosis.',
            'Taste disturbance and other ADRs — see SmPC §4.8.',
          ]),
        ),
        'mechanism-of-action': richDoc(
          paragraph(
            'Biguanide antihyperglycaemic acting on basal and postprandial glucose without stimulating insulin secretion (hence alone does not cause hypoglycaemia). Reduces hepatic glucose production, improves peripheral uptake/utilisation, and has gut-mediated effects including GLP-1; AMPK activator (ATC A10BA02).',
          ),
        ),
        pharmacokinetics: richDoc(
          bullets([
            'Tmax ~2.5 h; absolute bioavailability of 500/850 mg tablet ~50–60%.',
            'Absorption saturable/non-linear; food decreases and delays absorption.',
            'Negligible plasma protein binding; partitions into erythrocytes.',
            'Not metabolised; excreted unchanged in urine; renal clearance >400 mL/min; apparent t½ ~6.5 h.',
            'Impaired renal function prolongs half-life and raises plasma levels.',
          ]),
        ),
        'dosage-forms': richDoc(
          paragraph(
            'Glucophage 500 mg film-coated tablets: 500 mg metformin hydrochloride (≈390 mg base), white circular convex tablets 11 mm, engraved GL 500. The same SmPC also documents Glucophage 850 mg tablets.',
          ),
        ),
        administration: {
          structured: {
            specificInstructions:
              'Swallow during or after meals. Divide daily dose into 2–3 administrations to improve GI tolerability. Titrate slowly.',
            noSpecialInstructions: false,
          },
        },
        'patient-counseling': richDoc(
          bullets([
            'Take with food to reduce stomach upset.',
            'Stop and seek urgent care for unexplained rapid breathing, severe stomach pain, muscle cramps, marked weakness, or feeling very cold — possible lactic acidosis.',
            'Tell clinicians before scans with contrast dye or before surgery.',
            'Limit alcohol; ask about sick-day rules for vomiting/diarrhoea.',
            'Metformin alone usually does not cause low blood sugar, but combinations with insulin/sulfonylureas can.',
          ]),
        ),
      },
    }),
  });
}

/** Stable Phase 3 draft master records (exactly five). */
export function createPhase3DraftDrugs(): Drug[] {
  return [createApixaban(), createAdalimumab(), createAspirin(), createParacetamol(), createMetformin()];
}

/**
 * Merge Phase 3 drafts into workspace/catalog state without overwriting edits
 * already present for the same stable IDs.
 */
export function ensurePhase3DraftDrugs(state: ContentState): ContentState {
  const existingIds = new Set(state.drugs.map((drug) => drug.id));
  const hospitals = state.hospitals?.length ? state.hospitals : DEFAULT_HOSPITALS;
  const missing = createPhase3DraftDrugs()
    .filter((drug) => !existingIds.has(drug.id))
    .map((drug) => ({
      ...drug,
      hospitalAssignments: hospitals.map((hospital) => {
        const prior = (drug.hospitalAssignments ?? []).find((row) => row.hospitalId === hospital.id);
        return {
          hospitalId: hospital.id,
          enabled: false,
          notes: prior?.notes,
          hospitalSpecificFormulationIds: prior?.hospitalSpecificFormulationIds,
        };
      }),
    }));

  if (!missing.length) return state;
  return { ...state, drugs: [...missing, ...state.drugs] };
}

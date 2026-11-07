/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Finding, FactItem, ImageAssetData, ContrastResult } from './types';
import { APPROVED_BG_COLORS, CURRENT_DATE_STRING } from './data';

/**
 * Backend base URL. Set VITE_API_URL in .env (e.g. VITE_API_URL=http://localhost:8000).
 * A relative path like "/api/..." would hit the Vite dev server (port 3000) and return 404.
 */
export const API_BASE: string =
  (import.meta as any).env?.VITE_API_URL ??
  ((import.meta as any).env?.DEV ? 'http://localhost:8000' : '');

type Suggestion = NonNullable<Finding['suggestions']>[number];

let seq = 0;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${++seq}`;

const sug = (
  label: string,
  replacementText: string,
  status: 'Yes' | 'Partly' | 'No',
  explanation: string
): Suggestion =>
  ({
    id: uid('sug'),
    replacementText,
    label,
    intentPreserved: { status, explanation },
  }) as Suggestion;

// ---------- WCAG contrast ----------

function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return 1;

  let r = 0, g = 0, b = 0;
  if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  } else {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  }

  const srgb = [r, g, b].map(val =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );

  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function calculateContrast(textColor: string, bgColor: string): ContrastResult {
  const lum1 = getLuminance(textColor);
  const lum2 = getLuminance(bgColor);
  const ratio = (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);

  const cleanBg = bgColor.toUpperCase();
  const isBrandBg = APPROVED_BG_COLORS.some(c => c.hex.toUpperCase() === cleanBg);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passesAA: ratio >= 4.5,
    textColor,
    bgColor,
    isBrandBg,
  };
}

// ---------- helpers ----------

const BOUNDARY = /[\s.,!?;:()"'“”‘’/-]/;

function findOccurrences(
  text: string,
  term: string
): { start: number; end: number; match: string }[] {
  const results: { start: number; end: number; match: string }[] = [];
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let index = 0;

  while ((index = lowerText.indexOf(lowerTerm, index)) !== -1) {
    const beforeChar = index > 0 ? text[index - 1] : ' ';
    const afterChar = index + term.length < text.length ? text[index + term.length] : ' ';
    if (BOUNDARY.test(beforeChar) && BOUNDARY.test(afterChar)) {
      results.push({
        start: index,
        end: index + term.length,
        match: text.substring(index, index + term.length)
      });
    }
    index += term.length;
  }

  return results;
}

const covered = (list: Finding[], start: number, end: number) =>
  list.some(f => f.startOffset <= start && f.endOffset >= end);

// ---------- visual / accessibility checks (colours + alt text chosen in the UI) ----------

export function checkVisualAssets(imageAsset: ImageAssetData): Finding[] {
  const findings: Finding[] = [];
  const contrast = calculateContrast(imageAsset.textColor, imageAsset.bgColor);

  if (!contrast.passesAA) {
    findings.push({
      id: uid('finding-rule'),
      category: 'Accessibility',
      severity: 'error',
      flaggedText: `Text (${imageAsset.textColor}) on Background (${imageAsset.bgColor})`,
      startOffset: 0,
      endOffset: 0,
      ruleId: 'A11y-4.1',
      ruleName: 'WCAG AA Contrast Failure',
      whyFlagged: `Contrast ratio is ${contrast.ratio}:1, below the WCAG AA minimum of 4.5:1. Text will be hard to read for low-vision users and in bright light.`,
      confidence: 'High',
      origin: 'Rule-based',
      suggestions: [
        sug('Set text to Charcoal (#1A1A1A)', '#1A1A1A', 'Yes', 'Gives strong legibility on light backgrounds.'),
        sug('Set text to Lumen Navy (#0B3D91)', '#0B3D91', 'Yes', 'Keeps the brand blue and passes AA on white.'),
      ],
      decision: { status: 'pending' },
    } as Finding);
  }

  if (!contrast.isBrandBg) {
    findings.push({
      id: uid('finding-rule'),
      category: 'Visual',
      severity: 'warning',
      flaggedText: `Background color ${imageAsset.bgColor}`,
      startOffset: 0,
      endOffset: 0,
      ruleId: 'Visual-4.3',
      ruleName: 'Off-Palette Background',
      whyFlagged: `The background (${imageAsset.bgColor}) is not in the approved Lumen palette (#FFFFFF, #0B3D91, #FFC107, #1A1A1A, #F4F6FA).`,
      confidence: 'High',
      origin: 'Rule-based',
      suggestions: [
        sug('Set background to Studio White (#FFFFFF)', '#FFFFFF', 'Yes', 'Aligns with the core surface colour.'),
        sug('Set background to Pale Canvas (#F4F6FA)', '#F4F6FA', 'Yes', 'Soft contrast within the approved palette.'),
      ],
      decision: { status: 'pending' },
    } as Finding);
  }

  if (!imageAsset.altText || imageAsset.altText.trim().length === 0) {
    findings.push({
      id: uid('finding-rule'),
      category: 'Accessibility',
      severity: 'error',
      flaggedText: '[Missing image alt text]',
      startOffset: 0,
      endOffset: 0,
      ruleId: 'A11y-4.2',
      ruleName: 'Missing Image Alt Text',
      whyFlagged: 'Every banner or social visual needs descriptive alternative text for screen readers.',
      confidence: 'High',
      origin: 'Rule-based',
      suggestions: [],
      decision: { status: 'pending' },
    } as Finding);
  }

  return findings;
}

/**
 * Deterministic rule-based engine (also the offline fallback).
 */
export function checkRuleBased(
  content: string,
  facts: FactItem[],
  imageAsset?: ImageAssetData,
  currentDate: string = CURRENT_DATE_STRING
): Finding[] {
  const findings: Finding[] = [];

  // 1. Banned guarantee terms
  const bannedTerms = [
    { term: 'guaranteed returns', alt: 'competitive market-linked returns' },
    { term: 'guaranteed', alt: 'predictable' },
    { term: 'risk-free', alt: 'capital-protected' },
    { term: 'free money', alt: 'bonus rewards' },
  ];

  for (const item of bannedTerms) {
    for (const m of findOccurrences(content, item.term)) {
      if (covered(findings, m.start, m.end)) continue;

      findings.push({
        id: uid('finding-rule'),
        category: 'Terminology',
        severity: 'error',
        flaggedText: m.match,
        startOffset: m.start,
        endOffset: m.end,
        ruleId: 'Term-1.1',
        ruleName: 'Banned Guarantee Claims',
        whyFlagged: `Financial advertising rules prohibit terms like "${m.match}". Absolute return promises without risk disclosure can be a regulatory violation.`,
        confidence: 'High',
        origin: 'Rule-based',
        isHighRisk: true,
        suggestions: [
          sug(`Replace with "${item.alt}"`, item.alt, 'Yes', 'Keeps the appeal while avoiding an absolute promise.'),
          sug('Replace with "benchmark returns"', 'benchmark returns', 'Partly', 'More technical, but compliant.'),
        ],
        decision: { status: 'pending' },
      } as Finding);
    }
  }

  // 2. Preferred terms
  const preferredTerms = [
    {
      term: 'Lumen Saver',
      replacement: 'Lumen Savings',
      ruleId: 'Term-1.2',
      name: 'Official Product Nomenclature',
      why: '"Lumen Saver" is a deprecated product name. Use "Lumen Savings".'
    },
    {
      term: 'customers',
      replacement: 'account holders',
      ruleId: 'Term-1.3',
      name: 'Customer vs Account Holder',
      why: 'Brand style uses "account holder(s)" instead of "customer(s)".'
    },
    {
      term: 'customer',
      replacement: 'account holder',
      ruleId: 'Term-1.3',
      name: 'Customer vs Account Holder',
      why: 'Brand style uses "account holder" instead of "customer".'
    },
    {
      term: 'cashback',
      replacement: 'rewards',
      ruleId: 'Term-1.4',
      name: 'Rewards vs Cashback',
      why: 'Lumen uses "rewards" rather than "cashback".'
    },
  ];

  for (const item of preferredTerms) {
    for (const m of findOccurrences(content, item.term)) {
      if (covered(findings, m.start, m.end)) continue;

      findings.push({
        id: uid('finding-rule'),
        category: 'Terminology',
        severity: 'warning',
        flaggedText: m.match,
        startOffset: m.start,
        endOffset: m.end,
        ruleId: item.ruleId,
        ruleName: item.name,
        whyFlagged: item.why,
        confidence: 'High',
        origin: 'Rule-based',
        suggestions: [
          sug(
            `Replace with "${item.replacement}"`,
            item.replacement,
            'Yes',
            'Matches the brand guide and keeps the sentence natural.'
          ),
        ],
        decision: { status: 'pending' },
      } as Finding);
    }
  }

  // 3a. F1 savings rate
  const f1 = facts.find(f => f.id === 'F1');
  const f1Value = f1 ? parseFloat(String(f1.value)) : Number.NaN;
  const hasVerifiedF1Rate = Number.isFinite(f1Value);

  const rateRegex =
    /(\d+(?:\.\d+)?)\s*%\s*(?:(?:p\.a\.|pa\b)|(?:guaranteed[\s-]+)?returns|interest)/gi;

  let rm: RegExpExecArray | null;

  while ((rm = rateRegex.exec(content)) !== null) {
    const stated = parseFloat(rm[1]);

    if (hasVerifiedF1Rate && stated === f1Value) continue;

    const text = rm[0];

    findings.push({
      id: uid('finding-rule'),
      category: 'Claim',
      severity: 'error',
      flaggedText: text,
      startOffset: rm.index,
      endOffset: rm.index + text.length,
      ruleId: hasVerifiedF1Rate
        ? `Ledger F1 · Verified rate: ${f1!.value}`
        : 'Ledger F1 · Missing verified rate',
      ruleName: 'Fact Mismatch: Savings Interest Rate',
      whyFlagged: hasVerifiedF1Rate
        ? `Claim Ledger F1 records the savings rate as ${f1!.value} (valid until ${f1?.validUntil ?? 'date not supplied'}). "${text}" does not match it.`
        : `No valid F1 savings-rate value is present in the claim ledger. "${text}" is an unverified financial rate and must not be published until checked against an approved source.`,
      confidence: 'High',
      origin: 'Rule-based',
      isHighRisk: true,
      suggestions: hasVerifiedF1Rate
        ? [
            sug(
              `Replace with verified "${f1!.value}"`,
              String(f1!.value),
              'Yes',
              'Uses the rate recorded in the supplied claim ledger.'
            ),
          ]
        : [],
      decision: { status: 'pending' },
    } as Finding);
  }

  // 3b. F2 festive offer
  const f2 = facts.find(f => f.id === 'F2');
  const isF2Expired = f2 ? f2.validUntil < currentDate : true;

  if (isF2Expired) {
    const matches = [
      ...findOccurrences(content, 'festive offer'),
      ...findOccurrences(content, '5% rewards')
    ];

    for (const m of matches) {
      if (covered(findings, m.start, m.end)) continue;

      findings.push({
        id: uid('finding-rule'),
        category: 'Stale fact',
        severity: 'warning',
        flaggedText: m.match,
        startOffset: m.start,
        endOffset: m.end,
        ruleId: `Ledger F2 · expired ${f2?.validUntil ?? '31 Oct 2026'}`,
        ruleName: 'Stale Fact: Festive Spend Offer',
        whyFlagged: `Claim Ledger F2 expired on ${f2?.validUntil ?? '2026-10-31'} (today is ${currentDate}). Advertising an expired offer risks a false-advertising complaint.`,
        confidence: 'High',
        origin: 'Rule-based',
        isHighRisk: true,
        suggestions: [
          sug(
            'Remove the expired figure, use evergreen copy',
            'Exclusive rewards on every spend',
            'Partly',
            'Drops the expired rate and keeps the spend incentive.'
          ),
        ],
        decision: { status: 'pending' },
      } as Finding);
    }
  }

  // 3c. F3 account-holder count
  const f3 = facts.find(f => f.id === 'F3');
  const isF3Expired = f3 ? f3.validUntil < currentDate : true;

  if (isF3Expired) {
    for (const m of findOccurrences(content, '2.1 million')) {
      findings.push({
        id: uid('finding-rule'),
        category: 'Stale fact',
        severity: 'warning',
        flaggedText: m.match,
        startOffset: m.start,
        endOffset: m.end,
        ruleId: `Ledger F3 · expired ${f3?.validUntil ?? '30 Sep 2026'}`,
        ruleName: 'Stale Fact: Account Holder Count',
        whyFlagged: `Claim Ledger F3 ("2.1 million") expired on ${f3?.validUntil ?? '2026-09-30'}.`,
        confidence: 'High',
        origin: 'Rule-based',
        suggestions: [
          sug(
            'Use a rounded, qualitative phrase',
            'a growing community of',
            'Partly',
            'Keeps social proof without the expired number.'
          ),
        ],
        decision: { status: 'pending' },
      } as Finding);
    }
  }

  // 3d. Unsupported certifications
  for (const cert of ['SOC 2', 'SOC-2', 'PCI-DSS Level 1']) {
    for (const m of findOccurrences(content, cert)) {
      findings.push({
        id: uid('finding-rule'),
        category: 'Claim',
        severity: 'warning',
        flaggedText: m.match,
        startOffset: m.start,
        endOffset: m.end,
        ruleId: 'Claim-2.4 / Ledger F4',
        ruleName: 'Unsupported Security Certification',
        whyFlagged: `Claim Ledger F4 lists only "ISO 27001 certified". "${m.match}" is not on the approved certification list.`,
        confidence: 'High',
        origin: 'Rule-based',
        suggestions: [
          sug(
            'Replace with approved "ISO 27001 certified"',
            'ISO 27001 certified',
            'Yes',
            'States only the certification we hold.'
          ),
        ],
        decision: { status: 'pending' },
      } as Finding);
    }
  }

  // 4. Unsupported superlatives
  const superlatives = [
    { term: 'the cheapest', alt: 'transparent and affordable' },
    { term: 'cheapest', alt: 'affordable' },
    { term: 'best', alt: 'premier' },
    { term: 'fastest', alt: 'seamless' },
    { term: 'safest', alt: 'highly secure' },
    { term: '#1', alt: 'top-rated' },
    { term: 'number one', alt: 'acclaimed' },
  ];

  for (const s of superlatives) {
    for (const m of findOccurrences(content, s.term)) {
      if (covered(findings, m.start, m.end)) continue;

      findings.push({
        id: uid('finding-rule'),
        category: 'Claim',
        severity: 'warning',
        flaggedText: m.match,
        startOffset: m.start,
        endOffset: m.end,
        ruleId: 'Claim-2.5',
        ruleName: 'Unsupported Superlative',
        whyFlagged: `"${m.match}" is a comparative claim with no supporting evidence on file.`,
        confidence: 'High',
        origin: 'Rule-based',
        suggestions: [
          sug(
            `Replace with "${s.alt}"`,
            s.alt,
            'Yes',
            'Keeps a positive message without an unproven comparison.'
          ),
        ],
        decision: { status: 'pending' },
      } as Finding);
    }
  }

  // 5. Tone heuristics: punctuation & all-caps
  const exclaimRegex = /(!{2,})/g;
  let ex: RegExpExecArray | null;

  while ((ex = exclaimRegex.exec(content)) !== null) {
    findings.push({
      id: uid('finding-rule'),
      category: 'Tone',
      severity: 'warning',
      flaggedText: ex[1],
      startOffset: ex.index,
      endOffset: ex.index + ex[1].length,
      ruleId: 'Tone-3.1',
      ruleName: 'Excessive Punctuation',
      whyFlagged: 'Multiple exclamation marks conflict with the calm, authoritative brand voice.',
      confidence: 'High',
      origin: 'Rule-based',
      suggestions: [
        sug('Replace with a period', '.', 'Yes', 'Restores a calm tone.')
      ],
      decision: { status: 'pending' },
    } as Finding);
  }

  const capsRegex = /\b([A-Z]{4,})\b/g;
  const capsWhitelist = ['LUMEN', 'CISO', 'ALCO', 'ISO', 'BANK', 'NEFT', 'RTGS', 'IMPS'];
  let cm: RegExpExecArray | null;

  while ((cm = capsRegex.exec(content)) !== null) {
    const word = cm[1];
    if (capsWhitelist.includes(word)) continue;

    const start = cm.index;
    const end = start + word.length;
    if (covered(findings, start, end)) continue;

    const lower = word.charAt(0) + word.slice(1).toLowerCase();

    findings.push({
      id: uid('finding-rule'),
      category: 'Tone',
      severity: 'warning',
      flaggedText: word,
      startOffset: start,
      endOffset: end,
      ruleId: 'Tone-3.1',
      ruleName: 'All-Caps Shouting',
      whyFlagged: `All-caps wording ("${word}") reads as shouting.`,
      confidence: 'High',
      origin: 'Rule-based',
      suggestions: [
        sug(
          `Use "${lower}"`,
          lower,
          'Yes',
          'Removes shouting effect.'
        )
      ],
      decision: { status: 'pending' },
    } as Finding);
  }

  // 7. High-risk financial return claims & absolute zero risk
  const highRiskReturnRegex = /(?:\d+(?:\.\d+)?%)\s*(?:fixed|predictable|guaranteed).*?(?:zero risk|risk-free|instant liquidity)|absolute zero risk/gi;
  let hrMatch: RegExpExecArray | null;
  while ((hrMatch = highRiskReturnRegex.exec(content)) !== null) {
    const text = hrMatch[0];
    if (covered(findings, hrMatch.index, hrMatch.index + text.length)) continue;
    findings.push({
      id: uid('finding-rule'),
      category: 'Claim',
      severity: 'error',
      flaggedText: text,
      startOffset: hrMatch.index,
      endOffset: hrMatch.index + text.length,
      ruleId: 'Claim-2.6',
      ruleName: 'Misleading Financial Return & Zero-Risk Claim',
      whyFlagged: `"${text}" promises fixed high returns with zero risk or instant liquidity, which violates financial advertising and regulatory compliance standards.`,
      confidence: 'High',
      origin: 'Rule-based',
      isHighRisk: true,
      suggestions: [
        sug('Remove absolute return and risk-free claims', 'market-linked returns with standard investment risk', 'Yes', 'Brings the claim into compliance with regulatory standards.')
      ],
      decision: { status: 'pending' },
    } as Finding);
  }

  // 8. Unprofessional tone, insults, and manufactured urgency
  const unprofessionalToneRegex = /\b(idiot|stupid|insane|secret deal|vanishes forever|hurry)\b/gi;
  let utMatch: RegExpExecArray | null;
  while ((utMatch = unprofessionalToneRegex.exec(content)) !== null) {
    const text = utMatch[0];
    if (covered(findings, utMatch.index, utMatch.index + text.length)) continue;
    findings.push({
      id: uid('finding-rule'),
      category: 'Tone',
      severity: 'error',
      flaggedText: text,
      startOffset: utMatch.index,
      endOffset: utMatch.index + text.length,
      ruleId: 'Tone-3.3',
      ruleName: 'Unprofessional Tone & Urgency Pressure',
      whyFlagged: `"${text}" contains unprofessional language or manufactured urgency pressure that breaches brand tone guidelines.`,
      confidence: 'High',
      origin: 'Rule-based',
      isHighRisk: true,
      suggestions: [
        sug('Remove or rephrase with professional brand tone', 'explore our exclusive offer', 'Yes', 'Maintains professional communication standards.')
      ],
      decision: { status: 'pending' },
    } as Finding);
  }

  // 6. Visual checks
  if (imageAsset) findings.push(...checkVisualAssets(imageAsset));

  return findings;
}

/**
 * Offline keyword heuristics for tone/claim phrases.
 */
function checkPhraseHeuristics(content: string): Finding[] {
  const out: Finding[] = [];

  const add = (
    m: { start: number; end: number; match: string },
    category: Finding['category'],
    severity: Finding['severity'],
    ruleId: string,
    ruleName: string,
    why: string,
    suggestions: Suggestion[],
    extra: Partial<Finding> = {}
  ) => {
    if (covered(out, m.start, m.end)) return;

    out.push({
      id: uid('finding-heur'),
      category,
      severity,
      flaggedText: m.match,
      startOffset: m.start,
      endOffset: m.end,
      ruleId,
      ruleName: `${ruleName} (keyword heuristic)`,
      whyFlagged: why,
      confidence: 'Low',
      origin: 'Rule-based',
      suggestions,
      decision: { status: 'pending' },
      ...extra,
    } as Finding);
  };

  const condescending = [
    { phrase: 'only fools', replacement: 'Many account holders look to' },
    { phrase: 'obviously', replacement: 'Notably' },
    { phrase: "don't be stupid", replacement: 'Consider reviewing' },
    { phrase: 'amateurs', replacement: 'First-time savers' },
    { phrase: 'anyone with half a brain', replacement: 'Astute savers' },
  ];

  for (const c of condescending)
    for (const m of findOccurrences(content, c.phrase))
      add(
        m,
        'Tone',
        'error',
        'Tone-3.2',
        'Condescending Framing',
        `The phrase "${m.match}" matched patronizing wording.`,
        [
          sug(
            `Rephrase as "${c.replacement}"`,
            c.replacement,
            'Partly',
            'Keeps commercial intent with respectful wording.'
          )
        ]
      );

  const slang = [
    { phrase: 'hey bro, wanna make some serious cash', replacement: 'Explore higher-yielding savings options' },
    { phrase: 'hey bro', replacement: 'Hello' },
    { phrase: 'make some serious cash', replacement: 'grow your savings' },
    { phrase: '100x gains', replacement: 'long-term growth' },
    { phrase: 'no cap', replacement: 'honestly' },
    { phrase: 'fam', replacement: 'friends' },
  ];

  for (const s of slang)
    for (const m of findOccurrences(content, s.phrase))
      add(
        m,
        'Tone',
        'warning',
        'Tone-3.2',
        'Off-Voice Slang',
        `"${m.match}" matched casual slang.`,
        [
          sug(
            `Rephrase as "${s.replacement}"`,
            s.replacement,
            'Partly',
            'Keeps message in a professional register.'
          )
        ]
      );

  return out;
}

// ---------- backend call ----------

const BACKEND_TIMEOUT_MS = 15000;

function normaliseFinding(raw: any): Finding {
  return {
    ...raw,
    startOffset: raw.startOffset ?? raw.start_offset ?? 0,
    endOffset: raw.endOffset ?? raw.end_offset ?? 0,
    flaggedText: raw.flaggedText ?? raw.flagged_text ?? '',
    ruleId: raw.ruleId ?? raw.rule_id ?? '',
    ruleName: raw.ruleName ?? raw.rule_name ?? '',
    whyFlagged: raw.whyFlagged ?? raw.why_flagged ?? '',
    isHighRisk: raw.isHighRisk ?? raw.is_high_risk ?? false,
    isAbstain: raw.isAbstain ?? raw.is_abstain ?? false,
    suggestions: raw.suggestions ?? [],
    decision: raw.decision ?? { status: 'pending' },
  } as Finding;
}

export async function reviewWithBackend(
  content: string,
  intent: string = '',
  channel: string = '',
  facts: FactItem[] = []
): Promise<{ findings: Finding[]; meta?: any } | null> {
  if (!API_BASE) return null; // no backend configured: use local rule engine
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, intent, channel, facts }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[Canon] /api/review failed: ${response.status}`, body);
      return null;
    }

    const data = await response.json();

    if (!Array.isArray(data.findings)) {
      console.error('[Canon] /api/review returned no "findings" array', data);
      return null;
    }

    return { findings: data.findings.map(normaliseFinding), meta: data.meta };

  } catch (err) {
    console.error('[Canon] backend unreachable, using local fallback', err);
    return null;

  } finally {
    clearTimeout(timer);
  }
}

/**
 * Master pipeline.
 */
export async function runCanonEngine(
  content: string,
  facts: FactItem[],
  intent: string = '',
  imageAsset?: ImageAssetData,
  currentDate: string = CURRENT_DATE_STRING,
  channel: string = ''
): Promise<{ findings: Finding[]; aiNotice: boolean; meta?: any }> {
  const localRules = checkRuleBased(content, facts, imageAsset, currentDate);
  const backend = await reviewWithBackend(content, intent, channel, facts);

  let findings: Finding[];
  let aiNotice: boolean;

  if (backend) {
    findings = [
      ...localRules,
      ...checkPhraseHeuristics(content)
    ];

    for (const finding of backend.findings) {
      const duplicate = findings.some(
        existing =>
          existing.startOffset === finding.startOffset &&
          existing.endOffset === finding.endOffset &&
          existing.ruleId === finding.ruleId
      );

      if (!duplicate) findings.push(finding);
    }

    aiNotice = false;

  } else {
    findings = [...localRules];
    const heuristics = checkPhraseHeuristics(content);

    for (const heuristic of heuristics) {
      const duplicate = findings.some(
        existing =>
          existing.startOffset === heuristic.startOffset &&
          existing.endOffset === heuristic.endOffset &&
          existing.ruleId === heuristic.ruleId
      );

      if (!duplicate) findings.push(heuristic);
    }

    aiNotice = true;
  }

  findings.sort((a, b) => a.startOffset - b.startOffset);

  return { findings, aiNotice, meta: backend?.meta };
}

/**
 * Apply a suggestion's replacement text to the content.
 */
export function applySuggestionToContent(
  originalContent: string,
  finding: Finding,
  replacementText: string
): string {
  const start = finding.startOffset;
  const end = finding.endOffset;

  if (
    start >= 0 &&
    end > start &&
    originalContent.substring(start, end) === finding.flaggedText
  ) {
    return (
      originalContent.substring(0, start) +
      replacementText +
      originalContent.substring(end)
    );
  }

  const matchIndex = originalContent.indexOf(finding.flaggedText);

  if (matchIndex !== -1) {
    return (
      originalContent.substring(0, matchIndex) +
      replacementText +
      originalContent.substring(matchIndex + finding.flaggedText.length)
    );
  }

  return originalContent;
}
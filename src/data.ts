/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FactItem, BrandRule, SavedContentItem, Channel } from './types';

// The verified brand palette
export const BRAND_PALETTE = {
  white: '#FFFFFF',
  navy: '#0B3D91',
  gold: '#FFC107',
  charcoal: '#1A1A1A',
  paleBlue: '#F4F6FA',
  paper: '#FAF7F2',
  tealPrimary: '#0F5C5C',
};

export const APPROVED_BG_COLORS = [
  { hex: '#FFFFFF', name: 'Studio White' },
  { hex: '#0B3D91', name: 'Lumen Navy' },
  { hex: '#FFC107', name: 'Lumen Gold' },
  { hex: '#1A1A1A', name: 'Charcoal' },
  { hex: '#F4F6FA', name: 'Pale Canvas' },
];

// Real current date (YYYY-MM-DD), so expiry checks are always correct.
export const CURRENT_DATE_STRING = new Date().toISOString().slice(0, 10);

/**
 * CONFIGURATION, NOT MOCK DATA: the approved facts for the fictional brand "Lumen Bank".
 * A fact's status is computed from its valid-until date, never hard-coded.
 */
const RAW_FACTS: FactItem[] = [
  {
    id: 'F1',
    fact: 'Savings interest rate',
    value: '6.5% p.a.',
    source: 'ALCO Treasury Circular 2026/04',
    owner: 'Treasury Dept',
    validUntil: '2026-12-31',
    status: 'Valid',
  },
  {
    id: 'F2',
    fact: 'Festive offer rewards rate',
    value: '5% rewards',
    source: 'Q3 Promo Campaign Sheet',
    owner: 'Marketing Ops',
    validUntil: '2026-10-31',
    status: 'Valid',
  },
  {
    id: 'F3',
    fact: 'Total verified account holders',
    value: '2.1 million',
    source: 'Q3 Audited Metrics',
    owner: 'Investor Relations',
    validUntil: '2026-09-30',
    status: 'Valid',
  },
  {
    id: 'F4',
    fact: 'Information security audit',
    value: 'ISO 27001 certified',
    source: 'BSI Audit Cert 8829',
    owner: 'CISO Office',
    validUntil: '2027-03-31',
    status: 'Valid',
  },
  {
    id: 'F5',
    fact: 'Phone support availability',
    value: '8am - 8pm IST',
    source: 'Service Operations SLA',
    owner: 'Support Ops',
    validUntil: '2027-12-31',
    status: 'Valid',
  },
  {
    id: 'F6',
    fact: 'Minimum balance requirement',
    value: 'None (zero balance)',
    source: 'Product Policy v2',
    owner: 'Retail Banking',
    validUntil: '2027-12-31',
    status: 'Valid',
  },
];

export const INITIAL_FACTS: FactItem[] = RAW_FACTS.map(f => ({
  ...f,
  status: (f.validUntil < CURRENT_DATE_STRING ? 'Expired' : 'Valid') as FactItem['status'],
}));

/**
 * CONFIGURATION: the brand rules (Canon) for the fictional brand "Lumen Bank".
 */
export const INITIAL_RULES: BrandRule[] = [
  {
    id: 'Term-1.1',
    category: 'Terminology',
    name: 'Banned Guarantee Claims',
    version: 'Canon v4.2',
    summary: 'Prohibit "guaranteed", "guaranteed returns", "risk-free", and "free money".',
    description: 'Financial regulations strictly prohibit promising absolute or guaranteed investment returns without statutory disclosures.',
    passExample: 'Competitive interest rates with capital protection per RBI guidelines.',
    failExample: 'Guaranteed 8% returns with zero risk.',
    owner: 'Compliance & Legal',
    requiresAuthorizedReviewer: true,
  },
  {
    id: 'Term-1.2',
    category: 'Terminology',
    name: 'Official Product Nomenclature',
    version: 'Canon v4.1',
    summary: 'Use "Lumen Savings", never "Lumen Saver".',
    description: 'The retail banking tier was consolidated into Lumen Savings to maintain regulatory filing consistency.',
    passExample: 'Open a Lumen Savings account.',
    failExample: 'Check out the new Lumen Saver.',
    owner: 'Brand Strategy',
  },
  {
    id: 'Term-1.3',
    category: 'Terminology',
    name: 'Customer vs Account Holder',
    version: 'Canon v3.9',
    summary: 'Refer to banking clients as "account holder(s)", not "customer(s)".',
    description: 'Emphasizes financial partnership and institutional fiduciary duty over transactional terminology.',
    passExample: 'Trusted by over 2 million account holders.',
    failExample: 'Serving millions of happy customers.',
    owner: 'Brand Voice',
  },
  {
    id: 'Term-1.4',
    category: 'Terminology',
    name: 'Rewards vs Cashback',
    version: 'Canon v4.0',
    summary: 'Use "rewards", never "cashback".',
    description: '"Cashback" implies unbacked speculative rebate programs; "rewards" reflects the registered Lumen loyalty currency.',
    passExample: 'Earn 5% rewards on all dining transactions.',
    failExample: 'Get 5% cashback on your card.',
    owner: 'Card Products',
  },
  {
    id: 'Claim-2.1',
    category: 'Claims & Disclosures',
    name: 'Verified Savings Interest Rate',
    version: 'Canon v4.2',
    summary: 'Interest rates must match Treasury Claim Ledger F1 (current 6.5% p.a.).',
    description: 'Any published interest figure must quote the verified ALCO rate. Misquoted rates violate consumer protection laws.',
    passExample: 'Earn up to 6.5% p.a. on your savings balance.',
    failExample: 'Grow your money with 8% p.a. returns.',
    owner: 'Treasury & Compliance',
    requiresAuthorizedReviewer: true,
  },
  {
    id: 'Claim-2.2',
    category: 'Claims & Disclosures',
    name: 'Promotional Offer Validity',
    version: 'Canon v4.2',
    summary: 'Promotional campaigns must be currently valid per Claim Ledger F2.',
    description: 'Campaigns that have passed their valid-until date must not be promoted to avoid false advertising liabilities.',
    passExample: 'Special festive reward tiers during October.',
    failExample: 'Get 5% rewards this month (campaign expired 31 Oct 2026).',
    owner: 'Marketing Ops',
    requiresAuthorizedReviewer: true,
  },
  {
    id: 'Claim-2.3',
    category: 'Claims & Disclosures',
    name: 'Institutional Scale & Audited Counts',
    version: 'Canon v4.1',
    summary: 'User counts must reference unexpired audited numbers (Ledger F3).',
    description: 'Public metrics must reflect audited filings. Outdated counts deceive prospective clients.',
    passExample: 'Growing community across India.',
    failExample: 'Trusted by 2.1 million customers (audited date expired Sep 2026).',
    owner: 'Investor Relations',
  },
  {
    id: 'Claim-2.4',
    category: 'Claims & Disclosures',
    name: 'Approved Security Certifications',
    version: 'Canon v4.0',
    summary: 'Only cite verified certifications (ISO 27001). Do not claim SOC 2 or unverified standards.',
    description: 'Lumen Bank holds ISO 27001 certification. Certifications not issued by accredited registrars are misleading.',
    passExample: 'Bank with peace of mind on our ISO 27001 certified core.',
    failExample: 'SOC 2 Type II compliant cloud banking.',
    owner: 'CISO Office',
  },
  {
    id: 'Claim-2.5',
    category: 'Claims & Disclosures',
    name: 'Unsupported Superlatives',
    version: 'Canon v4.0',
    summary: 'Ban unsubstantiated superlatives: "best", "fastest", "cheapest", "safest", "#1".',
    description: 'Comparative superlatives require independent industry benchmark citations in the same copy block.',
    passExample: 'Designed for low fees and transparent pricing.',
    failExample: 'The cheapest banking app in India!',
    owner: 'Legal & Regulatory',
  },
  {
    id: 'Tone-3.1',
    category: 'Voice & Tone',
    name: 'Editorial Restraint & Punctuation',
    version: 'Canon v3.8',
    summary: 'No all-caps shouting and no multiple exclamation points (!!, !!!).',
    description: 'Lumen speaks with quiet institutional assurance. Shouting and aggressive punctuation erode financial trust.',
    passExample: 'Start saving in under five minutes.',
    failExample: 'OPEN NOW FOR AMAZING PERKS!!!',
    owner: 'Brand Voice',
  },
  {
    id: 'Tone-3.2',
    category: 'Voice & Tone',
    name: 'Respectful Financial Partnership',
    version: 'Canon v4.2',
    summary: 'Avoid condescending statements ("only fools", "amateurs") and juvenile slang ("hey bro").',
    description: 'We treat our account holders with respect. We never insult their current financial habits or employ crypto hype jargon.',
    passExample: 'Put your idle cash to work with predictable returns.',
    failExample: 'Only fools leave their money idle in regular accounts.',
    owner: 'Brand Voice',
  },
  {
    id: 'A11y-4.1',
    category: 'Visual & A11y',
    name: 'WCAG AA Color Contrast',
    version: 'Canon v4.1',
    summary: 'Text and background combinations must achieve at least 4.5:1 contrast ratio.',
    description: 'Essential for accessibility compliance and digital legibility across diverse screen lighting conditions.',
    passExample: 'Dark navy (#0B3D91) text on white background (contrast > 10:1).',
    failExample: 'Light grey text (#999999) on white background (contrast 2.8:1).',
    owner: 'Design Systems',
  },
  {
    id: 'A11y-4.2',
    category: 'Visual & A11y',
    name: 'Alternative Text for Imagery',
    version: 'Canon v4.0',
    summary: 'All marketing graphics and social banners must provide informative alt text.',
    description: 'Ensures screen reader accessibility for visually impaired account holders.',
    passExample: 'Photograph of hands holding a debit card with Lumen emblem.',
    failExample: '[Missing alt text / empty alt attribute].',
    owner: 'Design Systems',
  },
];

/**
 * SAMPLE ITEMS used to demonstrate Ripple. These are labelled as samples in the UI:
 * fictional brand, no real people or campaigns. Their status is computed in App.tsx
 * from the Claim Ledger, not hard-coded.
 */
export const INITIAL_SAVED_ITEMS: SavedContentItem[] = [
  {
    id: 'SAVED-01',
    title: 'Sample: Festive Spend Ad',
    channel: 'Ad',
    content: 'Get 5% rewards on every retail spend this festive week! Join 2.1 million customers enjoying our ISO 27001 certified platform.',
    dependsOnFactIds: ['F2', 'F3', 'F4'],
    lastChecked: '—',
    status: 'clean',
    author: 'Sample item',
  },
  {
    id: 'SAVED-02',
    title: 'Sample: Homepage Hero Banner',
    channel: 'Web page',
    content: 'Open a Lumen Savings account today. Earn 6.5% p.a. on your daily balance with zero minimum balance requirement.',
    dependsOnFactIds: ['F1', 'F6'],
    lastChecked: '—',
    status: 'clean',
    author: 'Sample item',
  },
  {
    id: 'SAVED-03',
    title: 'Sample: Savings Account Flyer',
    channel: 'Email',
    content: 'Looking for disciplined savings? Lumen Savings provides 6.5% p.a. returns with no minimum balance penalties.',
    dependsOnFactIds: ['F1', 'F6'],
    lastChecked: '—',
    status: 'clean',
    author: 'Sample item',
  },
  {
    id: 'SAVED-04',
    title: 'Sample: Support Portal SLA',
    channel: 'Web page',
    content: 'Need help with your account? Our phone support team is available 8am - 8pm IST every day of the week.',
    dependsOnFactIds: ['F5'],
    lastChecked: '—',
    status: 'clean',
    author: 'Sample item',
  },
  {
    id: 'SAVED-05',
    title: 'Sample: Investor One-Pager',
    channel: 'Web page',
    content: 'Lumen Bank is ISO 27001 certified and proudly serves 2.1 million verified account holders across Tier 1 & 2 cities.',
    dependsOnFactIds: ['F3', 'F4'],
    lastChecked: '—',
    status: 'clean',
    author: 'Sample item',
  },
  {
    id: 'SAVED-06',
    title: 'Sample: Welcome Onboarding Email',
    channel: 'Email',
    content: 'Welcome to Lumen Savings! Your account has no minimum balance requirement. Call us at 8am - 8pm IST if you need setup help.',
    dependsOnFactIds: ['F1', 'F5', 'F6'],
    lastChecked: '—',
    status: 'clean',
    author: 'Sample item',
  },
];

export interface SampleItem {
  id: string;
  name: string;
  shortDesc: string;
  content: string;
  intent: string;
  channel: Channel;
  image?: {
    textColor: string;
    bgColor: string;
    altText: string;
  };
}

/** Sample inputs. They only fill the form; they are not results. */
export const SAMPLE_DATA: SampleItem[] = [
  {
    id: 'sample-clean',
    name: 'Sample 1: Clean Copy',
    shortDesc: 'Approved wording & verified rate',
    content: 'Open a Lumen Savings account in minutes. Earn 6.5% p.a. with no monthly fee.',
    intent: 'Announce simple savings account with attractive interest rate',
    channel: 'Web page',
  },
  {
    id: 'sample-multi-issue',
    name: 'Sample 2: Multiple Issues',
    shortDesc: 'Banned term, fact mismatch, superlative',
    content: 'Lumen Saver: guaranteed 8% returns, the cheapest in India!',
    intent: 'Promote high interest savings account for young professionals',
    channel: 'Ad',
  },
  {
    id: 'sample-stale-facts',
    name: 'Sample 3: Stale Facts & Naming',
    shortDesc: 'Expired ledger items and customer terminology',
    content: 'Festive offer: get 5% rewards on every spend this month! Trusted by 2.1 million customers.',
    intent: 'Drive festive card spending with social proof',
    channel: 'Social post',
  },
  {
    id: 'sample-ai-tone',
    name: 'Sample 4: Off-Voice & Hype',
    shortDesc: 'Condescending tone, slang, implied guarantee',
    content: 'Only fools leave their money idle in a regular savings account. Hey bro, wanna make some serious cash with never lets you down guarantees? Experts agree this beats inflation.',
    intent: 'Urge users to move idle cash into higher yield savings',
    channel: 'Email',
  },
  {
    id: 'sample-image-a11y',
    name: 'Sample 5: Visual & Contrast Defect',
    shortDesc: 'Low contrast text and missing alt text',
    content: 'Lumen Savings: Bank with clarity and confidence on every transaction.',
    intent: 'Display brand hero banner on mobile banking app',
    channel: 'Web page',
    image: {
      textColor: '#999999', // low-contrast light grey
      bgColor: '#FFFFFF',
      altText: '', // missing alt text
    },
  },
];
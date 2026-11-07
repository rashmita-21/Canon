/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'creator' | 'reviewer';

export type Channel = 'Social post' | 'Email' | 'Ad' | 'Web page';

export type WorkflowStatus = 'Draft' | 'Checked' | 'In review' | 'Approved' | 'Changes requested';

export type FindingCategory = 
  | 'Terminology' 
  | 'Claim' 
  | 'Stale fact' 
  | 'Tone' 
  | 'Accessibility' 
  | 'Visual' 
  | 'Guideline Gap';
  

export type Severity = 'error' | 'warning' | 'gap';

export type Confidence = 'High' | 'Medium' | 'Low';

export type Origin = 'Rule-based' | 'AI-assisted';

export interface IntentPreserved {
  status: 'Yes' | 'Partly';
  explanation: string;
}

export interface Suggestion {
  id: string;
  replacementText: string;
  label: string;
  intentPreserved: IntentPreserved;
}

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: Severity;
  flaggedText: string;
  startOffset: number;
  endOffset: number;
  ruleId: string; // e.g. "Term-1.1" or "Ledger F2 · expired 31 Oct 2026"
  ruleName: string;
  whyFlagged: string;
  confidence: Confidence;
  origin: Origin;
  isHighRisk?: boolean; // financial or legal claims requiring authorized reviewer
  suggestions: Suggestion[];
  isAbstain?: boolean; // "No rule covers this" gap
  decision: {
    status: 'pending' | 'accepted' | 'kept' | 'disputed';
    acceptedSuggestionId?: string;
    reason?: string;
    customReplacement?: string;
  };
}

export interface FactItem {
  id: string; // e.g. "F1", "F2"
  fact: string;
  value: string;
  source: string;
  owner: string;
  validUntil: string; // YYYY-MM-DD
  status: 'Valid' | 'Expiring soon' | 'Expired';
}

export interface SavedContentItem {
  id: string;
  title: string;
  channel: Channel;
  content: string;
  dependsOnFactIds: string[];
  lastChecked: string;
  status: 'clean' | 'has_issues' | 'stale';
  author: string;
}

export interface BrandRule {
  id: string;
  category: 'Terminology' | 'Claims & Disclosures' | 'Voice & Tone' | 'Visual & A11y' | 'Editorial';
  name: string;
  version: string;
  summary: string;
  description: string;
  passExample: string;
  failExample: string;
  owner: string;
  requiresAuthorizedReviewer?: boolean;
}

export interface RevisionRecord {
  id: string;
  timestamp: string;
  authorRole: Role;
  summary: string;
  diffBefore: string;
  diffAfter: string;
}

export interface CommentItem {
  id: string;
  timestamp: string;
  author: string;
  role: Role;
  text: string;
  findingId?: string;
}

export interface ImageAssetData {
  fileName?: string;
  dataUrl?: string;
  altText: string;
  textColor: string;
  bgColor: string;
}

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  textColor: string;
  bgColor: string;
  isBrandBg: boolean;
}

export interface BrandPassport {
  recordId: string;
  contentTitle: string;
  channel: Channel;
  intent: string;
  timestamp: string;
  approvedBy: string;
  rulesVersion: string;
  factSnapshotSummary: string[];
  aiDisclosure: string;
  auditHash: string;
  finalContent: string;
    decisionSummary?: string[];
}

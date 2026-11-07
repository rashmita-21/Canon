/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrandPassport } from '../types';
import { Check, Copy, ShieldCheck } from 'lucide-react';

interface BrandPassportModalProps {
  passport: BrandPassport | null;
  onClose: () => void;
}

export const BrandPassportModal: React.FC<BrandPassportModalProps> = ({
  passport,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!passport) return null;

  const decisions = passport.decisionSummary ?? [];

  const passportPlainText = `=== CANON BRAND PASSPORT ===
Record ID: ${passport.recordId}
Status: APPROVED
Approved At: ${passport.timestamp}
Approved By: ${passport.approvedBy}
Rules Version: ${passport.rulesVersion}
Channel: ${passport.channel}
Content Intent: "${passport.intent}"
Audit Fingerprint: ${passport.auditHash}

--- VERIFIED CONTENT ---
${passport.finalContent}

--- FINDINGS AND DECISIONS ---
${decisions.map(d => `  • ${d}`).join('\n')}

--- GOVERNANCE DISCLOSURE ---
AI Layer: ${passport.aiDisclosure}
Ledger Facts:
${passport.factSnapshotSummary.map(f => `  • ${f}`).join('\n')}

Issued by Canon Governance Desk · Human in the loop verified
============================`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(passportPlainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passport-modal-title"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E3DDD2] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        <div className="relative p-6 bg-[#FAF7F2] border-b border-[#E3DDD2] overflow-hidden">

          <div className="absolute right-6 top-5 pointer-events-none">
            <div className="stamp-badge border-4 border-[#1F6B3A] rounded-lg px-4 py-1.5 text-center bg-[#E2F2E7]/70 shadow-md">
              <span className="font-serif text-lg font-black tracking-widest text-[#1F6B3A] block">
                APPROVED
              </span>
              <span className="font-mono text-[9px] text-[#1F6B3A] font-semibold block tracking-tight">
                CANON GOVERNANCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-[#0F5C5C]" />
            <h2 id="passport-modal-title" className="font-serif text-xl font-bold text-[#1B1B1F]">
              Brand Passport
            </h2>
          </div>
          <p className="text-xs text-[#5B5B63]">
            Record of what was checked, what was decided, and by whom. Generated in the browser for this demo.
          </p>

          <div className="mt-3 flex items-center gap-3 font-mono text-xs text-[#1B1B1F]">
            <span className="bg-white px-2 py-0.5 rounded border border-[#E3DDD2]">
              {passport.recordId}
            </span>
            <span className="text-[#5B5B63]">
              {passport.rulesVersion}
            </span>
            <span className="text-[#5B5B63]">
              · {passport.channel}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto text-xs">

          <div>
            <label className="text-[11px] font-semibold text-[#5B5B63] uppercase tracking-wider block mb-1">
              Final Approved Copy
            </label>
            <div className="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#E3DDD2] font-serif text-sm text-[#1B1B1F] leading-relaxed">
              "{passport.finalContent}"
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#FAF7F2] border border-[#E3DDD2]">
            <div>
              <span className="text-[10px] text-[#5B5B63] uppercase block">Reviewer</span>
              <span className="font-medium text-[#1B1B1F]">{passport.approvedBy}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#5B5B63] uppercase block">Timestamp</span>
              <span className="font-mono text-[#1B1B1F]">{passport.timestamp}</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-[#5B5B63] uppercase block">Author Intent</span>
              <span className="italic text-[#1B1B1F]">"{passport.intent}"</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] text-[#5B5B63] uppercase block">Content Fingerprint</span>
              <span className="font-mono text-[10px] text-[#1B1B1F] break-all">{passport.auditHash}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#E8F3F3] border border-[#0F5C5C]/20 text-[#0F5C5C]">
            <span className="font-semibold block mb-0.5">AI Disclosure</span>
            <p className="text-[11px] leading-snug">
              {passport.aiDisclosure}
            </p>
          </div>

          {decisions.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-[#5B5B63] uppercase tracking-wider block mb-1">
                Findings and Decisions
              </span>
              <ul className="space-y-1 text-[#1B1B1F] text-[11px] bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E3DDD2]">
                {decisions.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <span className="text-[11px] font-semibold text-[#5B5B63] uppercase tracking-wider block mb-1">
              Ledger Facts
            </span>
            <ul className="space-y-1 text-[#1B1B1F] text-[11px] bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E3DDD2]">
              {passport.factSnapshotSummary.map((f, i) => (
                <li key={i} className="flex items-center gap-1.5 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F6B3A]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

        </div>

        <div className="p-4 bg-[#FAF7F2] border-t border-[#E3DDD2] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#5B5B63] hover:text-[#1B1B1F] rounded-lg transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#E2F2E7]" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Brand Passport</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
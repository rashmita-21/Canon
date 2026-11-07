/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, SearchCheck, MessageSquareHeart, UserCheck } from 'lucide-react';

interface HowItWorksStripProps {
  onDismiss: () => void;
}

export const HowItWorksStrip: React.FC<HowItWorksStripProps> = ({ onDismiss }) => {
  return (
    <section 
      aria-label="How Canon works"
      className="bg-[#FAF7F2] border-b border-[#E3DDD2] px-4 sm:px-6 py-3 transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-serif text-sm font-bold text-[#0F5C5C] tracking-tight">
            How the desk works
          </span>
          <span className="hidden sm:inline text-xs text-[#5B5B63]">·</span>
          <span className="text-xs text-[#5B5B63]">Editorial brand governance in 3 steps</span>
        </div>

        {/* 3 Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 max-w-4xl">
          
          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/80 border border-[#E3DDD2]">
            <div className="w-6 h-6 rounded-md bg-[#FAF7F2] text-[#0F5C5C] border border-[#E3DDD2] flex items-center justify-center font-mono text-xs font-bold shrink-0">
              1
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1B1B1F]">
                Check against Canon
              </p>
              <p className="text-[11px] text-[#5B5B63] leading-snug">
                Validates copy and visuals against rules and unexpired Claim Ledger facts.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/80 border border-[#E3DDD2]">
            <div className="w-6 h-6 rounded-md bg-[#FAF7F2] text-[#0F5C5C] border border-[#E3DDD2] flex items-center justify-center font-mono text-xs font-bold shrink-0">
              2
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1B1B1F]">
                Explain & preserve intent
              </p>
              <p className="text-[11px] text-[#5B5B63] leading-snug">
                Margin notes detail why items are flagged and offer intent-preserving fixes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-2 rounded-lg bg-white/80 border border-[#E3DDD2]">
            <div className="w-6 h-6 rounded-md bg-[#FAF7F2] text-[#0F5C5C] border border-[#E3DDD2] flex items-center justify-center font-mono text-xs font-bold shrink-0">
              3
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1B1B1F]">
                Human reviewer decides
              </p>
              <p className="text-[11px] text-[#5B5B63] leading-snug">
                Nothing changes automatically. Accept, dispute, or keep with reason.
              </p>
            </div>
          </div>

        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          aria-label="Dismiss guide"
          className="self-end md:self-center p-1 text-[#5B5B63] hover:text-[#1B1B1F] rounded-md hover:bg-[#E3DDD2]/40 transition-colors"
          title="Dismiss this guide"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </section>
  );
};

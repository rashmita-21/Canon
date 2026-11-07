/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrandRule } from '../types';
import { INITIAL_RULES } from '../data';
import { X, Search, CheckCircle2, AlertOctagon, BookOpen, ShieldAlert } from 'lucide-react';

interface CanonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CanonDrawer: React.FC<CanonDrawerProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Terminology', 'Claims & Disclosures', 'Voice & Tone', 'Visual & A11y'];

  const filteredRules = INITIAL_RULES.filter(rule => {
    const matchesCategory = selectedCategory === 'All' || rule.category === selectedCategory;
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="canon-drawer-title"
    >
      <div 
        className="w-full max-w-2xl bg-[#FAF7F2] h-full shadow-2xl flex flex-col border-l border-[#E3DDD2] animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-6 bg-white border-b border-[#E3DDD2] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#E8F3F3] text-[#0F5C5C] flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="canon-drawer-title" className="font-serif text-xl font-bold text-[#1B1B1F]">
                  Brand Canon Rules
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E3DDD2] text-[#5B5B63]">
                  Canon v4.2.1
                </span>
              </div>
              <p className="text-xs text-[#5B5B63]">
                The authoritative codification of Lumen Bank voice, terminology, and legal claims.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close brand canon drawer"
            className="p-2 rounded-lg text-[#5B5B63] hover:text-[#1B1B1F] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E3DDD2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-4 bg-[#FAF7F2] border-b border-[#E3DDD2] space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#5B5B63] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search rules, guidelines, or rule IDs (e.g. Term-1.1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg border border-[#E3DDD2] text-[#1B1B1F] placeholder-[#5B5B63] focus-visible:border-[#0F5C5C]"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap text-xs font-medium border ${
                  selectedCategory === cat
                    ? 'bg-[#0F5C5C] text-white border-[#0F5C5C]'
                    : 'bg-white text-[#5B5B63] border-[#E3DDD2] hover:bg-[#EDE8DF]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredRules.length === 0 ? (
            <div className="text-center py-12 text-[#5B5B63]">
              <p className="text-sm">No rules match your filter.</p>
            </div>
          ) : (
            filteredRules.map((rule) => (
              <article 
                key={rule.id}
                className="p-4 bg-white rounded-xl border border-[#E3DDD2] shadow-xs hover:border-[#0F5C5C]/40 transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E3DDD2] text-[#0F5C5C] font-semibold">
                      {rule.id}
                    </span>
                    <span className="text-xs text-[#5B5B63]">
                      {rule.category}
                    </span>
                    <span className="text-xs text-[#5B5B63] font-mono">
                      · {rule.version}
                    </span>
                  </div>

                  {rule.requiresAuthorizedReviewer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF1D6] text-[#8A5A00] border border-[#8A5A00]/20">
                      <ShieldAlert className="w-3 h-3" />
                      Authorised Reviewer
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-serif text-base font-bold text-[#1B1B1F]">
                    {rule.name}
                  </h3>
                  <p className="text-xs font-medium text-[#1B1B1F] mt-0.5">
                    {rule.summary}
                  </p>
                  <p className="text-xs text-[#5B5B63] mt-1 leading-relaxed">
                    {rule.description}
                  </p>
                </div>

                {/* Pass / Fail examples */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#E3DDD2] text-xs">
                  <div className="p-2.5 rounded-lg bg-[#E2F2E7]/60 border border-[#1F6B3A]/20">
                    <div className="flex items-center gap-1 text-[#1F6B3A] font-semibold mb-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approved Wording
                    </div>
                    <p className="text-[#1B1B1F] italic text-[11px]">
                      "{rule.passExample}"
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FBE4E1]/60 border border-[#B3261E]/20">
                    <div className="flex items-center gap-1 text-[#B3261E] font-semibold mb-1 text-[11px]">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      Prohibited / Flagged
                    </div>
                    <p className="text-[#1B1B1F] italic text-[11px]">
                      "{rule.failExample}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5B5B63] pt-1">
                  <span>Governance Owner: <strong className="font-medium text-[#1B1B1F]">{rule.owner}</strong></span>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E3DDD2] text-xs text-[#5B5B63] flex items-center justify-between">
          <span>Rules updated bi-weekly by Governance Council</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0F5C5C] text-white rounded-md text-xs font-medium hover:bg-[#0B4747] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

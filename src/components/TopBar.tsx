/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Role } from '../types';
import { 
  ShieldCheck, 
  Database, 
  HelpCircle, 
  UserCheck, 
  UserPen,
  AlertTriangle,
  Clock
} from 'lucide-react';

export interface TopBarProps {
  currentTab: 'review' | 'facts';
  onSelectTab: (tab: 'review' | 'facts') => void;
  role: Role;
  onRoleChange: (role: Role) => void;
  onOpenCanon: () => void;
  staleFactsCount: number;
  pendingReviewsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  role,
  onRoleChange,
  onOpenCanon,
  staleFactsCount,
  pendingReviewsCount,
}) => {
  return (
    <header className="bg-white border-b border-[#E3DDD2] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Tab Navigation */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={onOpenCanon}>
            <div className="w-8 h-8 rounded-lg bg-[#0F5C5C] flex items-center justify-center text-white font-serif font-bold text-lg shadow-xs">
              C
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-bold text-base tracking-tight text-[#1B1B1F]">
                  Canon
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#FAF7F2] border border-[#E3DDD2] text-[#5B5B63]">
                  v4.2.1
                </span>
              </div>
              <p className="text-[10px] text-[#5B5B63] leading-none hidden sm:block">
                Brand truth, version-controlled
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E3DDD2]" aria-label="Main Navigation">
            <button
              onClick={() => onSelectTab('review')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentTab === 'review'
                  ? 'bg-[#0F5C5C] text-white shadow-xs'
                  : 'text-[#5B5B63] hover:text-[#1B1B1F] hover:bg-white/60'
              }`}
            >
              The Desk
            </button>

            <button
              onClick={() => onSelectTab('facts')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'facts'
                  ? 'bg-[#0F5C5C] text-white shadow-xs'
                  : 'text-[#5B5B63] hover:text-[#1B1B1F] hover:bg-white/60'
              }`}
            >
              <span>Claim Ledger</span>
              {staleFactsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#B3261E]" title={`${staleFactsCount} stale fact(s)`} />
              )}
            </button>
          </nav>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Role Selector */}
          <div className="flex items-center gap-1 bg-[#FAF7F2] p-1 rounded-lg border border-[#E3DDD2] text-xs">
            <button
              onClick={() => onRoleChange('creator')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                role === 'creator'
                  ? 'bg-white text-[#1B1B1F] shadow-xs font-semibold'
                  : 'text-[#5B5B63] hover:text-[#1B1B1F]'
              }`}
            >
              <UserPen className="w-3.5 h-3.5 text-[#0F5C5C]" />
              <span>Creator</span>
            </button>

            <button
              onClick={() => onRoleChange('reviewer')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1 ${
                role === 'reviewer'
                  ? 'bg-white text-[#1B1B1F] shadow-xs font-semibold'
                  : 'text-[#5B5B63] hover:text-[#1B1B1F]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#0F5C5C]" />
              <span>Reviewer</span>
            </button>
          </div>

          <button
            onClick={onOpenCanon}
            className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#E8F3F3] text-[#0F5C5C] border border-[#E3DDD2] rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Brand Rules</span>
          </button>
        </div>

      </div>
    </header>
  );
};
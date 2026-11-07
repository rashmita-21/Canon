/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Role,
  Channel,
  FactItem,
  SavedContentItem,
  BrandPassport
} from './types';
import { CURRENT_DATE_STRING, INITIAL_FACTS, INITIAL_SAVED_ITEMS } from './data';
import { runCanonEngine } from './engine';
import { TopBar } from './components/TopBar';
import { ReviewDesk } from './components/ReviewDesk';
import { ClaimLedger } from './components/ClaimLedger';
import { CanonDrawer } from './components/CanonDrawer';
import { HowItWorksStrip } from './components/HowItWorksStrip';
import { BrandPassportModal } from './components/BrandPassportModal';

const factStatus = (validUntil: string): FactItem['status'] =>
  (validUntil < CURRENT_DATE_STRING ? 'Expired' : 'Valid') as FactItem['status'];

export default function App() {
  const [currentTab, setCurrentTab] = useState<'review' | 'facts'>('review');
  const [role, setRole] = useState<Role>('creator');
  const [showHowItWorks, setShowHowItWorks] = useState(true);
  const [isCanonDrawerOpen, setIsCanonDrawerOpen] = useState(false);
  const [activePassport, setActivePassport] = useState<BrandPassport | null>(null);

  // Facts are configuration for the fictional brand; statuses are computed from real dates.
  const [facts, setFacts] = useState<FactItem[]>(INITIAL_FACTS);

  // Sample items for demonstrating Ripple; their status comes from the ledger, not from hard-coding.
  const [savedItems, setSavedItems] = useState<SavedContentItem[]>(() =>
    INITIAL_SAVED_ITEMS.map(item => ({
      ...item,
      status: item.dependsOnFactIds.some(
        id => INITIAL_FACTS.find(f => f.id === id)?.status === 'Expired'
      )
        ? 'stale'
        : 'clean',
    }))
  );

  const [deskTargetItem, setDeskTargetItem] = useState<{
    content: string;
    intent: string;
    channel: Channel;
  } | null>(null);

  const handleRecheckSavedItem = async (itemId: string) => {
    const item = savedItems.find(i => i.id === itemId);
    if (!item) return;

    const result = await runCanonEngine(
      item.content,
      facts,
      'Marketing copy',
      undefined,
      CURRENT_DATE_STRING,
      item.channel
    );

    setSavedItems(prev =>
      prev.map(i =>
        i.id === itemId
          ? {
              ...i,
              lastChecked: CURRENT_DATE_STRING,
              status: result.findings.length === 0 ? 'clean' : 'has_issues',
            }
          : i
      )
    );
  };

  // Ripple: when a fact's value or date changes, every item that depends on it is marked for re-check.
  const handleUpdateFact = (updatedFact: FactItem) => {
    const previous = facts.find(f => f.id === updatedFact.id);
    const fact: FactItem = { ...updatedFact, status: factStatus(updatedFact.validUntil) };
    const changed =
      !previous ||
      previous.value !== fact.value ||
      previous.validUntil !== fact.validUntil;

    setFacts(prev => prev.map(f => (f.id === fact.id ? fact : f)));

    if (changed) {
      setSavedItems(prev =>
        prev.map(item =>
          item.dependsOnFactIds.includes(fact.id) ? { ...item, status: 'stale' } : item
        )
      );
    }
  };

  const handleAddFact = (newFact: FactItem) => {
    setFacts(prev => [...prev, { ...newFact, status: factStatus(newFact.validUntil) }]);
  };

  const handleLoadItemToDesk = (item: SavedContentItem) => {
    setDeskTargetItem({
      content: item.content,
      intent: `Update and proof ${item.title}`,
      channel: item.channel,
    });
    setCurrentTab('review');
  };

  const staleFactsCount = facts.filter(f => f.status === 'Expired').length;
  const pendingReviewsCount = savedItems.filter(i => i.status !== 'clean').length;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1B1B1F] flex flex-col font-sans selection:bg-[#E8F3F3] selection:text-[#0F5C5C]">

      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        role={role}
        onRoleChange={setRole}
        onOpenCanon={() => setIsCanonDrawerOpen(true)}
        staleFactsCount={staleFactsCount}
        pendingReviewsCount={pendingReviewsCount}
      />

      {showHowItWorks && (
        <HowItWorksStrip onDismiss={() => setShowHowItWorks(false)} />
      )}

      <main className="flex-1">
        {currentTab === 'review' && (
          <ReviewDesk
            role={role}
            facts={facts}
            onOpenPassport={(passport) => setActivePassport(passport)}
            onRecordOverride={() => {}}
            onRecordDispute={() => {}}
            onRecordGap={() => {}}
            initialContentItem={deskTargetItem}
          />
        )}

        {currentTab === 'facts' && (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 text-xs text-[#5B5B63]">
              Demo brand and facts are fictional configuration. Saved items below are samples for
              demonstrating Ripple; they involve no real people or campaigns.
            </div>
            <ClaimLedger
              facts={facts}
              savedItems={savedItems}
              onUpdateFact={handleUpdateFact}
              onAddFact={handleAddFact}
              onRecheckItem={handleRecheckSavedItem}
              onLoadItemToDesk={handleLoadItemToDesk}
            />
          </>
        )}
      </main>

      <CanonDrawer
        isOpen={isCanonDrawerOpen}
        onClose={() => setIsCanonDrawerOpen(false)}
      />

      <BrandPassportModal
        passport={activePassport}
        onClose={() => setActivePassport(null)}
      />

      <footer className="mt-16 bg-[#FAF7F2] border-t border-[#E3DDD2] py-8 px-4 sm:px-6 text-xs text-[#5B5B63]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#1B1B1F]">
              Canon
            </span>
            <span>·</span>
            <span>Brand truth, version-controlled</span>
          </div>

          <p className="text-center sm:text-right">
            Demo uses a fictional brand (Lumen Bank). AI suggestions are advisory; humans make every decision.
          </p>

          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-[#0F5C5C] font-semibold">WCAG AA Compliant</span>
            <span>·</span>
            <span>Rules v4.2.1</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FactItem, SavedContentItem, Channel } from '../types';
import { CURRENT_DATE_STRING } from '../data';
import { 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ArrowRight, 
  Plus, 
  ExternalLink,
  Edit2,
  Check,
  X,
  FileText,
  Sparkles
} from 'lucide-react';

interface ClaimLedgerProps {
  facts: FactItem[];
  savedItems: SavedContentItem[];
  onUpdateFact: (updatedFact: FactItem) => void;
  onAddFact: (newFact: FactItem) => void;
  onRecheckItem: (itemId: string) => void;
  onLoadItemToDesk: (item: SavedContentItem) => void;
}

export const ClaimLedger: React.FC<ClaimLedgerProps> = ({
  facts,
  savedItems,
  onUpdateFact,
  onAddFact,
  onRecheckItem,
  onLoadItemToDesk,
}) => {
  const [editingFactId, setEditingFactId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editValidUntil, setEditValidUntil] = useState('');
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Helper to compute next unique Fact ID dynamically
  const getNextFactId = (currentFacts: FactItem[]) => {
    const numericIds = currentFacts
      .map(f => parseInt(f.id.replace(/\D/g, ''), 10))
      .filter(n => !isNaN(n));
    const nextNum = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    return `F${nextNum}`;
  };

  // New fact form state
  const [newFact, setNewFact] = useState({
    id: getNextFactId(facts),
    fact: '',
    value: '',
    source: '',
    owner: '',
    validUntil: '2027-06-30',
  });

  // Sync selected fact with available facts
  useEffect(() => {
    if (facts.length === 0) {
      setSelectedFactId(null);
      return;
    }
    if (!selectedFactId || !facts.some(f => f.id === selectedFactId)) {
      const expiredFact = facts.find(f => f.status === 'Expired');
      setSelectedFactId(expiredFact ? expiredFact.id : facts[0].id);
    }
  }, [facts, selectedFactId]);

  const startEditing = (fact: FactItem) => {
    setEditingFactId(fact.id);
    setEditValue(fact.value);
    setEditValidUntil(fact.validUntil);
  };

  const saveEditing = (fact: FactItem) => {
    const isExpired = editValidUntil < CURRENT_DATE_STRING;
    const validUntilDate = new Date(editValidUntil);
    const currentDate = new Date(CURRENT_DATE_STRING);
    const diffDays = Math.ceil((validUntilDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    
    let status: 'Valid' | 'Expiring soon' | 'Expired' = 'Valid';
    if (isExpired) {
      status = 'Expired';
    } else if (diffDays <= 30 && diffDays >= 0) {
      status = 'Expiring soon';
    }

    const updated: FactItem = {
      ...fact,
      value: editValue,
      validUntil: editValidUntil,
      status,
    };

    onUpdateFact(updated);
    setSelectedFactId(fact.id);
    setEditingFactId(null);
  };

  const handleCreateFact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.fact || !newFact.value) return;

    const isExpired = newFact.validUntil < CURRENT_DATE_STRING;
    const validUntilDate = new Date(newFact.validUntil);
    const currentDate = new Date(CURRENT_DATE_STRING);
    const diffDays = Math.ceil((validUntilDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));

    let status: 'Valid' | 'Expiring soon' | 'Expired' = 'Valid';
    if (isExpired) {
      status = 'Expired';
    } else if (diffDays <= 30 && diffDays >= 0) {
      status = 'Expiring soon';
    }

    const item: FactItem = {
      id: newFact.id,
      fact: newFact.fact,
      value: newFact.value,
      source: newFact.source || 'Internal Policy',
      owner: newFact.owner || 'Governance Council',
      validUntil: newFact.validUntil,
      status,
    };

    onAddFact(item);
    setSelectedFactId(item.id);
    setShowAddModal(false);
    
    const updatedFacts = [...facts, item];
    setNewFact({
      id: getNextFactId(updatedFacts),
      fact: '',
      value: '',
      source: '',
      owner: '',
      validUntil: '2027-06-30',
    });
  };

  const targetFact = facts.find(f => f.id === selectedFactId) || facts.find(f => f.status === 'Expired') || facts[0];
  const affectedSavedItems = targetFact 
    ? savedItems.filter(item => item.dependsOnFactIds.includes(targetFact.id))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      
      {/* Title & Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3DDD2]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-[#0F5C5C]" />
            <h1 className="font-serif text-2xl font-bold text-[#1B1B1F]">
              Claim Ledger
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-[#E3DDD2] text-[#5B5B63]">
              Active Date: {CURRENT_DATE_STRING}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#5B5B63]">
            The single source of truth for numeric metrics, interest rates, campaign timelines, and compliance claims.
          </p>
        </div>

        <button
          onClick={() => {
            setNewFact(prev => ({ ...prev, id: getNextFactId(facts) }));
            setShowAddModal(true);
          }}
          className="self-start sm:self-auto px-3.5 py-2 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Approved Fact</span>
        </button>
      </div>

      {/* Ripple Panel */}
      {targetFact && (
        <section 
          aria-labelledby="ripple-title"
          className="p-5 rounded-xl bg-white border-2 border-[#8A5A00]/40 shadow-sm transition-all"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#E3DDD2]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FFF1D6] text-[#8A5A00] flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="ripple-title" className="font-serif text-base font-bold text-[#1B1B1F]">
                    Ripple Impact Analysis: <span className="font-mono text-[#0F5C5C] font-semibold">[{targetFact.id}] {targetFact.fact}</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FFF1D6] text-[#8A5A00]">
                    {affectedSavedItems.length} dependent {affectedSavedItems.length === 1 ? 'item' : 'items'} affected
                  </span>
                </div>
                <p className="text-xs text-[#5B5B63] mt-0.5">
                  When a fact is updated or expires, Canon automatically traces every live content asset citing it.
                </p>
              </div>
            </div>

            <div className="text-xs text-[#5B5B63] bg-[#FAF7F2] p-2 rounded-lg border border-[#E3DDD2] font-mono shrink-0">
              Current Value: <strong className="text-[#1B1B1F]">{targetFact.value}</strong> · Valid until: <strong className={targetFact.status === 'Expired' ? 'text-[#B3261E]' : 'text-[#1F6B3A]'}>{targetFact.validUntil}</strong>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {affectedSavedItems.length === 0 ? (
              <p className="text-xs text-[#5B5B63] italic py-3">
                No active content items currently depend on this fact.
              </p>
            ) : (
              affectedSavedItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                    targetFact.status === 'Expired'
                      ? 'ripple-flash border-[#8A5A00]/40'
                      : 'bg-[#FAF7F2] border-[#E3DDD2]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] font-bold text-[#5B5B63]">
                        {item.id}
                      </span>
                      <span className="font-medium text-xs text-[#1B1B1F]">
                        {item.title}
                      </span>
                      <span className="text-[11px] px-2 py-0.2 rounded bg-white border border-[#E3DDD2] text-[#5B5B63]">
                        {item.channel}
                      </span>
                      <span className="text-[11px] text-[#5B5B63]">
                        · Owner: {item.author}
                      </span>
                    </div>

                    <p className="text-xs text-[#5B5B63] italic line-clamp-1 max-w-3xl">
                      "{item.content}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onRecheckItem(item.id)}
                      className="px-3 py-1.5 bg-white hover:bg-[#FAF7F2] text-[#1B1B1F] border border-[#E3DDD2] rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Re-run verification engine against updated ledger"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#0F5C5C]" />
                      <span>Re-check</span>
                    </button>

                    <button
                      onClick={() => onLoadItemToDesk(item)}
                      className="px-3 py-1.5 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Load into The Desk for proofing"
                    >
                      <span>Open on Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Facts Table */}
      <section aria-labelledby="ledger-table-title" className="bg-white rounded-xl border border-[#E3DDD2] shadow-xs overflow-hidden">
        <div className="p-4 bg-[#FAF7F2] border-b border-[#E3DDD2] flex items-center justify-between">
          <div>
            <h2 id="ledger-table-title" className="font-serif text-lg font-bold text-[#1B1B1F]">
              Approved Claim Ledger Entries
            </h2>
            <p className="text-xs text-[#5B5B63]">
              Double-click or click edit to update values or extend expiration dates. Changes trigger instant Ripple calculations.
            </p>
          </div>
          <span className="font-mono text-xs text-[#5B5B63]">
            {facts.length} Verified {facts.length === 1 ? 'Entry' : 'Entries'}
          </span>
        </div>

        <div className="overflow-x-auto">
          {facts.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5B5B63] italic">
              No verified facts in the ledger yet. Click "Add Approved Fact" above to add one.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] text-[#5B5B63] uppercase tracking-wider text-[11px] border-b border-[#E3DDD2]">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">ID</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Approved Fact</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Verified Value</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Audited Source</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Owner</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Valid Until</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3DDD2]">
                {facts.map((fact) => {
                  const isEditing = editingFactId === fact.id;
                  const isSelectedForRipple = targetFact?.id === fact.id;

                  return (
                    <tr 
                      key={fact.id}
                      onClick={() => setSelectedFactId(fact.id)}
                      className={`hover:bg-[#FAF7F2]/60 transition-colors cursor-pointer ${
                        isSelectedForRipple ? 'bg-[#FAF7F2]' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E3DDD2] text-[#0F5C5C]">
                          {fact.id}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-[#1B1B1F]">
                        {fact.fact}
                      </td>

                      <td className="px-4 py-3.5 font-mono font-semibold text-[#1B1B1F]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-2 py-1 text-xs bg-white border border-[#0F5C5C] rounded focus-visible:outline-none w-32"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span>{fact.value}</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-[#5B5B63]">
                        {fact.source}
                      </td>

                      <td className="px-4 py-3.5 text-[#5B5B63]">
                        {fact.owner}
                      </td>

                      <td className="px-4 py-3.5 font-mono">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editValidUntil}
                            onChange={(e) => setEditValidUntil(e.target.value)}
                            className="px-2 py-1 text-xs bg-white border border-[#0F5C5C] rounded focus-visible:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span className={fact.status === 'Expired' ? 'text-[#B3261E] font-bold' : 'text-[#1B1B1F]'}>
                            {fact.validUntil}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {fact.status === 'Valid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E2F2E7] text-[#1F6B3A] border border-[#1F6B3A]/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Valid
                          </span>
                        )}
                        {fact.status === 'Expiring soon' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFF1D6] text-[#8A5A00] border border-[#8A5A00]/20">
                            <Clock className="w-3 h-3" />
                            Expiring soon
                          </span>
                        )}
                        {fact.status === 'Expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FBE4E1] text-[#B3261E] border border-[#B3261E]/20">
                            <AlertTriangle className="w-3 h-3" />
                            Expired
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                saveEditing(fact);
                              }}
                              className="p-1 rounded text-[#1F6B3A] hover:bg-[#E2F2E7]"
                              title="Save fact updates"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFactId(null);
                              }}
                              className="p-1 rounded text-[#5B5B63] hover:bg-[#FAF7F2]"
                              title="Cancel edit"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(fact);
                            }}
                            className="px-2.5 py-1 text-xs text-[#0F5C5C] hover:bg-[#E8F3F3] rounded font-medium transition-colors"
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Add Fact Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#E3DDD2] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD2]">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0F5C5C]" />
                <h3 className="font-serif text-lg font-bold text-[#1B1B1F]">
                  Add Claim Ledger Fact
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#5B5B63] hover:text-[#1B1B1F] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFact} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#1B1B1F] block mb-1">
                  Fact Name or Metric Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Current FD 1-Year Rate"
                  value={newFact.fact}
                  onChange={(e) => setNewFact({ ...newFact, fact: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded border border-[#E3DDD2] text-[#1B1B1F] focus-visible:border-[#0F5C5C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1B1B1F] block mb-1">
                    Verified Value
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7.1% p.a."
                    value={newFact.value}
                    onChange={(e) => setNewFact({ ...newFact, value: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded border border-[#E3DDD2] text-[#1B1B1F] font-mono focus-visible:border-[#0F5C5C]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1B1B1F] block mb-1">
                    Valid Until Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newFact.validUntil}
                    onChange={(e) => setNewFact({ ...newFact, validUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded border border-[#E3DDD2] text-[#1B1B1F] font-mono focus-visible:border-[#0F5C5C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#1B1B1F] block mb-1">
                    Audited Source Document
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ALCO Minute 2026/08"
                    value={newFact.source}
                    onChange={(e) => setNewFact({ ...newFact, source: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded border border-[#E3DDD2] text-[#1B1B1F] focus-visible:border-[#0F5C5C]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#1B1B1F] block mb-1">
                    Owner Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Retail Treasury"
                    value={newFact.owner}
                    onChange={(e) => setNewFact({ ...newFact, owner: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded border border-[#E3DDD2] text-[#1B1B1F] focus-visible:border-[#0F5C5C]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E3DDD2]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-[#5B5B63] hover:text-[#1B1B1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#0F5C5C] text-white rounded text-xs font-medium hover:bg-[#0B4747]"
                >
                  Save to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Role,
  Channel,
  WorkflowStatus,
  Finding,
  FactItem,
  RevisionRecord,
  CommentItem,
  ImageAssetData,
  BrandPassport
} from '../types';
import { SAMPLE_DATA, APPROVED_BG_COLORS, CURRENT_DATE_STRING } from '../data';
import { runCanonEngine, applySuggestionToContent, calculateContrast } from '../engine';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ShieldAlert,
  Edit3,
  Check,
  X,
  Send,
  FileCheck2,
  Image as ImageIcon,
  ChevronRight,
  ArrowRight,
  Upload
} from 'lucide-react';

interface ReviewDeskProps {
  role: Role;
  facts: FactItem[];
  onOpenPassport: (passport: BrandPassport) => void;
  onRecordOverride: (ruleId: string, reason: string) => void;
  onRecordDispute: (ruleId: string) => void;
  onRecordGap: (flaggedText: string) => void;
  initialContentItem?: {
    content: string;
    intent: string;
    channel: Channel;
  } | null;
}

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const ReviewDesk: React.FC<ReviewDeskProps> = ({
  role,
  facts,
  onOpenPassport,
  onRecordOverride,
  onRecordDispute,
  onRecordGap,
  initialContentItem,
}) => {
  // Main state
  const [content, setContent] = useState(
    'Lumen Saver: guaranteed 8% returns, the cheapest in India!'
  );
  const [intent, setIntent] = useState(
    'Promote high interest savings account for young professionals'
  );
  const [channel, setChannel] = useState<Channel>('Ad');
  const [customChannelInput, setCustomChannelInput] = useState('');

  const handleSetCustomChannel = () => {
    if (customChannelInput.trim()) {
      setChannel(customChannelInput.trim() as Channel);
      setCustomChannelInput('');
    }
  };

  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('Draft');

  // Checking state
  const [isChecking, setIsChecking] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [activeFindingId, setActiveFindingId] = useState<string | null>(null);
  const [usedAiNotice, setUsedAiNotice] = useState(false);
  const [engineMeta, setEngineMeta] = useState<any>(null);

  // Message shown when Submit is clicked while findings are still undecided
  const [submitHint, setSubmitHint] = useState('');

  // View state: 'proof' (marked-up text) vs 'edit' (raw textarea)
  const [viewMode, setViewMode] = useState<'proof' | 'edit'>('proof');

  // Tracked changes
  const [trackedChanges, setTrackedChanges] = useState<{ original: string; replaced: string }[]>([]);
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);

  // Comments (start empty: nothing is pre-filled)
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeTab, setActiveTab] = useState<'notes' | 'comments' | 'history'>('notes');

  // Image & Accessibility inspector
  const [showImageInspector, setShowImageInspector] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imageAsset, setImageAsset] = useState<ImageAssetData>({
    textColor: '#1A1A1A',
    bgColor: '#FFFFFF',
    altText: '',
  });

  // Modal for "Keep as is" reason
  const [keepReasonFinding, setKeepReasonFinding] = useState<Finding | null>(null);
  const [keepReasonText, setKeepReasonText] = useState('');

  // Inline editing of suggestion
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [customSuggestionText, setCustomSuggestionText] = useState('');

  // Stamp state for approved status
  const [showApprovedStamp, setShowApprovedStamp] = useState(false);
  const [latestPassport, setLatestPassport] = useState<BrandPassport | null>(null);

  // Refs for scrolling between margin notes and paper underlines
  const marginNotesRef = useRef<{ [key: string]: HTMLElement | null }>({});

  // Load initial content item if passed from Ripple panel
  useEffect(() => {
    if (initialContentItem) {
      setContent(initialContentItem.content);
      setIntent(initialContentItem.intent || 'Promote product benefits');
      setChannel(initialContentItem.channel || 'Ad');
      setWorkflowStatus('Draft');
      setTrackedChanges([]);
      setSubmitHint('');
      handleRunCheck(
        initialContentItem.content,
        initialContentItem.intent,
        imageAsset,
        initialContentItem.channel
      );
    }
  }, [initialContentItem]);

  // Initial auto-check on mount
  useEffect(() => {
    handleRunCheck(content, intent, imageAsset);
  }, []);

  const handleRunCheck = async (
    textToCheck: string,
    intentToCheck: string,
    imgAsset?: ImageAssetData,
    channelOverride?: Channel
  ) => {
    setIsChecking(true);
    setActiveFindingId(null);
    setSubmitHint('');

    setTimeout(async () => {
      const result = await runCanonEngine(
        textToCheck,
        facts,
        intentToCheck,
        showImageInspector ? imgAsset : undefined,
        CURRENT_DATE_STRING,
        channelOverride ?? channel
      );

      setFindings(result.findings);
      setUsedAiNotice(result.aiNotice);
      setEngineMeta(result.meta ?? null);
      setIsChecking(false);
      setWorkflowStatus('Checked');

      if (result.findings.length > 0) {
        setActiveFindingId(result.findings[0].id);
      }
    }, 380);
  };

  const handleLoadSample = (sampleId: string) => {
    const sample = SAMPLE_DATA.find(s => s.id === sampleId);
    if (!sample) return;

    setContent(sample.content);
    setIntent(sample.intent);
    setChannel(sample.channel);
    setWorkflowStatus('Draft');
    setTrackedChanges([]);
    setShowApprovedStamp(false);
    setLatestPassport(null);
    setUploadedImageUrl(null);
    setSubmitHint('');

    let imgData: ImageAssetData | undefined = undefined;
    if (sample.image) {
      setShowImageInspector(true);
      imgData = {
        textColor: sample.image.textColor,
        bgColor: sample.image.bgColor,
        altText: sample.image.altText,
      };
      setImageAsset(imgData);
    } else {
      setShowImageInspector(false);
    }

    handleRunCheck(sample.content, sample.intent, imgData, sample.channel);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setUploadedImageUrl(objectUrl);
    setShowImageInspector(true);

    // Alt text is NOT auto-filled: a person must describe their own image.
    const updatedImageAsset = { ...imageAsset };
    setImageAsset(updatedImageAsset);
    handleRunCheck(content, intent, updatedImageAsset);
  };

  const scrollToFinding = (findingId: string) => {
    setActiveFindingId(findingId);
    const element = marginNotesRef.current[findingId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleAcceptSuggestion = (finding: Finding, suggestionText: string) => {
    const originalText = content;
    const updatedContent = applySuggestionToContent(content, finding, suggestionText);

    setContent(updatedContent);
    setTrackedChanges(prev => [
      ...prev,
      { original: finding.flaggedText, replaced: suggestionText }
    ]);

    const newRevision: RevisionRecord = {
      id: `rev-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      authorRole: role,
      summary: `Accepted fix for [${finding.ruleId}]: "${finding.flaggedText}" → "${suggestionText}"`,
      diffBefore: originalText,
      diffAfter: updatedContent,
    };
    setRevisions(prev => [newRevision, ...prev]);

    setFindings(prev =>
      prev.map(f =>
        f.id === finding.id
          ? {
              ...f,
              decision: {
                status: 'accepted',
                customReplacement: suggestionText,
              },
            }
          : f
      )
    );
    setSubmitHint('');
  };

  const handleKeepWithReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keepReasonFinding || !keepReasonText.trim()) return;

    setFindings(prev =>
      prev.map(f =>
        f.id === keepReasonFinding.id
          ? {
              ...f,
              decision: {
                status: 'kept',
                reason: keepReasonText.trim(),
              },
            }
          : f
      )
    );

    onRecordOverride(keepReasonFinding.ruleId, keepReasonText.trim());

    setRevisions(prev => [
      {
        id: `rev-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        authorRole: role,
        summary: `Overrode [${keepReasonFinding.ruleId}] "${keepReasonFinding.flaggedText}": ${keepReasonText.trim()}`,
        diffBefore: content,
        diffAfter: content,
      },
      ...prev,
    ]);

    setKeepReasonFinding(null);
    setKeepReasonText('');
    setSubmitHint('');
  };

  const handleDispute = (finding: Finding) => {
    setFindings(prev =>
      prev.map(f =>
        f.id === finding.id
          ? {
              ...f,
              decision: {
                status: 'disputed',
              },
            }
          : f
      )
    );
    onRecordDispute(finding.ruleId);
    setSubmitHint('');
  };

  const handleLogGap = (finding: Finding) => {
    setFindings(prev =>
      prev.map(f =>
        f.id === finding.id
          ? {
              ...f,
              decision: {
                status: 'kept',
                reason: 'Flagged for guideline review (recorded on this item only)',
              },
            }
          : f
      )
    );
    onRecordGap(finding.flaggedText);
    setSubmitHint('');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newCmt: CommentItem = {
      id: `cmt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: role === 'creator' ? 'Creator' : 'Reviewer',
      role: role,
      text: newCommentText.trim(),
    };

    setComments(prev => [...prev, newCmt]);
    setNewCommentText('');
  };

  // Submit stays clickable. If findings are undecided, explain what is missing.
  const handleSubmitForReview = () => {
    const remaining = findings.filter(f => f.decision.status === 'pending').length;
    if (remaining > 0) {
      setSubmitHint(
        `Please decide on the ${remaining} remaining finding${remaining === 1 ? '' : 's'} first: accept a fix, edit, keep with a reason, or dispute.`
      );
      setActiveTab('notes');
      return;
    }
    setSubmitHint('');
    setWorkflowStatus('In review');
  };

  const handleApprove = async () => {
    const now = new Date();
    const hash = await sha256(`${content}|${intent}|${channel}|Canon v4.2.1|${now.toISOString()}`);

    // Facts actually cited by findings (rule IDs like "Ledger F2 · expired ...")
    const citedIds = Array.from(
      new Set(findings.flatMap(f => f.ruleId.match(/\bF\d+\b/g) ?? []))
    );
    const cited = facts.filter(f => citedIds.includes(f.id));
    const factLines = (cited.length > 0 ? cited : facts).map(
      f => `${f.id}: ${f.fact} = ${f.value} (valid until ${f.validUntil}, ${f.status})`
    );
    const factHeading =
      cited.length > 0 ? 'cited by findings' : 'full ledger snapshot (no fact was cited)';

    const count = (s: string) => findings.filter(f => f.decision.status === s).length;
    const kept = findings.filter(f => f.decision.status === 'kept');
    const decisionSummary = [
      `${findings.length} findings: ${count('accepted')} accepted, ${kept.length} kept, ${count('disputed')} disputed, ${count('pending')} undecided`,
      ...kept.map(f => `Kept "${f.flaggedText}" (${f.ruleId}): ${f.decision.reason}`),
    ];

    const mlLine = usedAiNotice
      ? 'Backend was unreachable: rule-based and keyword-heuristic checks only.'
      : engineMeta?.ml_available
        ? `Trained claim/tone models ran locally on our server (claim ${engineMeta?.model_versions?.claim}, tone ${engineMeta?.model_versions?.tone}).`
        : 'Trained ML models were not available for this check.';

    const passport: BrandPassport = {
      recordId: `PASSPORT-${hash.slice(0, 10).toUpperCase()}`,
      contentTitle: `Canon Certified ${channel} Asset`,
      channel: channel,
      intent: intent,
      timestamp: now.toLocaleString(),
      approvedBy: 'Reviewer (demo role)',
      rulesVersion: 'Canon v4.2.1',
      factSnapshotSummary: [`Ledger facts ${factHeading}:`, ...factLines],
      decisionSummary,
      aiDisclosure: `Rule-based checks (terms, ledger values and dates, contrast, alt text). ${mlLine} No external AI service was used. Humans made every decision.`,
      auditHash: `SHA-256: ${hash}`,
      finalContent: content,
    };

    setLatestPassport(passport);
    setWorkflowStatus('Approved');
    setShowApprovedStamp(true);
  };

  const handleRequestChanges = () => {
    setWorkflowStatus('Changes requested');
    const newCmt: CommentItem = {
      id: `cmt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: 'Reviewer',
      role: 'reviewer',
      text: 'Please address the remaining flagged items before final approval.',
    };
    setComments(prev => [...prev, newCmt]);
    setActiveTab('comments');
  };

  const renderProofContent = () => {
    if (findings.length === 0) {
      return (
        <p className="font-serif text-lg leading-relaxed text-[#1B1B1F] whitespace-pre-wrap">
          {content}
        </p>
      );
    }

    const sorted = [...findings].sort((a, b) => a.startOffset - b.startOffset);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((finding, idx) => {
      const matchIndex = content.indexOf(finding.flaggedText, lastIndex);

      if (matchIndex !== -1 && matchIndex >= lastIndex) {
        if (matchIndex > lastIndex) {
          elements.push(
            <span key={`text-${idx}`}>
              {content.substring(lastIndex, matchIndex)}
            </span>
          );
        }

        const isActive = activeFindingId === finding.id;
        const isResolved = finding.decision.status === 'accepted';

        let underlineClass = 'pen-underline-warning';
        if (finding.severity === 'error') underlineClass = 'pen-underline-error';
        if (finding.severity === 'gap') underlineClass = 'pen-underline-gap';
        if (isActive) underlineClass += ' active-mark';

        elements.push(
          <span
            key={`flag-${finding.id}`}
            onClick={() => scrollToFinding(finding.id)}
            className={`${underlineClass} inline-block transition-all`}
            title={`Click to view margin note: ${finding.ruleName}`}
          >
            {isResolved ? (
              <span className="line-through text-[#5B5B63]/60 mr-1">
                {finding.flaggedText}
              </span>
            ) : (
              finding.flaggedText
            )}
            {isResolved && finding.decision.customReplacement && (
              <span className="underline font-medium text-[#1F6B3A]">
                {finding.decision.customReplacement}
              </span>
            )}
          </span>
        );

        lastIndex = matchIndex + finding.flaggedText.length;
      }
    });

    if (lastIndex < content.length) {
      elements.push(
        <span key="text-end">
          {content.substring(lastIndex)}
        </span>
      );
    }

    return (
      <p className="font-serif text-lg sm:text-xl leading-relaxed text-[#1B1B1F] whitespace-pre-wrap">
        {elements}
      </p>
    );
  };

  const highRiskFindings = findings.filter(f => f.isHighRisk && f.decision.status === 'pending');
  const pendingDecisions = findings.filter(f => f.decision.status === 'pending');
  const acceptedDecisions = findings.filter(f => f.decision.status === 'accepted');

  const contrastResult = calculateContrast(imageAsset.textColor, imageAsset.bgColor);
  const canReviewerAct = workflowStatus === 'In review';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E3DDD2]">

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-[#5B5B63] uppercase tracking-wider block">
            Load sample copy (sample inputs, not results)
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SAMPLE_DATA.map((sample) => (
              <button
                key={sample.id}
                onClick={() => handleLoadSample(sample.id)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-[#E3DDD2] text-[#1B1B1F] hover:bg-[#FAF7F2] hover:border-[#0F5C5C]/40 transition-colors shadow-2xs"
                title={sample.shortDesc}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 self-start lg:self-auto bg-[#EDE8DF] p-1 rounded-lg border border-[#E3DDD2] text-xs">
          {(['Draft', 'Checked', 'In review', 'Approved'] as WorkflowStatus[]).map((step, idx) => {
            const isCurrent = workflowStatus === step;
            const isPassed =
              (step === 'Draft' && workflowStatus !== 'Draft') ||
              (step === 'Checked' && (workflowStatus === 'In review' || workflowStatus === 'Approved')) ||
              (step === 'In review' && workflowStatus === 'Approved');

            return (
              <div key={step} className="flex items-center gap-1">
                <span
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                    isCurrent
                      ? 'bg-white text-[#1B1B1F] font-semibold shadow-xs'
                      : isPassed
                      ? 'text-[#1F6B3A]'
                      : 'text-[#5B5B63]'
                  }`}
                >
                  {isPassed ? <Check className="w-3 h-3 text-[#1F6B3A]" /> : null}
                  <span>{step}</span>
                </span>
                {idx < 3 && <ChevronRight className="w-3 h-3 text-[#5B5B63]/60" />}
              </div>
            );
          })}
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <div className="lg:col-span-8 space-y-6">

          <div className="paper-sheet rounded-2xl p-6 sm:p-10 transition-shadow relative">

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-6 mb-6 border-b border-[#E3DDD2] text-xs">

              <div className="sm:col-span-4 space-y-1">
                <label className="font-semibold text-[#5B5B63] uppercase tracking-wider text-[11px] block">
                  Publishing Channel: <span className="text-[#0F5C5C] font-bold">{channel}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customChannelInput}
                    onChange={(e) => setCustomChannelInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSetCustomChannel();
                      }
                    }}
                    placeholder="Type channel..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#E3DDD2] bg-[#FAF7F2] text-[#1B1B1F] text-xs font-medium focus-visible:border-[#0F5C5C]"
                  />
                  <button
                    type="button"
                    onClick={handleSetCustomChannel}
                    className="px-3 py-1.5 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Enter
                  </button>
                </div>
              </div>

              <div className="sm:col-span-8 space-y-1">
                <label className="font-semibold text-[#5B5B63] uppercase tracking-wider text-[11px] block">
                  Author Intent ("What are you trying to say?")
                </label>
                <input
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="e.g. Announce flexible savings with zero penalty fees"
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E3DDD2] bg-[#FAF7F2] text-[#1B1B1F] placeholder-[#5B5B63] focus-visible:border-[#0F5C5C]"
                />
              </div>

            </div>

            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-1 p-0.5 bg-[#EDE8DF] rounded-md border border-[#E3DDD2] text-xs">
                <button
                  onClick={() => setViewMode('proof')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    viewMode === 'proof'
                      ? 'bg-white text-[#1B1B1F] shadow-xs font-semibold'
                      : 'text-[#5B5B63] hover:text-[#1B1B1F]'
                  }`}
                >
                  Proof View (Pen Marks)
                </button>
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 rounded font-medium transition-colors ${
                    viewMode === 'edit'
                      ? 'bg-white text-[#1B1B1F] shadow-xs font-semibold'
                      : 'text-[#5B5B63] hover:text-[#1B1B1F]'
                  }`}
                >
                  Edit Copy Directly
                </button>
              </div>

              <button
                onClick={() => handleRunCheck(content, intent, imageAsset)}
                disabled={isChecking}
                className="px-4 py-1.5 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Verifying against Canon...' : 'Check Content'}</span>
              </button>
            </div>

            <div className="min-h-[160px] p-6 rounded-xl bg-[#FAF7F2]/50 border border-[#E3DDD2]/70 relative">

              {isChecking && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center rounded-xl z-20">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#0F5C5C]">
                    <div className="w-2 h-2 rounded-full bg-[#0F5C5C] animate-ping" />
                    <span>Verifying rules, claims ledger, and tone checks...</span>
                  </div>
                </div>
              )}

              {viewMode === 'proof' ? (
                <div>
                  {renderProofContent()}
                  <p
                    className="mt-3 text-[11px] font-medium"
                    style={{ color: usedAiNotice ? '#8A5A00' : '#0F5C5C' }}
                  >
                    {usedAiNotice
                      ? 'Backend unreachable: showing rule-based and keyword-heuristic results only.'
                      : engineMeta?.ml_available
                        ? `Trained models ran locally (claim: ${engineMeta?.tasks?.claim ? 'yes' : 'no'}, tone: ${engineMeta?.tasks?.tone ? 'yes' : 'no'}) in ${engineMeta?.latency_ms ?? '?'} ms.`
                        : 'Backend reachable, but ML models are not loaded: rule-based results only.'}
                  </p>
                  <p className="mt-3 text-[11px] text-[#5B5B63] border-t border-[#E3DDD2]/60 pt-3 flex items-center justify-between">
                    <span>Click on any underlined pen mark to view margin note & recommendations</span>
                    <span className="font-mono">{content.length} characters</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    className="w-full p-3 font-serif text-lg leading-relaxed bg-white border border-[#E3DDD2] rounded-lg text-[#1B1B1F] focus-visible:border-[#0F5C5C]"
                    placeholder="Paste or write your marketing copy here..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setViewMode('proof');
                        handleRunCheck(content, intent, imageAsset);
                      }}
                      className="px-3 py-1 bg-[#0F5C5C] text-white text-xs font-medium rounded hover:bg-[#0B4747]"
                    >
                      Update & View Proof
                    </button>
                  </div>
                </div>
              )}

            </div>

            <div className="mt-6 pt-6 border-t border-[#E3DDD2]">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowImageInspector(!showImageInspector)}
                  className="text-xs font-semibold text-[#0F5C5C] hover:text-[#0B4747] flex items-center gap-1.5 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{showImageInspector ? 'Hide Visual & Alt-Text Inspector' : 'Attach / Inspect Visual Banner & Contrast'}</span>
                </button>
                {showImageInspector && (
                  <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                    contrastResult.passesAA ? 'bg-[#E2F2E7] text-[#1F6B3A]' : 'bg-[#FBE4E1] text-[#B3261E]'
                  }`}>
                    Contrast: {contrastResult.ratio}:1 ({contrastResult.passesAA ? 'Passes WCAG AA' : 'Fails WCAG AA'})
                  </span>
                )}
              </div>

              {showImageInspector && (
                <div className="mt-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#E3DDD2] space-y-4 text-xs animate-in fade-in duration-150">

                  <div className="space-y-3">
                    <div className="font-serif font-bold text-sm text-[#1B1B1F]">
                      Visual & Alt-Text Inspector
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-[#E3DDD2]">
                      <div>
                        <div className="font-semibold text-[#1B1B1F]">Contrast</div>
                        <div className="text-xs font-mono text-[#5B5B63] mt-0.5">
                          {contrastResult.ratio}:1 · {contrastResult.passesAA ? 'Passes WCAG AA' : 'Fails WCAG AA'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-semibold text-[#5B5B63]">Checks the colours and alt text entered here</div>
                        <div className="text-[10px] text-[#5B5B63]">The image itself is not machine-read. The Reviewer inspects it visually.</div>
                      </div>
                    </div>

                    <div className="p-4 border-2 border-dashed border-[#E3DDD2] rounded-lg bg-white text-center space-y-2 hover:border-[#0F5C5C] transition-colors">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="hidden"
                      />
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Upload className="w-6 h-6 text-[#0F5C5C]" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Upload File
                        </button>
                        <span className="text-[11px] text-[#5B5B63] font-medium">PNG, JPG, JPEG, WEBP</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="p-6 rounded-lg border border-[#E3DDD2] shadow-inner text-center transition-colors overflow-hidden relative"
                    style={{ backgroundColor: imageAsset.bgColor, color: imageAsset.textColor }}
                  >
                    {uploadedImageUrl ? (
                      <div className="space-y-3">
                        <img
                          src={uploadedImageUrl}
                          alt={imageAsset.altText || "Uploaded visual banner preview"}
                          className="max-h-48 mx-auto object-contain rounded border border-[#E3DDD2]/40 shadow-xs"
                        />
                        <p className="text-xs italic opacity-90">
                          {imageAsset.altText || "No alt text provided"}
                        </p>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-serif text-lg font-bold">
                          Lumen Savings
                        </h3>
                        <p className="text-xs mt-1 max-w-md mx-auto">
                          {content.substring(0, 70)}...
                        </p>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <div>
                      <label className="font-semibold text-[#1B1B1F] block mb-1">
                        Text Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={imageAsset.textColor}
                          onChange={(e) => {
                            const newImg = { ...imageAsset, textColor: e.target.value };
                            setImageAsset(newImg);
                            handleRunCheck(content, intent, newImg);
                          }}
                          className="w-8 h-8 rounded border border-[#E3DDD2] cursor-pointer"
                        />
                        <input
                          type="text"
                          value={imageAsset.textColor}
                          onChange={(e) => {
                            const newImg = { ...imageAsset, textColor: e.target.value };
                            setImageAsset(newImg);
                            handleRunCheck(content, intent, newImg);
                          }}
                          className="px-2 py-1 text-xs font-mono bg-white border border-[#E3DDD2] rounded w-24"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-[#1B1B1F] block mb-1">
                        Background Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={imageAsset.bgColor}
                          onChange={(e) => {
                            const newImg = { ...imageAsset, bgColor: e.target.value };
                            setImageAsset(newImg);
                            handleRunCheck(content, intent, newImg);
                          }}
                          className="w-8 h-8 rounded border border-[#E3DDD2] cursor-pointer"
                        />
                        <select
                          value={APPROVED_BG_COLORS.some(c => c.hex.toUpperCase() === imageAsset.bgColor.toUpperCase()) ? imageAsset.bgColor : 'custom'}
                          onChange={(e) => {
                            if (e.target.value === 'custom') return;
                            const newImg = { ...imageAsset, bgColor: e.target.value };
                            setImageAsset(newImg);
                            handleRunCheck(content, intent, newImg);
                          }}
                          className="px-2 py-1 text-xs bg-white border border-[#E3DDD2] rounded"
                        >
                          {APPROVED_BG_COLORS.map(c => (
                            <option key={c.hex} value={c.hex}>{c.name} ({c.hex})</option>
                          ))}
                          <option value="custom">Custom (off-palette)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-[#1B1B1F] block mb-1">
                        Image Alt Text (Screen Reader)
                      </label>
                      <input
                        type="text"
                        placeholder="Describe graphic for screen readers..."
                        value={imageAsset.altText}
                        onChange={(e) => {
                          const newImg = { ...imageAsset, altText: e.target.value };
                          setImageAsset(newImg);
                          handleRunCheck(content, intent, newImg);
                        }}
                        className={`w-full px-2.5 py-1 text-xs bg-white border rounded ${
                          !imageAsset.altText ? 'border-[#B3261E]' : 'border-[#E3DDD2]'
                        }`}
                      />
                      {!imageAsset.altText && (
                        <span className="text-[10px] text-[#B3261E] block mt-0.5">
                          Missing alt text will be flagged by Canon.
                        </span>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>

            {trackedChanges.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#E3DDD2]">
                <span className="text-[11px] font-semibold text-[#5B5B63] uppercase tracking-wider block mb-2">
                  Tracked Changes Applied
                </span>
                <div className="space-y-1 text-xs bg-[#FAF7F2] p-3 rounded-lg border border-[#E3DDD2]">
                  {trackedChanges.map((tc, idx) => (
                    <div key={idx} className="flex items-center gap-2 font-mono">
                      <span className="line-through text-[#B3261E] bg-[#FBE4E1] px-1 rounded">
                        {tc.original}
                      </span>
                      <ArrowRight className="w-3 h-3 text-[#5B5B63]" />
                      <span className="underline text-[#1F6B3A] bg-[#E2F2E7] px-1 rounded">
                        {tc.replaced}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-[#E3DDD2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              {role === 'creator' ? (
                <>
                  <div className="text-xs text-[#5B5B63] space-y-1">
                    {pendingDecisions.length > 0 ? (
                      <span className="block">{pendingDecisions.length} flagged {pendingDecisions.length === 1 ? 'item requires' : 'items require'} creator review before submitting.</span>
                    ) : (
                      <span className="text-[#1F6B3A] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        All findings resolved or justified. Ready for review.
                      </span>
                    )}
                    {submitHint && (
                      <span className="block text-[11px] text-[#B3261E] font-medium">
                        {submitHint}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleSubmitForReview}
                    disabled={isChecking}
                    className="px-5 py-2 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit for Review</span>
                  </button>
                </>
              ) : (
                <div className="w-full space-y-4">
                  <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E3DDD2] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-sm font-bold text-[#1B1B1F]">
                        Reviewer Sign-Off Console
                      </span>
                      {highRiskFindings.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-medium bg-[#FFF1D6] text-[#8A5A00] border border-[#8A5A00]/30 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Needs Authorised Reviewer
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#5B5B63]">
                      Decisions: <strong className="text-[#1F6B3A]">{acceptedDecisions.length} Accepted</strong> · <strong className="text-[#8A5A00]">{findings.filter(f => f.decision.status === 'kept').length} Kept with reason</strong> · <strong className="text-[#B3261E]">{findings.filter(f => f.decision.status === 'disputed').length} Disputed</strong>.
                    </p>

                    {!canReviewerAct && (
                      <p className="text-[11px] text-[#8A5A00]">
                        Approval is available after the Creator submits for review (current status: {workflowStatus}).
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={handleRequestChanges}
                      disabled={!canReviewerAct}
                      className="px-4 py-2 border border-[#B3261E]/40 text-[#B3261E] hover:bg-[#FBE4E1] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Request Changes
                    </button>

                    <div className="flex items-center gap-2">
                      {latestPassport && (
                        <button
                          onClick={() => onOpenPassport(latestPassport)}
                          className="px-3.5 py-2 bg-white border border-[#E3DDD2] text-[#0F5C5C] hover:bg-[#FAF7F2] rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
                        >
                          <FileCheck2 className="w-4 h-4" />
                          <span>View Brand Passport</span>
                        </button>
                      )}

                      <button
                        onClick={handleApprove}
                        disabled={!canReviewerAct}
                        className="px-5 py-2 bg-[#1F6B3A] hover:bg-[#18552E] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve & Certify Brand Truth</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

          <div className="bg-white rounded-xl border border-[#E3DDD2] p-5 shadow-xs space-y-4">

            <div className="flex items-center justify-between border-b border-[#E3DDD2] pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('notes')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'notes'
                      ? 'bg-[#0F5C5C] text-white'
                      : 'text-[#5B5B63] hover:text-[#1B1B1F]'
                  }`}
                >
                  Finding Summary ({findings.length})
                </button>

                <button
                  onClick={() => setActiveTab('comments')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'comments'
                      ? 'bg-[#0F5C5C] text-white'
                      : 'text-[#5B5B63] hover:text-[#1B1B1F]'
                  }`}
                >
                  Comments Thread ({comments.length})
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === 'history'
                      ? 'bg-[#0F5C5C] text-white'
                      : 'text-[#5B5B63] hover:text-[#1B1B1F]'
                  }`}
                >
                  Revision History ({revisions.length})
                </button>
              </div>

              <span className="text-[11px] font-mono text-[#5B5B63]">
                Session audit trail
              </span>
            </div>

            {activeTab === 'comments' && (
              <div className="space-y-3">
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {comments.length === 0 && (
                    <p className="text-xs text-[#5B5B63] italic py-3 text-center">
                      No comments yet.
                    </p>
                  )}
                  {comments.map((cmt) => (
                    <div key={cmt.id} className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E3DDD2] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1B1B1F] flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${cmt.role === 'creator' ? 'bg-[#0F5C5C]' : 'bg-[#1F6B3A]'}`} />
                          {cmt.author}
                        </span>
                        <span className="font-mono text-[10px] text-[#5B5B63]">
                          {cmt.timestamp}
                        </span>
                      </div>
                      <p className="text-[#1B1B1F] leading-relaxed">
                        {cmt.text}
                      </p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={role === 'creator' ? 'Reply to reviewer...' : 'Add feedback note for creator...'}
                    className="flex-1 px-3 py-1.5 bg-[#FAF7F2] rounded-lg border border-[#E3DDD2] text-xs text-[#1B1B1F] focus-visible:border-[#0F5C5C]"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#0F5C5C] text-white rounded-lg text-xs font-medium hover:bg-[#0B4747]"
                  >
                    Post
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {revisions.length === 0 ? (
                  <p className="text-xs text-[#5B5B63] italic py-3 text-center">
                    No tracked changes accepted yet. Fixes accepted from margin notes will be logged here.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {revisions.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E3DDD2] text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px] text-[#5B5B63]">
                          <span>{rev.timestamp} · {rev.authorRole}</span>
                          <span className="text-[#0F5C5C]">Delta Applied</span>
                        </div>
                        <p className="text-[#1B1B1F] font-medium">
                          {rev.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded bg-[#FAF7F2] border border-[#E3DDD2]">
                  <span className="text-[10px] text-[#5B5B63] uppercase block font-semibold">Total Flagged</span>
                  <span className="font-serif text-lg font-bold text-[#1B1B1F]">{findings.length}</span>
                </div>
                <div className="p-2.5 rounded bg-[#FBE4E1] border border-[#B3261E]/20">
                  <span className="text-[10px] text-[#B3261E] uppercase block font-semibold">Errors</span>
                  <span className="font-serif text-lg font-bold text-[#B3261E]">{findings.filter(f => f.severity === 'error').length}</span>
                </div>
                <div className="p-2.5 rounded bg-[#FFF1D6] border border-[#8A5A00]/20">
                  <span className="text-[10px] text-[#8A5A00] uppercase block font-semibold">Warnings / Stale</span>
                  <span className="font-serif text-lg font-bold text-[#8A5A00]">{findings.filter(f => f.severity === 'warning').length}</span>
                </div>
                <div className="p-2.5 rounded bg-[#E8F3F3] border border-[#0F5C5C]/20">
                  <span className="text-[10px] text-[#0F5C5C] uppercase block font-semibold">Accepted Fixes</span>
                  <span className="font-serif text-lg font-bold text-[#0F5C5C]">{acceptedDecisions.length}</span>
                </div>
              </div>
            )}

          </div>

        </div>

        <div className="lg:col-span-4 space-y-4">

          <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD2]">
            <div className="flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#0F5C5C]" />
              <h2 className="font-serif text-base font-bold text-[#1B1B1F]">
                Margin Notes
              </h2>
            </div>
            <span className="text-xs text-[#5B5B63] font-mono">
              {findings.length} findings
            </span>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {findings.length === 0 ? (
              <div className="p-6 rounded-xl bg-white border border-[#E3DDD2] text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#1F6B3A] mx-auto" />
                <h3 className="font-serif text-sm font-bold text-[#1B1B1F]">
                  Clean Proof
                </h3>
                <p className="text-xs text-[#5B5B63]">
                  No issues flagged against the current Canon rules and Claim Ledger facts.
                </p>
              </div>
            ) : (
              findings.map((finding) => {
                const isActive = activeFindingId === finding.id;
                const isAccepted = finding.decision.status === 'accepted';
                const isKept = finding.decision.status === 'kept';
                const isDisputed = finding.decision.status === 'disputed';

                if (finding.isAbstain) {
                  return (
                    <article
                      key={finding.id}
                      ref={(el) => { marginNotesRef.current[finding.id] = el; }}
                      className={`p-4 rounded-xl border-2 border-dashed transition-all space-y-3 ${
                        isActive
                          ? 'border-[#78716C] bg-white shadow-md'
                          : 'border-[#78716C]/40 bg-[#FAF7F2]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] font-semibold text-[#5B5B63] bg-white px-2 py-0.5 rounded border border-[#E3DDD2]">
                          Guideline Gap
                        </span>
                        <span className="text-[10px] font-medium text-[#78716C] bg-[#EDE8DF] px-2 py-0.5 rounded">
                          {finding.origin} · Advisory
                        </span>
                      </div>

                      <div>
                        <h4 className="font-serif text-sm font-bold text-[#1B1B1F]">
                          No Rule Covers This
                        </h4>
                        <div className="mt-1 p-2 rounded bg-white border border-[#E3DDD2] text-xs font-mono text-[#5B5B63]">
                          "{finding.flaggedText}"
                        </div>
                        <p className="text-xs text-[#5B5B63] mt-2 leading-relaxed">
                          {finding.whyFlagged}
                        </p>
                      </div>

                      {isKept ? (
                        <div className="p-2 rounded bg-[#E2F2E7] text-[11px] text-[#1F6B3A] font-medium flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
                          <span>Flagged for guideline review</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLogGap(finding)}
                          className="w-full py-1.5 bg-white hover:bg-[#FAF7F2] text-[#1B1B1F] border border-[#78716C]/40 rounded-md text-xs font-medium transition-colors shadow-2xs flex items-center justify-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-[#0F5C5C]" />
                          <span>Flag for guideline review</span>
                        </button>
                      )}
                    </article>
                  );
                }

                return (
                  <article
                    key={finding.id}
                    ref={(el) => { marginNotesRef.current[finding.id] = el; }}
                    onClick={() => setActiveFindingId(finding.id)}
                    className={`p-4 rounded-xl border transition-all space-y-3 cursor-pointer ${
                      isActive
                        ? 'border-[#0F5C5C] bg-white shadow-md ring-1 ring-[#0F5C5C]/20'
                        : 'border-[#E3DDD2] bg-[#FAF7F2] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs flex-wrap gap-1">
                      <div className="flex items-center gap-1.5">
                        {finding.severity === 'error' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#B3261E] bg-[#FBE4E1] px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3" />
                            Error
                          </span>
                        )}
                        {finding.severity === 'warning' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8A5A00] bg-[#FFF1D6] px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Warning
                          </span>
                        )}
                        <span className="text-[#5B5B63] font-medium">
                          {finding.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-[#5B5B63]">
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E3DDD2]">
                          {finding.origin}
                        </span>
                        <span>· {finding.confidence} Confidence</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold text-[#0F5C5C] bg-white px-2 py-0.5 rounded border border-[#E3DDD2]">
                          {finding.ruleId}
                        </span>
                        {finding.isHighRisk && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#8A5A00] bg-[#FFF1D6] px-1.5 py-0.5 rounded">
                            <ShieldAlert className="w-3 h-3" />
                            Authorised Reviewer
                          </span>
                        )}
                      </div>

                      <div className="p-2 rounded bg-white border border-[#E3DDD2] text-xs font-mono text-[#1B1B1F]">
                        "{finding.flaggedText}"
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-semibold text-[#5B5B63] block">
                        Why this was flagged
                      </span>
                      <p className="text-xs text-[#1B1B1F] mt-0.5 leading-relaxed">
                        {finding.whyFlagged}
                      </p>
                    </div>

                    {isAccepted && (
                      <div className="p-2.5 rounded bg-[#E2F2E7] border border-[#1F6B3A]/20 text-xs text-[#1F6B3A] font-medium flex items-center justify-between">
                        <span>Fix applied to text: "{finding.decision.customReplacement}"</span>
                        <Check className="w-4 h-4" />
                      </div>
                    )}

                    {isKept && (
                      <div className="p-2.5 rounded bg-[#FFF1D6] border border-[#8A5A00]/20 text-xs text-[#8A5A00] font-medium">
                        <span>Kept as is. Reason: "{finding.decision.reason}"</span>
                      </div>
                    )}

                    {isDisputed && (
                      <div className="p-2.5 rounded bg-[#FBE4E1] border border-[#B3261E]/20 text-xs text-[#B3261E] font-medium flex items-center justify-between">
                        <span>Finding disputed by author. Escalated to reviewer.</span>
                        <AlertCircle className="w-4 h-4" />
                      </div>
                    )}

                    {!isAccepted && !isKept && !isDisputed && (
                      <div className="space-y-2 pt-2 border-t border-[#E3DDD2]">
                        {finding.suggestions.length > 0 && (
                          <span className="text-[10px] uppercase font-semibold text-[#5B5B63] block">
                            Suggested Fixes
                          </span>
                        )}

                        {finding.suggestions.map((sug) => (
                          <div
                            key={sug.id}
                            className="p-2.5 rounded-lg bg-white border border-[#E3DDD2] hover:border-[#0F5C5C]/50 transition-colors space-y-1.5 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[#1B1B1F]">
                                {sug.label}
                              </span>

                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                sug.intentPreserved.status === 'Yes'
                                  ? 'bg-[#E2F2E7] text-[#1F6B3A]'
                                  : 'bg-[#FFF1D6] text-[#8A5A00]'
                              }`}>
                                {sug.intentPreserved.status === 'Yes' ? '✓ Intent Preserved' : '~ Partly Preserved'}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#5B5B63] italic">
                              "{sug.intentPreserved.explanation}"
                            </p>

                            <div className="flex items-center justify-end gap-1.5 pt-1">
                              <button
                                onClick={() => handleAcceptSuggestion(finding, sug.replacementText)}
                                className="px-2.5 py-1 bg-[#0F5C5C] hover:bg-[#0B4747] text-white rounded text-[11px] font-medium transition-colors"
                              >
                                Accept Fix
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-center justify-between gap-1 pt-2 border-t border-[#E3DDD2] text-xs">
                          <button
                            onClick={() => {
                              setEditingSuggestionId(finding.id);
                              setCustomSuggestionText(finding.suggestions[0]?.replacementText || '');
                            }}
                            className="px-2 py-1 text-[#0F5C5C] hover:bg-[#E8F3F3] rounded transition-colors text-[11px] font-medium"
                          >
                            Edit
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setKeepReasonFinding(finding);
                                setKeepReasonText('');
                              }}
                              className="px-2 py-1 text-[#8A5A00] hover:bg-[#FFF1D6] rounded transition-colors text-[11px] font-medium"
                            >
                              Keep as is
                            </button>

                            <button
                              onClick={() => handleDispute(finding)}
                              className="px-2 py-1 text-[#B3261E] hover:bg-[#FBE4E1] rounded transition-colors text-[11px] font-medium"
                            >
                              Dispute
                            </button>
                          </div>
                        </div>

                        {editingSuggestionId === finding.id && (
                          <div className="p-2.5 rounded-lg bg-white border border-[#0F5C5C] space-y-2 mt-2">
                            <label className="text-[10px] font-semibold text-[#1B1B1F] block">
                              Custom Text Replacement
                            </label>
                            <input
                              type="text"
                              value={customSuggestionText}
                              onChange={(e) => setCustomSuggestionText(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-[#E3DDD2] rounded"
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => setEditingSuggestionId(null)}
                                className="px-2 py-0.5 text-xs text-[#5B5B63]"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => {
                                  handleAcceptSuggestion(finding, customSuggestionText);
                                  setEditingSuggestionId(null);
                                }}
                                className="px-3 py-0.5 bg-[#0F5C5C] text-white rounded text-xs"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

        </div>

      </div>

      {keepReasonFinding && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-[#E3DDD2] p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3DDD2]">
              <h3 className="font-serif text-base font-bold text-[#1B1B1F]">
                Override Justification Required
              </h3>
              <button
                onClick={() => setKeepReasonFinding(null)}
                className="text-[#5B5B63] hover:text-[#1B1B1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5B5B63]">
              To maintain audit accountability and evolve policy, please provide a business reason for keeping:
              <br />
              <strong className="text-[#1B1B1F] font-mono mt-1 block">
                "{keepReasonFinding.flaggedText}" ({keepReasonFinding.ruleId})
              </strong>
            </p>

            <form onSubmit={handleKeepWithReasonSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                value={keepReasonText}
                onChange={(e) => setKeepReasonText(e.target.value)}
                placeholder="e.g. Legal exception granted per campaign waiver, or targeting non-retail wholesale partners..."
                className="w-full p-2.5 text-xs bg-[#FAF7F2] rounded-lg border border-[#E3DDD2] text-[#1B1B1F] focus-visible:border-[#0F5C5C]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setKeepReasonFinding(null)}
                  className="px-3 py-1.5 text-xs text-[#5B5B63] hover:text-[#1B1B1F]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#8A5A00] text-white rounded text-xs font-medium hover:bg-[#6D4700]"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showApprovedStamp && latestPassport && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-white rounded-xl border-2 border-[#1F6B3A] shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="stamp-badge border-2 border-[#1F6B3A] rounded px-3 py-1 bg-[#E2F2E7] text-center">
            <span className="font-serif text-sm font-black text-[#1F6B3A] tracking-wider block">
              APPROVED
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[#1B1B1F]">
                Brand Passport Generated
              </span>
              <span className="font-mono text-[10px] text-[#5B5B63]">
                {latestPassport.recordId}
              </span>
            </div>
            <p className="text-[11px] text-[#5B5B63]">
              Record issued under Canon v4.2.1.
            </p>
          </div>
          <button
            onClick={() => onOpenPassport(latestPassport)}
            className="px-3 py-1.5 bg-[#0F5C5C] text-white text-xs font-semibold rounded hover:bg-[#0B4747]"
          >
            Open Passport
          </button>
        </div>
      )}

    </div>
  );
};
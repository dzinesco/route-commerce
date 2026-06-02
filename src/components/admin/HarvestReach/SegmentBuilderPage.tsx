"use client";

import { useState } from "react";
import { type Segment, type SegmentRuleV2 } from "@/actions/harvest-reach/segments";
import SegmentBuilderPanel from "./SegmentBuilderPanel";
import MatchingCustomersPanel from "./MatchingCustomersPanel";
import SegmentListSidebar from "./SegmentListSidebar";
import SegmentEditModal from "./SegmentEditModal";
import { AdminButton } from "@/components/admin/design-system";

// Icon components
const LayersIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
);

const PlusIcon = ({ className }: { className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// Empty state component for segments
function SegmentsEmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Decorative background */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 blur-2xl opacity-60" />
        </div>
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-xl shadow-emerald-500/20">
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </div>
      </div>
      <h3 className="text-xl font-bold text-stone-800">No segments yet</h3>
      <p className="mt-3 text-sm text-stone-500 max-w-sm leading-relaxed">
        Create segments to organize your contacts and send targeted campaigns to specific audiences.
      </p>
      <AdminButton 
        onClick={onNew} 
        className="mt-8" 
        icon={<PlusIcon className="w-4 h-4" />}
      >
        Create Your First Segment
      </AdminButton>
    </div>
  );
}

// Active segment header with refined design
function ActiveSegmentHeader({ segment, onClear, customerCount }: { segment: Segment | null; onClear: () => void; customerCount?: number }) {
  if (!segment) return null;
  
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 mb-6">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-stone-800">{segment.name}</p>
            {customerCount !== undefined && customerCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                {customerCount.toLocaleString()} customers
              </span>
            )}
          </div>
          {segment.description && (
            <p className="text-xs text-stone-500 mt-0.5">{segment.description}</p>
          )}
        </div>
      </div>
      <button
        onClick={onClear}
        className="text-xs font-medium text-stone-500 hover:text-stone-700 hover:bg-stone-100 px-3 py-1.5 rounded-lg transition-colors"
      >
        Clear selection
      </button>
    </div>
  );
}

export default function SegmentBuilderPage({ brandId, initialSegments }: Props) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [activeSegment, setActiveSegment] = useState<Segment | null>(null);
  const [currentRules, setCurrentRules] = useState<SegmentRuleV2>({
    combinator: "AND",
    filters: [],
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [customerCount, setCustomerCount] = useState<number | undefined>(undefined);

  function handleSegmentSelect(segment: Segment) {
    setActiveSegment(segment);
    setCurrentRules(segment.rules as SegmentRuleV2);
  }

  function handleNewSegment() {
    setActiveSegment(null);
    setCurrentRules({ combinator: "AND", filters: [] });
    setShowEditModal(true);
  }

  function handleClearSelection() {
    setActiveSegment(null);
    setCurrentRules({ combinator: "AND", filters: [] });
    setCustomerCount(undefined);
  }

  function handleRulesChange(rules: SegmentRuleV2) {
    setCurrentRules(rules);
  }

  function handleCustomerCount(count: number) {
    setCustomerCount(count);
  }

  async function handleSaveSegment(name: string, description: string) {
    const { upsertHarvestReachSegment } = await import("@/actions/harvest-reach/segments");
    const result = await upsertHarvestReachSegment({
      id: activeSegment?.id,
      brand_id: brandId,
      name,
      description,
      rules: currentRules,
    });
    if (result.success) {
      if (activeSegment) {
        setSegments((prev) =>
          prev.map((s) => (s.id === result.segment.id ? result.segment : s))
        );
      } else {
        setSegments((prev) => [...prev, result.segment]);
      }
      setActiveSegment(result.segment);
      setShowEditModal(false);
    }
  }

  async function handleDeleteSegment(segmentId: string) {
    const { deleteHarvestReachSegment } = await import("@/actions/harvest-reach/segments");
    await deleteHarvestReachSegment(segmentId, brandId);
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    if (activeSegment?.id === segmentId) {
      handleClearSelection();
    }
  }

  const hasFilters = currentRules.filters.length > 0;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <LayersIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--admin-text-primary)]">Segment Builder</h1>
          <p className="text-sm text-[var(--admin-text-muted)]">Build filters to define your audience, then save and reuse the segment.</p>
        </div>
      </div>

      {/* Show empty state if no segments */}
      {segments.length === 0 ? (
        <SegmentsEmptyState onNew={handleNewSegment} />
      ) : (
        <>
          {/* Active segment indicator */}
          <ActiveSegmentHeader segment={activeSegment} onClear={handleClearSelection} customerCount={customerCount} />

          {/* Main layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left sidebar */}
            <div className="lg:w-72 flex-shrink-0">
              <SegmentListSidebar
                segments={segments}
                activeSegmentId={activeSegment?.id}
                onSelect={handleSegmentSelect}
                onNew={handleNewSegment}
                onDelete={handleDeleteSegment}
              />
            </div>

            {/* Main content: builder + preview */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SegmentBuilderPanel
                brandId={brandId}
                rules={currentRules}
                onChange={handleRulesChange}
                onSave={() => setShowEditModal(true)}
                hasActiveSegment={!!activeSegment}
              />
              <MatchingCustomersPanel 
                brandId={brandId} 
                rules={currentRules}
                onCountChange={handleCustomerCount}
              />
            </div>
          </div>
        </>
      )}

      {showEditModal && (
        <SegmentEditModal
          initialName={activeSegment?.name ?? ""}
          initialDescription={activeSegment?.description ?? ""}
          onSave={handleSaveSegment}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

type Props = {
  brandId: string;
  initialSegments: Segment[];
};
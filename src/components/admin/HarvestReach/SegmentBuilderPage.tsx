"use client";

import { useState } from "react";
import { type Segment, type SegmentRuleV2 } from "@/actions/harvest-reach/segments";
import SegmentBuilderPanel from "./SegmentBuilderPanel";
import MatchingCustomersPanel from "./MatchingCustomersPanel";
import SegmentListSidebar from "./SegmentListSidebar";
import SegmentEditModal from "./SegmentEditModal";
import { PageHeader, AdminButton, AdminEmptyState } from "@/components/admin/design-system";

type Props = {
  brandId: string;
  initialSegments: Segment[];
};

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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50">
        <svg className="h-10 w-10 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-stone-800">No segments yet</h3>
      <p className="mt-2 text-sm text-stone-500 max-w-xs">
        Create segments to organize your contacts and send targeted campaigns to specific audiences.
      </p>
      <AdminButton onClick={onNew} className="mt-6" icon={<PlusIcon className="w-4 h-4" />}>
        Create Your First Segment
      </AdminButton>
    </div>
  );
}

// Active segment header
function ActiveSegmentHeader({ segment, onClear }: { segment: Segment | null; onClear: () => void }) {
  if (!segment) return null;
  
  return (
    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl border border-emerald-200 mb-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/>
            <polyline points="2 17 12 22 22 17"/>
            <polyline points="2 12 12 17 22 12"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-stone-800">{segment.name}</p>
          {segment.description && (
            <p className="text-xs text-stone-500">{segment.description}</p>
          )}
        </div>
      </div>
      <button
        onClick={onClear}
        className="text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
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
  }

  function handleRulesChange(rules: SegmentRuleV2) {
    setCurrentRules(rules);
    // Only clear active segment if we're editing the rules, not just viewing
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
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        icon={<LayersIcon className="w-5 h-5" />}
        title="Segment Builder"
        subtitle="Build filters to define your audience, then save and reuse the segment."
      />

      {/* Show empty state if no segments */}
      {segments.length === 0 ? (
        <SegmentsEmptyState onNew={handleNewSegment} />
      ) : (
        <>
          {/* Active segment indicator */}
          <ActiveSegmentHeader segment={activeSegment} onClear={handleClearSelection} />

          {/* Main layout */}
          <div className="flex flex-col lg:flex-row gap-4">
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
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SegmentBuilderPanel
                brandId={brandId}
                rules={currentRules}
                onChange={handleRulesChange}
                onSave={() => setShowEditModal(true)}
                hasActiveSegment={!!activeSegment}
              />
              <MatchingCustomersPanel brandId={brandId} rules={currentRules} />
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
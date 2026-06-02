"use client";

import { useState } from "react";
import { type Segment, type SegmentRuleV2 } from "@/actions/harvest-reach/segments";
import SegmentBuilderPanel from "./SegmentBuilderPanel";
import MatchingCustomersPanel from "./MatchingCustomersPanel";
import SegmentListSidebar from "./SegmentListSidebar";
import SegmentEditModal from "./SegmentEditModal";
import { PageHeader, AdminButton } from "@/components/admin/design-system";

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
  }

  function handleRulesChange(rules: SegmentRuleV2) {
    setCurrentRules(rules);
    setActiveSegment(null);
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
      handleNewSegment();
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageHeader
        icon={<LayersIcon className="w-5 h-5" />}
        title="Segment Builder"
        subtitle="Build filters to define your audience, then save and reuse the segment."
      />

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
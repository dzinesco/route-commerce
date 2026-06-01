"use client";

import { useState } from "react";
import { type Segment, type SegmentRuleV2 } from "@/actions/harvest-reach/segments";
import SegmentBuilderPanel from "./SegmentBuilderPanel";
import MatchingCustomersPanel from "./MatchingCustomersPanel";
import SegmentListSidebar from "./SegmentListSidebar";
import SegmentEditModal from "./SegmentEditModal";

type Props = {
  brandId: string;
  initialSegments: Segment[];
};

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
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Segment Builder</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Build filters to define your audience, then save and reuse the segment.
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-5">
        {/* Left sidebar */}
        <div className="w-72 flex-shrink-0">
          <SegmentListSidebar
            segments={segments}
            activeSegmentId={activeSegment?.id}
            onSelect={handleSegmentSelect}
            onNew={handleNewSegment}
            onDelete={handleDeleteSegment}
          />
        </div>

        {/* Main content: builder + preview */}
        <div className="flex-1 grid grid-cols-2 gap-5 min-h-[580px]">
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
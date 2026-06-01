"use client";

import { useState } from "react";
import ShareTraceButton from "@/components/route-trace/ShareTraceButton";

export default function PublicTraceActions({ lotNumber }: { lotNumber: string }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <ShareTraceButton lotNumber={lotNumber} />
    </div>
  );
}
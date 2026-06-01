"use client";

import SquareSyncWidget from "@/components/admin/SquareSyncWidget";

type Props = { brandId: string };

export default function SquareSyncWidgetWrapper({ brandId }: Props) {
  return <SquareSyncWidget brandId={brandId} />;
}
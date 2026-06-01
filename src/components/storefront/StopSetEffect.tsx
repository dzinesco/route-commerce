"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

type StopInfo = {
  id: string;
  city: string;
  state: string;
  date: string;
  time: string;
  location: string;
  brand_id: string;
};

export default function StopSetEffect({ stop }: { stop: StopInfo }) {
  const { setSelectedStop } = useCart();

  useEffect(() => {
    setSelectedStop({ ...stop, time: stop.time });
  }, [stop, setSelectedStop]);

  return null;
}

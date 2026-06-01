"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

type Props = { userId: string };

export default function CartHydration({ userId }: Props) {
  const { loadServerCart } = useCart();

  useEffect(() => {
    if (!userId) return;
    loadServerCart(userId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
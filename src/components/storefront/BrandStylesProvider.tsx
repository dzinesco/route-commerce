"use client";

import { useEffect } from "react";

type BrandColors = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
};

export default function BrandStylesProvider({
  primaryColor,
  secondaryColor,
  bgColor,
  textColor,
}: BrandColors) {
  useEffect(() => {
    if (primaryColor || bgColor || textColor) {
      const root = document.documentElement;
      if (primaryColor) root.style.setProperty("--brand-primary", primaryColor);
      if (secondaryColor) root.style.setProperty("--brand-secondary", secondaryColor);
      if (bgColor) root.style.setProperty("--brand-bg", bgColor);
      if (textColor) root.style.setProperty("--brand-text", textColor);
    }
  }, [primaryColor, secondaryColor, bgColor, textColor]);

  return null;
}
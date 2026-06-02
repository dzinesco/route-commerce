"use client";

import { ReactNode } from "react";

type AdminContainerProps = {
  children: ReactNode;
  className?: string;
};

export default function AdminContainer({ children, className = "" }: AdminContainerProps) {
  return (
    <div className={`mx-auto max-w-6xl ${className}`}>
      {children}
    </div>
  );
}
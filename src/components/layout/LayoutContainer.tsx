import { ReactNode } from "react";

type LayoutContainerProps = {
  children: ReactNode;
};

export default function LayoutContainer({
  children,
}: LayoutContainerProps) {
  return (
    <div className="relative mx-auto max-w-7xl px-6">
      {children}
    </div>
  );
}
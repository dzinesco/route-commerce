"use client";

import PageHeader from "./PageHeader";
import { ReactNode } from "react";

// Re-export PageHeader with description prop mapped to subtitle for backward compatibility
type AdminPageHeaderProps = {
  breadcrumb?: { label: string; href?: string }[];
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export default function AdminPageHeader(props: AdminPageHeaderProps) {
  // Convert description to subtitle for PageHeader
  const { description, ...rest } = props;
  return <PageHeader {...rest} subtitle={description} />;
}
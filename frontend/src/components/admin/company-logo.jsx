"use client";

import { useState } from "react";
import { useAdmin } from "./store";

export const COMPANY_LOGO_SRC = "/images/branding/Logo/Olentra-Logo-Without-Background.png";

export function CompanyLogo({ className = "", src, companyName }) {
  const { db } = useAdmin();
  const company = db.datasets["olentra-admin-company-settings-v1"] || {};
  const [failedSource, setFailedSource] = useState("");
  const source = (src === undefined ? company.logo : src) || COMPANY_LOGO_SRC;
  return <img
    className={`workspace-company-logo ${className}`.trim()}
    src={failedSource === source ? COMPANY_LOGO_SRC : source}
    alt={`${companyName || company.company || "Olentra Technologies"} logo`}
    width={80}
    height={80}
    onError={() => setFailedSource(source)}
  />;
}

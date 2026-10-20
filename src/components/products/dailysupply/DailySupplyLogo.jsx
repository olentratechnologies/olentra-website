"use client";

import React from "react";

export function DailySupplyLogo({
  size = "md",
  showText = true,
  className = "",
  theme = "dark",
}) {
  const heightClass =
    size === "sm" ? "h-6 sm:h-7" : size === "lg" ? "h-11 sm:h-12" : "h-8 sm:h-9";

  const logoSrc =
    theme === "light"
      ? "/images/products/dailysupply/dailysupply-logo-black-text.png"
      : "/images/products/dailysupply/dailysupply-logo-white-text.png";

  if (!showText) {
    const iconDims =
      size === "sm" ? "w-6 h-6" : size === "lg" ? "w-10 h-10" : "w-8 h-8";
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src="/images/products/dailysupply/dailysupply-logo.png"
          alt="DailySupply Icon"
          className={`${iconDims} object-contain`}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoSrc}
        alt="DailySupply"
        className={`${heightClass} w-auto object-contain block`}
      />
    </div>
  );
}

export function NexaLogo(props) {
  return <DailySupplyLogo size={props?.size} />;
}

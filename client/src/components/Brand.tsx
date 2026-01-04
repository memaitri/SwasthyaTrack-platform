import React, { useState } from "react";

type BrandProps = {
  showTagline?: boolean;
  className?: string;
  variant?: "small" | "large";
};

export function Brand({ showTagline = true, className = "", variant = "large" }: BrandProps) {
  const size = variant === "small" ? 48 : 256;
  const srcCandidates = [
    `/logo-swasthya-${size}.png`,
    `/logo-swasthya-${size}.svg`,
    `/logo-swasthya.png`,
    `/logo-swasthya.svg`,
    `/swasthyatrack-logo.png`,
    `/swasthyatrack-logo.jpeg`,
  ];
  const [srcIndex, setSrcIndex] = useState(0);

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const next = srcIndex + 1;
    if (next < srcCandidates.length) {
      setSrcIndex(next);
    } else {
      // hide the image so text-only brand displays
      (e.target as HTMLImageElement).style.display = "none";
    }
  };

  const imgSizeClass = variant === "small" ? "h-8 w-8" : "h-16 w-16";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={srcCandidates[srcIndex]}
        alt="SwasthyaTrack logo"
        className={`${imgSizeClass} object-contain rounded-md shadow-sm`}
        onError={handleImgError}
      />
      <div className="flex flex-col">
        <span className={`text-lg font-semibold ${variant === "small" ? "text-sidebar-foreground" : "text-foreground"}`}>SwasthyaTrack</span>
        {showTagline && (
          <span className="text-xs text-muted-foreground uppercase">TRACKING WELLNESS, EMPOWERING FUTURES</span>
        )}
      </div>
    </div>
  );
}

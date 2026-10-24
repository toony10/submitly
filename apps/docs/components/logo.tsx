import { useId } from "react";

/** The submitly mark: a check whose long stroke ends in an arrowhead. */
export function LogoMark({ size = 24 }: { size?: number }) {
  const gradient = useId();

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${gradient})`} />
      <path
        d="M15.5 33.5 L26.5 44.5 L47.5 23.5 M38.5 23.5 H47.5 V32.5"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

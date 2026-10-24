/**
 * The submitly mark: a check whose long stroke ends in an arrowhead.
 *
 * The tile is a CSS gradient rather than an SVG `<linearGradient>`: Fumadocs renders
 * the nav title in both the mobile header and the desktop sidebar, and an SVG
 * gradient referenced by id resolves to the copy inside the hidden header, which
 * browsers don't paint.
 */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: size * (15 / 64),
        background: "linear-gradient(135deg, #6366F1, #4338CA)",
      }}
    >
      <svg width={size} height={size} viewBox="0 0 64 64">
        <path
          d="M15.5 33.5 L26.5 44.5 L47.5 23.5 M38.5 23.5 H47.5 V32.5"
          fill="none"
          stroke="#fff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

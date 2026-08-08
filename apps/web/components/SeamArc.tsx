interface SeamArcProps {
  /** "dark" = 30% opacity on dark backgrounds, "light" = 15% on light */
  surface?: "dark" | "light";
  /** Width of the SVG in px, scales proportionally */
  size?: number;
  className?: string;
}

/**
 * CPL Signature Element — the double seam arc of a cricket ball.
 * Two parallel curved paths, 6px stroke weight, 3px apart.
 * Rendered in Ember Red at surface-appropriate opacity.
 * Never fills — always stroke-only so it reads as texture not shape.
 */
export default function SeamArc({ surface = "dark", size = 480, className = "" }: SeamArcProps) {
  const opacity = surface === "dark" ? 0.30 : 0.15;
  // Seam arcs: large arc paths that mimic the cricket ball seam curvature.
  // The two paths are offset by ~10 units to create the double-seam effect.
  return (
    <svg
      width={size}
      height={size * 0.6}
      viewBox="0 0 480 288"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ opacity, color: "#C0272D", pointerEvents: "none" }}
      className={className}
    >
      {/* Outer seam arc */}
      <path
        d="M 20 250 C 60 180, 120 60, 240 30 C 360 0, 430 80, 460 160"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner seam arc — offset inward ~12px along the normal */}
      <path
        d="M 32 242 C 72 175, 130 60, 247 34 C 366 8, 434 86, 462 168"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// AppX Logo — 4-quadrant geometric design (a, p, d, x letterforms)
export const LogoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Top-left: "a" — arch open at bottom */}
    <path
      d="M6 48V28C6 15.85 15.85 6 28 6h0c12.15 0 22 9.85 22 22v20H36V28c0-4.42-3.58-8-8-8h0c-4.42 0-8 3.58-8 8v20H6z"
      fill="currentColor"
    />
    {/* Top-right: "p" — arch open at bottom (mirrored) */}
    <path
      d="M54 48V28c0-12.15 9.85-22 22-22h0c12.15 0 22 9.85 22 22v20H84V28c0-4.42-3.58-8-8-8h0c-4.42 0-8 3.58-8 8v20H54z"
      fill="currentColor"
    />
    {/* Bottom-left: "d" — circle with opening at top */}
    <path
      d="M28 54c12.15 0 22 9.85 22 22v0c0 12.15-9.85 22-22 22h0C15.85 98 6 88.15 6 76v0c0-12.15 9.85-22 22-22zm0 14c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8z"
      fill="currentColor"
    />
    {/* Bottom-right: "x" — cross */}
    <path
      d="M62.5 62.5l-4.2-4.2a3 3 0 0 1 0-4.24h0a3 3 0 0 1 4.24 0L76 67.5l13.46-13.46a3 3 0 0 1 4.24 0h0a3 3 0 0 1 0 4.24L80.5 71.5l13.2 13.2a3 3 0 0 1 0 4.24h0a3 3 0 0 1-4.24 0L76 75.5l-13.46 13.46a3 3 0 0 1-4.24 0h0a3 3 0 0 1 0-4.24L71.5 71.5 62.5 62.5z"
      fill="currentColor"
    />
  </svg>
);

export default LogoIcon;

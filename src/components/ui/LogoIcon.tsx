// Logo Icon SVG Component
export const LogoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#60a5fa' }}/>
        <stop offset="100%" style={{ stopColor: '#3b82f6' }}/>
      </linearGradient>
    </defs>
    <g filter="url(#logoGlow)">
      <rect
        x="14"
        y="14"
        width="36"
        height="36"
        rx="8"
        fill="url(#logoGradient)"
        transform="rotate(45 32 32)"
      />
    </g>
  </svg>
);

export default LogoIcon;

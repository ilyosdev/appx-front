import React, { useMemo } from 'react';

// Types for the component props
export interface ParallaxStarsBackgroundProps {
  /**
   * Title text to display in the center (optional)
   */
  title?: string;
  /**
   * Subtitle or additional content
   */
  children?: React.ReactNode;
  /**
   * Class name for the container
   */
  className?: string;
  /**
   * Speed multiplier for the animation
   * @default 1
   */
  speed?: number;
  /**
   * Base color for the stars
   * @default "#FFF"
   */
  starColor?: string;
  /**
   * Background gradient start color (center/bottom)
   * @default "#1B2735"
   */
  backgroundColorStart?: string;
  /**
   * Background gradient end color (outer/top)
   * @default "#090A0F"
   */
  backgroundColorEnd?: string;
}

// Helper to generate random box shadows
const generateBoxShadows = (n: number, color: string) => {
  let value = `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px ${color}`;
  for (let i = 2; i <= n; i++) {
    value += `, ${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px ${color}`;
  }
  return value;
};

export function ParallaxStarsBackground({
  title,
  children,
  className = "",
  speed = 1,
  starColor = "#FFF",
  backgroundColorStart = "#1e1b4b", // Deep Purple
  backgroundColorEnd = "#030014"     // Almost Black Purple
}: ParallaxStarsBackgroundProps) {
  // Memoize shadows so they don't regenerate on re-renders
  const shadowsSmall = useMemo(() => generateBoxShadows(700, starColor), [starColor]);
  const shadowsMedium = useMemo(() => generateBoxShadows(200, starColor), [starColor]);
  const shadowsBig = useMemo(() => generateBoxShadows(100, starColor), [starColor]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Inline styles for the gradient and animations */}
      <style>{`
        .bg-radial-space {
          background: radial-gradient(ellipse at bottom, ${backgroundColorStart} 0%, ${backgroundColorEnd} 100%);
        }
        @keyframes animStar {
          from { transform: translateY(0px); }
          to { transform: translateY(-2000px); }
        }
      `}</style>

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-radial-space z-0" />

      {/* Stars Layer 1 (Small) */}
      <div
        className="absolute left-0 top-0 w-[1px] h-[1px] bg-transparent z-10 animate-[animStar_50s_linear_infinite]"
        style={{
          boxShadow: shadowsSmall,
          animationDuration: `${50 / speed}s`
        }}
      >
        <div
          className="absolute top-[2000px] w-[1px] h-[1px] bg-transparent"
          style={{ boxShadow: shadowsSmall }}
        />
      </div>

      {/* Stars Layer 2 (Medium) */}
      <div
        className="absolute left-0 top-0 w-[2px] h-[2px] bg-transparent z-10 animate-[animStar_100s_linear_infinite]"
        style={{
          boxShadow: shadowsMedium,
          animationDuration: `${100 / speed}s`
        }}
      >
        <div
          className="absolute top-[2000px] w-[2px] h-[2px] bg-transparent"
          style={{ boxShadow: shadowsMedium }}
        />
      </div>

      {/* Stars Layer 3 (Big) */}
      <div
        className="absolute left-0 top-0 w-[3px] h-[3px] bg-transparent z-10 animate-[animStar_150s_linear_infinite]"
        style={{
          boxShadow: shadowsBig,
          animationDuration: `${150 / speed}s`
        }}
      >
        <div
          className="absolute top-[2000px] w-[3px] h-[3px] bg-transparent"
          style={{ boxShadow: shadowsBig }}
        />
      </div>

      {/* Optional Content Overlay */}
      {(title || children) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
           {/* Allow pointer events on children specifically if needed, but default to none for background container */}
           <div className="pointer-events-auto">
             {title && (
                <h1 className="font-light text-[30px] md:text-[50px] tracking-[10px] text-white leading-tight text-center mb-8">
                  {title.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      <span>{line}</span>
                      {i < title.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </h1>
             )}
             {children}
           </div>
        </div>
      )}
    </div>
  );
}

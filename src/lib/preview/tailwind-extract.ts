/**
 * Build-time Tailwind CSS extraction.
 *
 * Scans code for className="..." values, extracts unique class names,
 * and generates corresponding CSS rules using Tailwind v3 default theme.
 * Used as insurance alongside the Tailwind CDN JIT compiler.
 */

// ── Tailwind v3 default spacing scale ──
const SPACING: Record<string, string> = {
  "0": "0px", "px": "1px", "0.5": "0.125rem", "1": "0.25rem",
  "1.5": "0.375rem", "2": "0.5rem", "2.5": "0.625rem", "3": "0.75rem",
  "3.5": "0.875rem", "4": "1rem", "5": "1.25rem", "6": "1.5rem",
  "7": "1.75rem", "8": "2rem", "9": "2.25rem", "10": "2.5rem",
  "11": "2.75rem", "12": "3rem", "14": "3.5rem", "16": "4rem",
  "20": "5rem", "24": "6rem", "28": "7rem", "32": "8rem",
  "36": "9rem", "40": "10rem", "44": "11rem", "48": "12rem",
  "52": "13rem", "56": "14rem", "60": "15rem", "64": "16rem",
  "72": "18rem", "80": "20rem", "96": "24rem",
};

// ── Tailwind v3 default color palette ──
const COLORS: Record<string, Record<string, string>> = {
  slate: {
    "50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0", "300": "#cbd5e1",
    "400": "#94a3b8", "500": "#64748b", "600": "#475569", "700": "#334155",
    "800": "#1e293b", "900": "#0f172a", "950": "#020617",
  },
  gray: {
    "50": "#f9fafb", "100": "#f3f4f6", "200": "#e5e7eb", "300": "#d1d5db",
    "400": "#9ca3af", "500": "#6b7280", "600": "#4b5563", "700": "#374151",
    "800": "#1f2937", "900": "#111827", "950": "#030712",
  },
  zinc: {
    "50": "#fafafa", "100": "#f4f4f5", "200": "#e4e4e7", "300": "#d4d4d8",
    "400": "#a1a1aa", "500": "#71717a", "600": "#52525b", "700": "#3f3f46",
    "800": "#27272a", "900": "#18181b", "950": "#09090b",
  },
  neutral: {
    "50": "#fafafa", "100": "#f5f5f5", "200": "#e5e5e5", "300": "#d4d4d4",
    "400": "#a3a3a3", "500": "#737373", "600": "#525252", "700": "#404040",
    "800": "#262626", "900": "#171717", "950": "#0a0a0a",
  },
  stone: {
    "50": "#fafaf9", "100": "#f5f5f4", "200": "#e7e5e4", "300": "#d6d3d1",
    "400": "#a8a29e", "500": "#78716c", "600": "#57534e", "700": "#44403c",
    "800": "#292524", "900": "#1c1917", "950": "#0c0a09",
  },
  red: {
    "50": "#fef2f2", "100": "#fee2e2", "200": "#fecaca", "300": "#fca5a5",
    "400": "#f87171", "500": "#ef4444", "600": "#dc2626", "700": "#b91c1c",
    "800": "#991b1b", "900": "#7f1d1d", "950": "#450a0a",
  },
  orange: {
    "50": "#fff7ed", "100": "#ffedd5", "200": "#fed7aa", "300": "#fdba74",
    "400": "#fb923c", "500": "#f97316", "600": "#ea580c", "700": "#c2410c",
    "800": "#9a3412", "900": "#7c2d12", "950": "#431407",
  },
  amber: {
    "50": "#fffbeb", "100": "#fef3c7", "200": "#fde68a", "300": "#fcd34d",
    "400": "#fbbf24", "500": "#f59e0b", "600": "#d97706", "700": "#b45309",
    "800": "#92400e", "900": "#78350f", "950": "#451a03",
  },
  yellow: {
    "50": "#fefce8", "100": "#fef9c3", "200": "#fef08a", "300": "#fde047",
    "400": "#facc15", "500": "#eab308", "600": "#ca8a04", "700": "#a16207",
    "800": "#854d0e", "900": "#713f12", "950": "#422006",
  },
  lime: {
    "50": "#f7fee7", "100": "#ecfccb", "200": "#d9f99d", "300": "#bef264",
    "400": "#a3e635", "500": "#84cc16", "600": "#65a30d", "700": "#4d7c0f",
    "800": "#3f6212", "900": "#365314", "950": "#1a2e05",
  },
  green: {
    "50": "#f0fdf4", "100": "#dcfce7", "200": "#bbf7d0", "300": "#86efac",
    "400": "#4ade80", "500": "#22c55e", "600": "#16a34a", "700": "#15803d",
    "800": "#166534", "900": "#14532d", "950": "#052e16",
  },
  emerald: {
    "50": "#ecfdf5", "100": "#d1fae5", "200": "#a7f3d0", "300": "#6ee7b7",
    "400": "#34d399", "500": "#10b981", "600": "#059669", "700": "#047857",
    "800": "#065f46", "900": "#064e3b", "950": "#022c22",
  },
  teal: {
    "50": "#f0fdfa", "100": "#ccfbf1", "200": "#99f6e4", "300": "#5eead4",
    "400": "#2dd4bf", "500": "#14b8a6", "600": "#0d9488", "700": "#0f766e",
    "800": "#115e59", "900": "#134e4a", "950": "#042f2e",
  },
  cyan: {
    "50": "#ecfeff", "100": "#cffafe", "200": "#a5f3fc", "300": "#67e8f9",
    "400": "#22d3ee", "500": "#06b6d4", "600": "#0891b2", "700": "#0e7490",
    "800": "#155e75", "900": "#164e63", "950": "#083344",
  },
  sky: {
    "50": "#f0f9ff", "100": "#e0f2fe", "200": "#bae6fd", "300": "#7dd3fc",
    "400": "#38bdf8", "500": "#0ea5e9", "600": "#0284c7", "700": "#0369a1",
    "800": "#075985", "900": "#0c4a6e", "950": "#082f49",
  },
  blue: {
    "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd",
    "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8",
    "800": "#1e40af", "900": "#1e3a8a", "950": "#172554",
  },
  indigo: {
    "50": "#eef2ff", "100": "#e0e7ff", "200": "#c7d2fe", "300": "#a5b4fc",
    "400": "#818cf8", "500": "#6366f1", "600": "#4f46e5", "700": "#4338ca",
    "800": "#3730a3", "900": "#312e81", "950": "#1e1b4b",
  },
  violet: {
    "50": "#f5f3ff", "100": "#ede9fe", "200": "#ddd6fe", "300": "#c4b5fd",
    "400": "#a78bfa", "500": "#8b5cf6", "600": "#7c3aed", "700": "#6d28d9",
    "800": "#5b21b6", "900": "#4c1d95", "950": "#2e1065",
  },
  purple: {
    "50": "#faf5ff", "100": "#f3e8ff", "200": "#e9d5ff", "300": "#d8b4fe",
    "400": "#c084fc", "500": "#a855f7", "600": "#9333ea", "700": "#7e22ce",
    "800": "#6b21a8", "900": "#581c87", "950": "#3b0764",
  },
  fuchsia: {
    "50": "#fdf4ff", "100": "#fae8ff", "200": "#f5d0fe", "300": "#f0abfc",
    "400": "#e879f9", "500": "#d946ef", "600": "#c026d3", "700": "#a21caf",
    "800": "#86198f", "900": "#701a75", "950": "#4a044e",
  },
  pink: {
    "50": "#fdf2f8", "100": "#fce7f3", "200": "#fbcfe8", "300": "#f9a8d4",
    "400": "#f472b6", "500": "#ec4899", "600": "#db2777", "700": "#be185d",
    "800": "#9d174d", "900": "#831843", "950": "#500724",
  },
  rose: {
    "50": "#fff1f2", "100": "#ffe4e6", "200": "#fecdd3", "300": "#fda4af",
    "400": "#fb7185", "500": "#f43f5e", "600": "#e11d48", "700": "#be123c",
    "800": "#9f1239", "900": "#881337", "950": "#4c0519",
  },
};

// Flat color lookup: "blue-500" → "#3b82f6"
function resolveColor(name: string): string | null {
  if (name === "white") return "#ffffff";
  if (name === "black") return "#000000";
  if (name === "transparent") return "transparent";
  if (name === "current") return "currentColor";
  if (name === "inherit") return "inherit";

  const dashIdx = name.lastIndexOf("-");
  if (dashIdx === -1) return null;
  const palette = name.substring(0, dashIdx);
  const shade = name.substring(dashIdx + 1);
  return COLORS[palette]?.[shade] ?? null;
}

// ── Font sizes ──
const FONT_SIZES: Record<string, [string, string]> = {
  xs: ["0.75rem", "1rem"],
  sm: ["0.875rem", "1.25rem"],
  base: ["1rem", "1.5rem"],
  lg: ["1.125rem", "1.75rem"],
  xl: ["1.25rem", "1.75rem"],
  "2xl": ["1.5rem", "2rem"],
  "3xl": ["1.875rem", "2.25rem"],
  "4xl": ["2.25rem", "2.5rem"],
  "5xl": ["3rem", "1"],
  "6xl": ["3.75rem", "1"],
  "7xl": ["4.5rem", "1"],
  "8xl": ["6rem", "1"],
  "9xl": ["8rem", "1"],
};

// ── Font weights ──
const FONT_WEIGHTS: Record<string, string> = {
  thin: "100", extralight: "200", light: "300", normal: "400",
  medium: "500", semibold: "600", bold: "700", extrabold: "800", black: "900",
};

// ── Border radius ──
const BORDER_RADIUS: Record<string, string> = {
  "none": "0px", "sm": "0.125rem", "": "0.25rem", "md": "0.375rem",
  "lg": "0.5rem", "xl": "0.75rem", "2xl": "1rem", "3xl": "1.5rem", "full": "9999px",
};

// ── Box shadows ──
const BOX_SHADOWS: Record<string, string> = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  "": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  none: "0 0 #0000",
};

// ── Escape class name for CSS selector ──
function esc(cls: string): string {
  return cls.replace(/([.:/[\]#%(),!])/g, "\\$1");
}

// ── Resolve arbitrary value: [200px] → 200px ──
function arb(val: string): string | null {
  if (val.startsWith("[") && val.endsWith("]")) return val.slice(1, -1).replace(/_/g, " ");
  return null;
}

// ── Generate CSS for a single Tailwind class ──
function resolveClass(cls: string): string | null {
  // Handle negative prefix
  const neg = cls.startsWith("-");
  const base = neg ? cls.slice(1) : cls;

  // ── Static utilities ──
  const statics: Record<string, string> = {
    // Display
    hidden: "display:none", block: "display:block", inline: "display:inline",
    "inline-block": "display:inline-block", flex: "display:flex",
    "inline-flex": "display:inline-flex", grid: "display:grid",
    "inline-grid": "display:inline-grid", contents: "display:contents",
    // Position
    static: "position:static", fixed: "position:fixed",
    absolute: "position:absolute", relative: "position:relative",
    sticky: "position:sticky",
    // Flexbox
    "flex-row": "flex-direction:row", "flex-col": "flex-direction:column",
    "flex-row-reverse": "flex-direction:row-reverse",
    "flex-col-reverse": "flex-direction:column-reverse",
    "flex-wrap": "flex-wrap:wrap", "flex-nowrap": "flex-wrap:nowrap",
    "flex-wrap-reverse": "flex-wrap:wrap-reverse",
    "flex-1": "flex:1 1 0%", "flex-auto": "flex:1 1 auto",
    "flex-initial": "flex:0 1 auto", "flex-none": "flex:none",
    grow: "flex-grow:1", "grow-0": "flex-grow:0",
    shrink: "flex-shrink:1", "shrink-0": "flex-shrink:0",
    // Align
    "items-start": "align-items:flex-start", "items-end": "align-items:flex-end",
    "items-center": "align-items:center", "items-baseline": "align-items:baseline",
    "items-stretch": "align-items:stretch",
    "self-auto": "align-self:auto", "self-start": "align-self:flex-start",
    "self-end": "align-self:flex-end", "self-center": "align-self:center",
    "self-stretch": "align-self:stretch",
    // Justify
    "justify-start": "justify-content:flex-start", "justify-end": "justify-content:flex-end",
    "justify-center": "justify-content:center", "justify-between": "justify-content:space-between",
    "justify-around": "justify-content:space-around", "justify-evenly": "justify-content:space-evenly",
    // Text align
    "text-left": "text-align:left", "text-center": "text-align:center",
    "text-right": "text-align:right", "text-justify": "text-align:justify",
    // Text decoration
    underline: "text-decoration-line:underline", "line-through": "text-decoration-line:line-through",
    "no-underline": "text-decoration-line:none",
    // Text transform
    uppercase: "text-transform:uppercase", lowercase: "text-transform:lowercase",
    capitalize: "text-transform:capitalize", "normal-case": "text-transform:none",
    // Whitespace
    "whitespace-normal": "white-space:normal", "whitespace-nowrap": "white-space:nowrap",
    "whitespace-pre": "white-space:pre", "whitespace-pre-line": "white-space:pre-line",
    "whitespace-pre-wrap": "white-space:pre-wrap",
    // Overflow
    "overflow-auto": "overflow:auto", "overflow-hidden": "overflow:hidden",
    "overflow-visible": "overflow:visible", "overflow-scroll": "overflow:scroll",
    "overflow-x-auto": "overflow-x:auto", "overflow-x-hidden": "overflow-x:hidden",
    "overflow-y-auto": "overflow-y:auto", "overflow-y-hidden": "overflow-y:hidden",
    // Truncate
    truncate: "overflow:hidden;text-overflow:ellipsis;white-space:nowrap",
    // Cursor
    "cursor-pointer": "cursor:pointer", "cursor-default": "cursor:default",
    "cursor-not-allowed": "cursor:not-allowed",
    // Pointer events
    "pointer-events-none": "pointer-events:none", "pointer-events-auto": "pointer-events:auto",
    // Object fit
    "object-contain": "object-fit:contain", "object-cover": "object-fit:cover",
    "object-fill": "object-fit:fill", "object-none": "object-fit:none",
    // Inset
    "inset-0": "inset:0px",
    "inset-x-0": "left:0px;right:0px",
    "inset-y-0": "top:0px;bottom:0px",
    "top-0": "top:0px", "right-0": "right:0px",
    "bottom-0": "bottom:0px", "left-0": "left:0px",
    // Sizing
    "w-full": "width:100%", "w-screen": "width:100vw", "w-auto": "width:auto",
    "w-min": "width:min-content", "w-max": "width:max-content", "w-fit": "width:fit-content",
    "h-full": "height:100%", "h-screen": "height:100vh", "h-auto": "height:auto",
    "h-min": "height:min-content", "h-max": "height:max-content", "h-fit": "height:fit-content",
    "min-w-0": "min-width:0px", "min-w-full": "min-width:100%",
    "min-w-min": "min-width:min-content", "min-w-max": "min-width:max-content",
    "min-h-0": "min-height:0px", "min-h-full": "min-height:100%",
    "min-h-screen": "min-height:100vh",
    "max-w-none": "max-width:none", "max-w-full": "max-width:100%",
    "max-w-xs": "max-width:20rem", "max-w-sm": "max-width:24rem",
    "max-w-md": "max-width:28rem", "max-w-lg": "max-width:32rem",
    "max-w-xl": "max-width:36rem", "max-w-2xl": "max-width:42rem",
    "max-w-3xl": "max-width:48rem", "max-w-4xl": "max-width:56rem",
    "max-w-5xl": "max-width:64rem", "max-w-6xl": "max-width:72rem",
    "max-w-7xl": "max-width:80rem", "max-w-screen-sm": "max-width:640px",
    "max-w-screen-md": "max-width:768px", "max-w-screen-lg": "max-width:1024px",
    "max-w-screen-xl": "max-width:1280px",
    "max-h-full": "max-height:100%", "max-h-screen": "max-height:100vh",
    // Border
    border: "border-width:1px",
    "border-0": "border-width:0px", "border-2": "border-width:2px",
    "border-4": "border-width:4px", "border-8": "border-width:8px",
    "border-t": "border-top-width:1px", "border-r": "border-right-width:1px",
    "border-b": "border-bottom-width:1px", "border-l": "border-left-width:1px",
    "border-t-0": "border-top-width:0px", "border-r-0": "border-right-width:0px",
    "border-b-0": "border-bottom-width:0px", "border-l-0": "border-left-width:0px",
    "border-t-2": "border-top-width:2px", "border-r-2": "border-right-width:2px",
    "border-b-2": "border-bottom-width:2px", "border-l-2": "border-left-width:2px",
    "border-solid": "border-style:solid", "border-dashed": "border-style:dashed",
    "border-dotted": "border-style:dotted", "border-none": "border-style:none",
    // Transition
    transition: "transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms",
    "transition-all": "transition-property:all;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms",
    "transition-colors": "transition-property:color,background-color,border-color,text-decoration-color,fill,stroke;transition-timing-function:cubic-bezier(0.4,0,0.2,1);transition-duration:150ms",
    "transition-none": "transition-property:none",
    "duration-75": "transition-duration:75ms", "duration-100": "transition-duration:100ms",
    "duration-150": "transition-duration:150ms", "duration-200": "transition-duration:200ms",
    "duration-300": "transition-duration:300ms", "duration-500": "transition-duration:500ms",
    "duration-700": "transition-duration:700ms", "duration-1000": "transition-duration:1000ms",
    "ease-linear": "transition-timing-function:linear",
    "ease-in": "transition-timing-function:cubic-bezier(0.4,0,1,1)",
    "ease-out": "transition-timing-function:cubic-bezier(0,0,0.2,1)",
    "ease-in-out": "transition-timing-function:cubic-bezier(0.4,0,0.2,1)",
    // Misc
    "aspect-auto": "aspect-ratio:auto", "aspect-square": "aspect-ratio:1/1",
    "aspect-video": "aspect-ratio:16/9",
    "sr-only": "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0",
    "select-none": "user-select:none", "select-text": "user-select:text",
    "select-all": "user-select:all", "select-auto": "user-select:auto",
    italic: "font-style:italic", "not-italic": "font-style:normal",
    "leading-none": "line-height:1", "leading-tight": "line-height:1.25",
    "leading-snug": "line-height:1.375", "leading-normal": "line-height:1.5",
    "leading-relaxed": "line-height:1.625", "leading-loose": "line-height:2",
    "tracking-tighter": "letter-spacing:-0.05em", "tracking-tight": "letter-spacing:-0.025em",
    "tracking-normal": "letter-spacing:0em", "tracking-wide": "letter-spacing:0.025em",
    "tracking-wider": "letter-spacing:0.05em", "tracking-widest": "letter-spacing:0.1em",
    "list-none": "list-style-type:none", "list-disc": "list-style-type:disc",
    "list-decimal": "list-style-type:decimal",
    "bg-transparent": "background-color:transparent",
    "bg-current": "background-color:currentColor",
    "text-transparent": "color:transparent", "text-current": "color:currentColor",
    "border-transparent": "border-color:transparent", "border-current": "border-color:currentColor",
    "divide-x": "--tw-divide-x-reverse:0;border-right-width:calc(1px * var(--tw-divide-x-reverse));border-left-width:calc(1px * calc(1 - var(--tw-divide-x-reverse)))",
    "divide-y": "--tw-divide-y-reverse:0;border-bottom-width:calc(1px * var(--tw-divide-y-reverse));border-top-width:calc(1px * calc(1 - var(--tw-divide-y-reverse)))",
    "ring-0": "box-shadow:var(--tw-ring-inset) 0 0 0 calc(0px + var(--tw-ring-offset-width)) var(--tw-ring-color)",
    "ring-1": "box-shadow:var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color)",
    "ring-2": "box-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)",
    ring: "box-shadow:var(--tw-ring-inset) 0 0 0 calc(3px + var(--tw-ring-offset-width)) var(--tw-ring-color)",
    // Transform
    "rotate-0": "transform:rotate(0deg)", "rotate-1": "transform:rotate(1deg)",
    "rotate-2": "transform:rotate(2deg)", "rotate-3": "transform:rotate(3deg)",
    "rotate-6": "transform:rotate(6deg)", "rotate-12": "transform:rotate(12deg)",
    "rotate-45": "transform:rotate(45deg)", "rotate-90": "transform:rotate(90deg)",
    "rotate-180": "transform:rotate(180deg)",
    "scale-0": "transform:scale(0)", "scale-50": "transform:scale(.5)",
    "scale-75": "transform:scale(.75)", "scale-90": "transform:scale(.9)",
    "scale-95": "transform:scale(.95)", "scale-100": "transform:scale(1)",
    "scale-105": "transform:scale(1.05)", "scale-110": "transform:scale(1.1)",
    "scale-125": "transform:scale(1.25)", "scale-150": "transform:scale(1.5)",
  };

  if (statics[cls]) return `.${esc(cls)}{${statics[cls]}}`;

  // ── Spacing utilities: p, px, py, pt, pr, pb, pl, m, mx, my, mt, mr, mb, ml, gap ──
  const spacingMap: [RegExp, (v: string) => string][] = [
    [/^p-(.+)$/, v => `padding:${v}`],
    [/^px-(.+)$/, v => `padding-left:${v};padding-right:${v}`],
    [/^py-(.+)$/, v => `padding-top:${v};padding-bottom:${v}`],
    [/^pt-(.+)$/, v => `padding-top:${v}`],
    [/^pr-(.+)$/, v => `padding-right:${v}`],
    [/^pb-(.+)$/, v => `padding-bottom:${v}`],
    [/^pl-(.+)$/, v => `padding-left:${v}`],
    [/^ps-(.+)$/, v => `padding-inline-start:${v}`],
    [/^pe-(.+)$/, v => `padding-inline-end:${v}`],
    [/^m-(.+)$/, v => `margin:${v}`],
    [/^mx-(.+)$/, v => `margin-left:${v};margin-right:${v}`],
    [/^my-(.+)$/, v => `margin-top:${v};margin-bottom:${v}`],
    [/^mt-(.+)$/, v => `margin-top:${v}`],
    [/^mr-(.+)$/, v => `margin-right:${v}`],
    [/^mb-(.+)$/, v => `margin-bottom:${v}`],
    [/^ml-(.+)$/, v => `margin-left:${v}`],
    [/^ms-(.+)$/, v => `margin-inline-start:${v}`],
    [/^me-(.+)$/, v => `margin-inline-end:${v}`],
    [/^gap-(.+)$/, v => `gap:${v}`],
    [/^gap-x-(.+)$/, v => `column-gap:${v}`],
    [/^gap-y-(.+)$/, v => `row-gap:${v}`],
    [/^space-x-(.+)$/, v => `--tw-space-x-reverse:0;margin-right:calc(${v} * var(--tw-space-x-reverse));margin-left:calc(${v} * calc(1 - var(--tw-space-x-reverse)))`],
    [/^space-y-(.+)$/, v => `--tw-space-y-reverse:0;margin-bottom:calc(${v} * var(--tw-space-y-reverse));margin-top:calc(${v} * calc(1 - var(--tw-space-y-reverse)))`],
    [/^top-(.+)$/, v => `top:${v}`],
    [/^right-(.+)$/, v => `right:${v}`],
    [/^bottom-(.+)$/, v => `bottom:${v}`],
    [/^left-(.+)$/, v => `left:${v}`],
    [/^inset-(.+)$/, v => `inset:${v}`],
    [/^inset-x-(.+)$/, v => `left:${v};right:${v}`],
    [/^inset-y-(.+)$/, v => `top:${v};bottom:${v}`],
  ];

  for (const [re, fn] of spacingMap) {
    const m = base.match(re);
    if (m) {
      const key = m[1];
      // mx-auto special case
      if (key === "auto") {
        const css = fn("auto");
        return `.${esc(cls)}{${css}}`;
      }
      const val = arb(key) ?? SPACING[key];
      if (val) {
        const applied = neg ? `-${val}` : val;
        return `.${esc(cls)}{${fn(applied)}}`;
      }
    }
  }

  // ── Width / Height with spacing scale ──
  const sizeMatch = base.match(/^(w|h|min-w|min-h|max-w|max-h)-(.+)$/);
  if (sizeMatch) {
    const prop = { w: "width", h: "height", "min-w": "min-width", "min-h": "min-height", "max-w": "max-width", "max-h": "max-height" }[sizeMatch[1]];
    const key = sizeMatch[2];
    if (prop && !statics[cls]) {
      const val = arb(key) ?? SPACING[key] ?? (key === "1/2" ? "50%" : key === "1/3" ? "33.333333%" : key === "2/3" ? "66.666667%" : key === "1/4" ? "25%" : key === "3/4" ? "75%" : key === "1/5" ? "20%" : key === "2/5" ? "40%" : key === "3/5" ? "60%" : key === "4/5" ? "80%" : null);
      if (val) return `.${esc(cls)}{${prop}:${val}}`;
    }
  }

  // ── Color utilities: bg-*, text-*, border-*, ring-*, from-*, to-*, via-*, placeholder-*, divide-* ──
  const colorPatterns: [RegExp, string][] = [
    [/^bg-((?:white|black|transparent|current|inherit|[\w]+-\d+))$/, "background-color"],
    [/^text-((?:white|black|transparent|current|inherit|[\w]+-\d+))$/, "color"],
    [/^border-((?:white|black|transparent|current|inherit|[\w]+-\d+))$/, "border-color"],
    [/^ring-((?:white|black|transparent|current|inherit|[\w]+-\d+))$/, "--tw-ring-color"],
    [/^placeholder-((?:white|black|[\w]+-\d+))$/, "color"],
    [/^fill-((?:white|black|current|[\w]+-\d+))$/, "fill"],
    [/^stroke-((?:white|black|current|[\w]+-\d+))$/, "stroke"],
    [/^accent-((?:white|black|[\w]+-\d+))$/, "accent-color"],
    [/^caret-((?:white|black|[\w]+-\d+))$/, "caret-color"],
    [/^decoration-((?:white|black|[\w]+-\d+))$/, "text-decoration-color"],
    [/^outline-((?:white|black|[\w]+-\d+))$/, "outline-color"],
    [/^divide-((?:white|black|transparent|[\w]+-\d+))$/, "border-color"],
    [/^from-((?:white|black|transparent|[\w]+-\d+))$/, "--tw-gradient-from"],
    [/^to-((?:white|black|transparent|[\w]+-\d+))$/, "--tw-gradient-to"],
    [/^via-((?:white|black|transparent|[\w]+-\d+))$/, "--tw-gradient-via"],
  ];

  for (const [re, prop] of colorPatterns) {
    const m = cls.match(re);
    if (m) {
      const color = resolveColor(m[1]);
      if (color) {
        if (prop === "--tw-ring-color") {
          return `.${esc(cls)}{${prop}:${color}}`;
        }
        if (prop === "--tw-gradient-from") {
          return `.${esc(cls)}{--tw-gradient-from:${color};--tw-gradient-to:${color}00;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}`;
        }
        if (prop === "--tw-gradient-to") {
          return `.${esc(cls)}{--tw-gradient-to:${color}}`;
        }
        if (prop === "--tw-gradient-via") {
          return `.${esc(cls)}{--tw-gradient-to:${color}00;--tw-gradient-stops:var(--tw-gradient-from),${color},var(--tw-gradient-to)}`;
        }
        // placeholder is a pseudo-element
        if (re.source.startsWith("^placeholder-")) {
          return `.${esc(cls)}::placeholder{color:${color}}`;
        }
        return `.${esc(cls)}{${prop}:${color}}`;
      }
    }
  }

  // ── Background gradient direction ──
  const gradDirs: Record<string, string> = {
    "bg-gradient-to-t": "to top", "bg-gradient-to-tr": "to top right",
    "bg-gradient-to-r": "to right", "bg-gradient-to-br": "to bottom right",
    "bg-gradient-to-b": "to bottom", "bg-gradient-to-bl": "to bottom left",
    "bg-gradient-to-l": "to left", "bg-gradient-to-tl": "to top left",
  };
  if (gradDirs[cls]) {
    return `.${esc(cls)}{background-image:linear-gradient(${gradDirs[cls]},var(--tw-gradient-stops))}`;
  }

  // ── Font size: text-{size} (not a color) ──
  const textSizeMatch = cls.match(/^text-(xs|sm|base|lg|[2-9]?xl)$/);
  if (textSizeMatch) {
    const [fs, lh] = FONT_SIZES[textSizeMatch[1]];
    return `.${esc(cls)}{font-size:${fs};line-height:${lh}}`;
  }

  // ── Font weight ──
  const fontWeightMatch = cls.match(/^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/);
  if (fontWeightMatch) {
    return `.${esc(cls)}{font-weight:${FONT_WEIGHTS[fontWeightMatch[1]]}}`;
  }

  // ── Border radius ──
  if (cls === "rounded") return `.rounded{border-radius:0.25rem}`;
  const roundedMatch = cls.match(/^rounded(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/);
  if (roundedMatch) {
    const val = BORDER_RADIUS[roundedMatch[1] ?? ""];
    if (val) return `.${esc(cls)}{border-radius:${val}}`;
  }
  const roundedSideMatch = cls.match(/^rounded-(t|r|b|l|tl|tr|br|bl)(?:-(none|sm|md|lg|xl|2xl|3xl|full))?$/);
  if (roundedSideMatch) {
    const side = roundedSideMatch[1];
    const val = BORDER_RADIUS[roundedSideMatch[2] ?? ""];
    if (val) {
      const corners: Record<string, string> = {
        t: `border-top-left-radius:${val};border-top-right-radius:${val}`,
        r: `border-top-right-radius:${val};border-bottom-right-radius:${val}`,
        b: `border-bottom-left-radius:${val};border-bottom-right-radius:${val}`,
        l: `border-top-left-radius:${val};border-bottom-left-radius:${val}`,
        tl: `border-top-left-radius:${val}`, tr: `border-top-right-radius:${val}`,
        br: `border-bottom-right-radius:${val}`, bl: `border-bottom-left-radius:${val}`,
      };
      return `.${esc(cls)}{${corners[side]}}`;
    }
  }

  // ── Box shadow ──
  if (cls === "shadow") return `.shadow{box-shadow:${BOX_SHADOWS[""]}}`;
  const shadowMatch = cls.match(/^shadow-(sm|md|lg|xl|2xl|inner|none)$/);
  if (shadowMatch && BOX_SHADOWS[shadowMatch[1]]) {
    return `.${esc(cls)}{box-shadow:${BOX_SHADOWS[shadowMatch[1]]}}`;
  }

  // ── Opacity ──
  const opacityMatch = cls.match(/^opacity-(\d+)$/);
  if (opacityMatch) {
    return `.${esc(cls)}{opacity:${parseInt(opacityMatch[1]) / 100}}`;
  }

  // ── Z-index ──
  const zMatch = cls.match(/^z-(\d+|auto)$/);
  if (zMatch) return `.${esc(cls)}{z-index:${zMatch[1]}}`;

  // ── Grid columns ──
  const gridColMatch = cls.match(/^grid-cols-(\d+)$/);
  if (gridColMatch) return `.${esc(cls)}{grid-template-columns:repeat(${gridColMatch[1]},minmax(0,1fr))}`;
  const colSpanMatch = cls.match(/^col-span-(\d+)$/);
  if (colSpanMatch) return `.${esc(cls)}{grid-column:span ${colSpanMatch[1]} / span ${colSpanMatch[1]}}`;

  // ── Grid rows ──
  const gridRowMatch = cls.match(/^grid-rows-(\d+)$/);
  if (gridRowMatch) return `.${esc(cls)}{grid-template-rows:repeat(${gridRowMatch[1]},minmax(0,1fr))}`;
  const rowSpanMatch = cls.match(/^row-span-(\d+)$/);
  if (rowSpanMatch) return `.${esc(cls)}{grid-row:span ${rowSpanMatch[1]} / span ${rowSpanMatch[1]}}`;

  // ── Leading (line-height) with numeric values ──
  const leadingMatch = cls.match(/^leading-(\d+)$/);
  if (leadingMatch) {
    const val = SPACING[leadingMatch[1]];
    if (val) return `.${esc(cls)}{line-height:${val}}`;
  }

  // ── Arbitrary values: utility-[value] ──
  const arbMatch = cls.match(/^([\w-]+)-(\[.+\])$/);
  if (arbMatch) {
    const [, util, rawVal] = arbMatch;
    const val = arb(rawVal);
    if (!val) return null;

    const arbMap: Record<string, string> = {
      w: "width", h: "height", p: "padding", m: "margin",
      px: "padding-left:VAL;padding-right:VAL", py: "padding-top:VAL;padding-bottom:VAL",
      mx: "margin-left:VAL;margin-right:VAL", my: "margin-top:VAL;margin-bottom:VAL",
      pt: "padding-top", pr: "padding-right", pb: "padding-bottom", pl: "padding-left",
      mt: "margin-top", mr: "margin-right", mb: "margin-bottom", ml: "margin-left",
      gap: "gap", top: "top", right: "right", bottom: "bottom", left: "left",
      inset: "inset", bg: "background-color", text: "color",
      border: "border-color", rounded: "border-radius",
      "min-w": "min-width", "max-w": "max-width", "min-h": "min-height", "max-h": "max-height",
      "text-\\[": "font-size", z: "z-index", opacity: "opacity",
      "tracking": "letter-spacing", "leading": "line-height",
      "basis": "flex-basis",
    };

    const prop = arbMap[util];
    if (prop) {
      if (prop.includes("VAL")) {
        return `.${esc(cls)}{${prop.replace(/VAL/g, val)}}`;
      }
      return `.${esc(cls)}{${prop}:${val}}`;
    }
  }

  // ── bg-opacity, text-opacity (legacy Tailwind v2 patterns still seen) ──
  const bgOpacityMatch = cls.match(/^bg-opacity-(\d+)$/);
  if (bgOpacityMatch) return `.${esc(cls)}{--tw-bg-opacity:${parseInt(bgOpacityMatch[1]) / 100}}`;
  const textOpacityMatch = cls.match(/^text-opacity-(\d+)$/);
  if (textOpacityMatch) return `.${esc(cls)}{--tw-text-opacity:${parseInt(textOpacityMatch[1]) / 100}}`;

  // ── Flex basis ──
  const basisMatch = base.match(/^basis-(.+)$/);
  if (basisMatch) {
    const key = basisMatch[1];
    const val = arb(key) ?? SPACING[key] ?? (key === "full" ? "100%" : key === "auto" ? "auto" : null);
    if (val) return `.${esc(cls)}{flex-basis:${val}}`;
  }

  // ── Order ──
  const orderMatch = cls.match(/^order-(\d+|first|last|none)$/);
  if (orderMatch) {
    const val = orderMatch[1] === "first" ? "-9999" : orderMatch[1] === "last" ? "9999" : orderMatch[1] === "none" ? "0" : orderMatch[1];
    return `.${esc(cls)}{order:${val}}`;
  }

  // ── Line clamp ──
  const lineClampMatch = cls.match(/^line-clamp-(\d+)$/);
  if (lineClampMatch) {
    return `.${esc(cls)}{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${lineClampMatch[1]}}`;
  }

  return null;
}

// ── Extract class names from code ──
function extractClassNames(code: string): Set<string> {
  const classes = new Set<string>();
  // Match className="..." and className={'...'}
  const patterns = [
    /className\s*=\s*"([^"]*)"/g,
    /className\s*=\s*'([^']*)'/g,
    /className\s*=\s*\{[`']([^`']*)[`']\}/g,
    /className\s*=\s*\{`([^`]*)`\}/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code)) !== null) {
      const value = m[1];
      // Handle template literal expressions by splitting on ${ and taking static parts
      const parts = value.split(/\$\{[^}]*\}/);
      for (const part of parts) {
        for (const cls of part.split(/\s+/)) {
          const trimmed = cls.trim();
          if (trimmed) classes.add(trimmed);
        }
      }
    }
  }
  return classes;
}

/**
 * Extracts Tailwind class names from code and generates corresponding CSS.
 * Returns raw CSS string (without <style> tags).
 */
export function extractTailwindCSS(...codeSources: string[]): string {
  const allClasses = new Set<string>();
  for (const code of codeSources) {
    for (const cls of extractClassNames(code)) {
      allClasses.add(cls);
    }
  }

  // CSS variable defaults needed for some utilities (ring, space, divide)
  const rules: string[] = [
    `*,::before,::after{--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgb(59 130 246 / 0.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-space-x-reverse:0;--tw-space-y-reverse:0;--tw-divide-x-reverse:0;--tw-divide-y-reverse:0;--tw-bg-opacity:1;--tw-text-opacity:1;--tw-border-opacity:1;--tw-gradient-from:#0000;--tw-gradient-to:#0000;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}`,
  ];

  // space-x and space-y need child combinator selectors
  const spaceXClasses = new Set<string>();
  const spaceYClasses = new Set<string>();

  for (const cls of allClasses) {
    // Handle space-x and space-y specially (they apply to children)
    if (cls.match(/^-?space-x-/)) { spaceXClasses.add(cls); continue; }
    if (cls.match(/^-?space-y-/)) { spaceYClasses.add(cls); continue; }

    const rule = resolveClass(cls);
    if (rule) rules.push(rule);
  }

  // Generate space-x/space-y child combinator rules
  for (const cls of spaceXClasses) {
    const neg = cls.startsWith("-");
    const m = (neg ? cls.slice(1) : cls).match(/^space-x-(.+)$/);
    if (m) {
      const val = arb(m[1]) ?? SPACING[m[1]];
      if (val) {
        const applied = neg ? `-${val}` : val;
        rules.push(`.${esc(cls)}>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(${applied} * var(--tw-space-x-reverse));margin-left:calc(${applied} * calc(1 - var(--tw-space-x-reverse)))}`);
      }
    }
  }
  for (const cls of spaceYClasses) {
    const neg = cls.startsWith("-");
    const m = (neg ? cls.slice(1) : cls).match(/^space-y-(.+)$/);
    if (m) {
      const val = arb(m[1]) ?? SPACING[m[1]];
      if (val) {
        const applied = neg ? `-${val}` : val;
        rules.push(`.${esc(cls)}>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-bottom:calc(${applied} * var(--tw-space-y-reverse));margin-top:calc(${applied} * calc(1 - var(--tw-space-y-reverse)))}`);
      }
    }
  }

  return rules.join("\n");
}

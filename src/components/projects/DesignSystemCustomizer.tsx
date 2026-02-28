import { useState } from 'react';
import { Palette, Type, Layout, Sparkles, Sun, Moon, ChevronDown, ChevronRight } from 'lucide-react';
import type { DesignSystem } from '@/lib/design-system';
import type { DesignSystemCustomization } from '@/lib/projects';

interface DesignSystemCustomizerProps {
  baseStyleName: string;
  customization?: DesignSystemCustomization;
  designSystem?: DesignSystem | null;
  onChange: (customization: DesignSystemCustomization) => void;
}

// Color group configuration
const COLOR_GROUPS = {
  baseLayout: {
    label: 'Base & Layout',
    colors: [
      { key: 'background', label: 'Background' },
      { key: 'foreground', label: 'Foreground' },
      { key: 'card', label: 'Card' },
      { key: 'cardForeground', label: 'Card Text' },
    ],
  },
  brand: {
    label: 'Brand Colors',
    colors: [
      { key: 'primary', label: 'Primary' },
      { key: 'primaryForeground', label: 'Primary Text' },
      { key: 'secondary', label: 'Secondary' },
      { key: 'secondaryForeground', label: 'Secondary Text' },
    ],
  },
  uiStates: {
    label: 'UI States',
    colors: [
      { key: 'accent', label: 'Accent' },
      { key: 'accentForeground', label: 'Accent Text' },
      { key: 'muted', label: 'Muted' },
      { key: 'mutedForeground', label: 'Muted Text' },
      { key: 'border', label: 'Border' },
      { key: 'destructive', label: 'Destructive' },
    ],
  },
  charts: {
    label: 'Chart Colors',
    colors: [
      { key: 'chart1', label: 'Chart 1' },
      { key: 'chart2', label: 'Chart 2' },
      { key: 'chart3', label: 'Chart 3' },
      { key: 'chart4', label: 'Chart 4' },
      { key: 'chart5', label: 'Chart 5' },
    ],
  },
} as const;

// Font options
const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Poppins',
  'Montserrat',
  'Outfit',
  'DM Sans',
  'Plus Jakarta Sans',
  'Nunito',
  'Lato',
];

// Type for color keys in the theme
type ThemeColorKey = keyof NonNullable<DesignSystemCustomization['colors']>;

export function DesignSystemCustomizer({
  baseStyleName,
  customization = {},
  designSystem,
  onChange,
}: DesignSystemCustomizerProps) {
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    baseLayout: true,
    brand: true,
    uiStates: true,
    charts: false, // Collapsed by default
  });

  // Get the effective value for a color (customization takes precedence over designSystem defaults)
  const getColorValue = (key: ThemeColorKey): string => {
    // Check customization first
    if (customization.colors?.[key]) {
      return customization.colors[key]!;
    }
    // Fall back to AI-generated design system
    if (designSystem?.theme) {
      const theme = designSystem.theme as unknown as Record<string, string>;
      if (theme[key]) {
        return theme[key];
      }
    }
    // Default fallbacks
    const defaults: Record<string, string> = {
      background: '#FFFFFF',
      foreground: '#1A1A1A',
      card: '#FFFFFF',
      cardForeground: '#1A1A1A',
      primary: '#3B82F6',
      primaryForeground: '#FFFFFF',
      secondary: '#6366F1',
      secondaryForeground: '#FFFFFF',
      accent: '#F3F4F6',
      accentForeground: '#1A1A1A',
      muted: '#F3F4F6',
      mutedForeground: '#6B7280',
      border: '#E5E7EB',
      destructive: '#EF4444',
      chart1: '#3B82F6',
      chart2: '#10B981',
      chart3: '#F59E0B',
      chart4: '#EF4444',
      chart5: '#8B5CF6',
    };
    return defaults[key] || '#000000';
  };

  // Get the effective font value
  const getFontValue = (key: 'fontSans' | 'fontHeading'): string => {
    if (key === 'fontSans') {
      return customization.typography?.fontSans ||
             customization.typography?.fontFamily ||
             designSystem?.theme?.fontSans ||
             'Inter';
    }
    return customization.typography?.fontHeading ||
           customization.typography?.headingFont ||
           designSystem?.theme?.fontHeading ||
           'Inter';
  };

  // Get the effective radius value
  const getRadiusValue = (): string => {
    return customization.spacing?.radius ||
           customization.spacing?.borderRadius ||
           designSystem?.theme?.radius ||
           '12px';
  };

  // Get the effective theme mode
  const getThemeMode = (): 'light' | 'dark' => {
    return customization.themeMode || designSystem?.themeMode || 'light';
  };

  // Update a color value
  const updateColor = (key: ThemeColorKey, value: string) => {
    const newColors = { ...customization.colors, [key]: value };
    onChange({ ...customization, colors: newColors });
  };

  // Update typography
  const updateTypography = (key: 'fontSans' | 'fontHeading', value: string) => {
    const newTypography = { ...customization.typography, [key]: value };
    onChange({ ...customization, typography: newTypography });
  };

  // Update spacing
  const updateSpacing = (key: 'radius', value: string) => {
    const newSpacing = { ...customization.spacing, [key]: value };
    onChange({ ...customization, spacing: newSpacing });
  };

  // Update theme mode
  const updateThemeMode = (mode: 'light' | 'dark') => {
    onChange({ ...customization, themeMode: mode });
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Render a collapsible color group
  const renderColorGroup = (groupKey: string, group: typeof COLOR_GROUPS[keyof typeof COLOR_GROUPS]) => {
    const isExpanded = expandedSections[groupKey];

    return (
      <div key={groupKey} className="border border-surface-700/30 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(groupKey)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-surface-800/30 hover:bg-surface-800/50 transition-colors"
        >
          <span className="text-sm font-medium text-surface-200">{group.label}</span>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-surface-400" />
          )}
        </button>
        {isExpanded && (
          <div className="p-3 grid grid-cols-2 gap-3 bg-surface-900/20">
            {group.colors.map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs text-surface-400 mb-1.5 block">
                  {label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={getColorValue(key as ThemeColorKey)}
                    onChange={(e) => updateColor(key as ThemeColorKey, e.target.value)}
                    className="w-10 h-8 p-0.5 cursor-pointer bg-surface-800 border border-surface-700 rounded"
                  />
                  <input
                    type="text"
                    value={getColorValue(key as ThemeColorKey)}
                    onChange={(e) => updateColor(key as ThemeColorKey, e.target.value)}
                    className="flex-1 text-xs font-mono px-2 py-1.5 bg-surface-800 border border-surface-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="#HEXCODE"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Base Style Display */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Base Style</h3>
        <div className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-lg border border-surface-700/30">
          <Sparkles className="w-5 h-5 text-primary-400" />
          <span className="text-sm text-surface-200">{baseStyleName}</span>
        </div>
      </div>

      {/* Theme Mode Toggle */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Theme Mode</h3>
        <div className="flex gap-2">
          <button
            onClick={() => updateThemeMode('light')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
              getThemeMode() === 'light'
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-surface-800 border-surface-700 text-surface-300 hover:bg-surface-700'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span className="text-sm">Light</span>
          </button>
          <button
            onClick={() => updateThemeMode('dark')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
              getThemeMode() === 'dark'
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'bg-surface-800 border-surface-700 text-surface-300 hover:bg-surface-700'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span className="text-sm">Dark</span>
          </button>
        </div>
      </div>

      {/* Colors Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Colors</h3>
        </div>
        <div className="space-y-2">
          {Object.entries(COLOR_GROUPS).map(([key, group]) => renderColorGroup(key, group))}
        </div>
      </div>

      {/* Typography Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Typography</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Body Font</label>
            <select
              value={getFontValue('fontSans')}
              onChange={(e) => updateTypography('fontSans', e.target.value)}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {FONT_OPTIONS.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Heading Font</label>
            <select
              value={getFontValue('fontHeading')}
              onChange={(e) => updateTypography('fontHeading', e.target.value)}
              className="w-full px-3 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {FONT_OPTIONS.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Spacing & Style Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layout className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-white">Spacing & Style</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-surface-400 mb-1.5 block">Border Radius</label>
            <div className="grid grid-cols-5 gap-2">
              {['4px', '8px', '12px', '16px', '24px'].map((value) => (
                <button
                  key={value}
                  onClick={() => updateSpacing('radius', value)}
                  className={`py-2 px-3 text-xs border rounded-lg transition-colors ${
                    getRadiusValue() === value
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-surface-800 border-surface-700 text-surface-300 hover:bg-surface-700'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

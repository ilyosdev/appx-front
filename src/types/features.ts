export interface FeatureDefinition {
  id: string;
  name: string;
  description: string;
  category: 'device' | 'media' | 'ai' | 'payments' | 'social' | 'utilities';
  requiredPackages: string[];
  importStatement: string;
  usageExample: string;
  expoConfigPlugin?: string;
  requiresBuild?: boolean;
  icon: string; // MaterialCommunityIcons name
}

export const FEATURE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'device', label: 'Device' },
  { id: 'media', label: 'Media' },
  { id: 'ai', label: 'AI' },
  { id: 'utilities', label: 'Utilities' },
] as const;

export type FeatureCategoryId = (typeof FEATURE_CATEGORIES)[number]['id'];

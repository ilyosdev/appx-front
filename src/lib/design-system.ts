import { api } from './api';

export interface DesignSystemTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  destructive: string;
  chart1?: string;
  chart2?: string;
  chart3?: string;
  chart4?: string;
  chart5?: string;
  fontSans: string;
  fontHeading: string;
  radius: string;
}

export interface AppMetadata {
  appName: string;
  displayName: string;
  slug: string;
  bundleId: string;
  appIconPrompt: string;
  tagline: string;
}

export interface ColorPalette {
  background: string;
  surface: string;
  card: string;
  cardOverlay: string;
  primary: string;
  secondary: string;
  tertiary: string;
  accent: string;
  accentLight: string;
  gold: string;
  divider: string;
  white: string;
  black: string;
  error: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  tabActive: string;
}

export interface NavigationTab {
  name: string;
  icon: string;
  screenId: string;
  file?: string;
  screenType?: string;
  stackScreens?: string[];
}

export interface NavigationConfig {
  type: 'bottom_tabs' | 'hamburger' | 'top_tabs' | 'none';
  tabs: NavigationTab[];
}

export interface ScreenConfig {
  id: string;
  name: string;
  tabIndex?: number;
  purpose: string;
  layoutDescription: string;
  referenceScreen?: string | null;
  dataModel?: string;
  interactions?: string;
  stateManagement?: string;
}

export interface DesignSystemFile {
  path: string;
  content: string;
}

export interface ApiIntegration {
  baseUrl: string;
  authType: 'bearer' | 'apiKey' | 'none';
  services: string[];
  endpointMapping: Record<string, string[]>;
}

export interface DesignSystem {
  projectName: string;
  themeMode: 'light' | 'dark';
  theme: DesignSystemTheme;
  navigation: NavigationConfig;
  designReasoning: string;
  projectVisualDescription: string;
  screens: ScreenConfig[];
  files?: DesignSystemFile[];
  appMetadata?: AppMetadata;
  colorPalette?: ColorPalette;
  apiIntegration?: ApiIntegration;
}

export const designSystemApi = {
  generate: (projectId: string, userInput: string, deviceType: string = 'mobile', inspirationImageUrl?: string, imageMode?: 'inspire' | 'clone', modelId?: string) =>
    api.post<{ designSystem: DesignSystem; cost: number }>('/ai/design-system', {
      projectId,
      userInput,
      deviceType,
      ...(inspirationImageUrl && { inspirationImageUrl }),
      ...(imageMode && { imageMode }),
      ...(modelId && { modelId }),
    }, { timeout: 120000 }), // 2 min — AI generation can take 40-60s

  refine: (projectId: string, currentDesignSystem: DesignSystem, userMessage: string, modelId?: string) =>
    api.post<{ designSystem: DesignSystem; cost: number }>('/ai/design-system/refine', {
      projectId,
      currentDesignSystem,
      userMessage,
      ...(modelId && { modelId }),
    }, { timeout: 120000 }),

  generateComponents: (projectId: string) =>
    api.post<{ data: { files: DesignSystemFile[] } }>(`/projects/${projectId}/design-system/generate-components`, {}, { timeout: 120000 }),
};

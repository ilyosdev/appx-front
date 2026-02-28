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

export interface NavigationTab {
  name: string;
  icon: string;
  screenId: string;
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

export interface DesignSystem {
  projectName: string;
  themeMode: 'light' | 'dark';
  theme: DesignSystemTheme;
  navigation: NavigationConfig;
  designReasoning: string;
  projectVisualDescription: string;
  screens: ScreenConfig[];
}

export const designSystemApi = {
  generate: (projectId: string, userInput: string, deviceType: string = 'mobile') =>
    api.post<{ designSystem: DesignSystem; cost: number }>('/ai/design-system', {
      projectId,
      userInput,
      deviceType,
    }, { timeout: 120000 }), // 2 min — AI generation can take 40-60s

  refine: (projectId: string, currentDesignSystem: DesignSystem, userMessage: string) =>
    api.post<{ designSystem: DesignSystem; cost: number }>('/ai/design-system/refine', {
      projectId,
      currentDesignSystem,
      userMessage,
    }, { timeout: 120000 }),
};

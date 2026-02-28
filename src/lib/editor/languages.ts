import type { Monaco } from '@monaco-editor/react';

const REACT_NATIVE_TYPES = `
declare module 'react-native' {
  export const View: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const ScrollView: React.ComponentType<any>;
  export const TouchableOpacity: React.ComponentType<any>;
  export const Pressable: React.ComponentType<any>;
  export const Image: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const FlatList: React.ComponentType<any>;
  export const SectionList: React.ComponentType<any>;
  export const SafeAreaView: React.ComponentType<any>;
  export const StatusBar: React.ComponentType<any>;
  export const ActivityIndicator: React.ComponentType<any>;
  export const Switch: React.ComponentType<any>;
  export const Modal: React.ComponentType<any>;
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[]) => void;
  };
  export const Dimensions: {
    get: (dim: 'window' | 'screen') => { width: number; height: number };
  };
  export const Platform: {
    OS: 'ios' | 'android' | 'web';
    select: <T>(options: { ios?: T; android?: T; web?: T; default?: T }) => T;
  };
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    flatten: (style: any) => any;
  };
  export const Animated: any;
  export const Keyboard: any;
  export const Linking: { openURL: (url: string) => Promise<void> };
  export function useWindowDimensions(): { width: number; height: number };
  export function useColorScheme(): 'light' | 'dark' | null;
}

declare module 'expo-router' {
  export const Link: React.ComponentType<any>;
  export const Stack: React.ComponentType<any> & { Screen: React.ComponentType<any> };
  export const Tabs: React.ComponentType<any> & { Screen: React.ComponentType<any> };
  export function useRouter(): { push: (path: string) => void; back: () => void; replace: (path: string) => void };
  export function useLocalSearchParams<T = Record<string, string>>(): T;
  export function useSegments(): string[];
}

declare module 'react-native-paper' {
  export const Provider: React.ComponentType<any>;
  export const Button: React.ComponentType<any>;
  export const Card: React.ComponentType<any> & { Content: React.ComponentType<any>; Title: React.ComponentType<any>; Cover: React.ComponentType<any>; Actions: React.ComponentType<any> };
  export const Text: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const FAB: React.ComponentType<any>;
  export const Chip: React.ComponentType<any>;
  export const Avatar: { Text: React.ComponentType<any>; Image: React.ComponentType<any>; Icon: React.ComponentType<any> };
  export const Appbar: React.ComponentType<any> & { Header: React.ComponentType<any>; Content: React.ComponentType<any>; Action: React.ComponentType<any>; BackAction: React.ComponentType<any> };
  export const List: { Item: React.ComponentType<any>; Section: React.ComponentType<any>; Accordion: React.ComponentType<any>; Icon: React.ComponentType<any> };
  export const Divider: React.ComponentType<any>;
  export const Surface: React.ComponentType<any>;
  export const Searchbar: React.ComponentType<any>;
  export const Badge: React.ComponentType<any>;
  export const ProgressBar: React.ComponentType<any>;
  export const Switch: React.ComponentType<any>;
  export const Dialog: React.ComponentType<any> & { Title: React.ComponentType<any>; Content: React.ComponentType<any>; Actions: React.ComponentType<any> };
  export const Portal: React.ComponentType<any>;
  export const Snackbar: React.ComponentType<any>;
  export const Menu: React.ComponentType<any> & { Item: React.ComponentType<any> };
  export const IconButton: React.ComponentType<any>;
  export const useTheme: () => any;
  export const MD3DarkTheme: any;
  export const MD3LightTheme: any;
}

declare module '@expo/vector-icons' {
  export const MaterialIcons: React.ComponentType<{ name: string; size?: number; color?: string }>;
  export const MaterialCommunityIcons: React.ComponentType<{ name: string; size?: number; color?: string }>;
  export const FontAwesome: React.ComponentType<{ name: string; size?: number; color?: string }>;
  export const FontAwesome5: React.ComponentType<{ name: string; size?: number; color?: string }>;
  export const Ionicons: React.ComponentType<{ name: string; size?: number; color?: string }>;
  export const Feather: React.ComponentType<{ name: string; size?: number; color?: string }>;
}

declare module 'react-native-reanimated' {
  export default class Animated {
    static View: React.ComponentType<any>;
    static Text: React.ComponentType<any>;
    static ScrollView: React.ComponentType<any>;
    static Image: React.ComponentType<any>;
  }
  export function useSharedValue<T>(initialValue: T): { value: T };
  export function useAnimatedStyle(updater: () => any, deps?: any[]): any;
  export function withTiming(toValue: number, config?: any): any;
  export function withSpring(toValue: number, config?: any): any;
  export function withDelay(delay: number, animation: any): any;
  export function withSequence(...animations: any[]): any;
  export function withRepeat(animation: any, count?: number, reverse?: boolean): any;
  export function interpolate(value: number, inputRange: number[], outputRange: number[]): number;
  export function FadeIn: any;
  export function FadeOut: any;
  export function SlideInRight: any;
  export function SlideOutLeft: any;
}

declare module 'expo-linear-gradient' {
  export const LinearGradient: React.ComponentType<{
    colors: string[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    style?: any;
    children?: React.ReactNode;
  }>;
}
`;

const NATIVEWIND_COMPLETIONS = [
  // Layout
  'flex', 'flex-1', 'flex-row', 'flex-col', 'flex-wrap', 'flex-nowrap',
  'items-center', 'items-start', 'items-end', 'items-stretch', 'items-baseline',
  'justify-center', 'justify-start', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly',
  'self-auto', 'self-start', 'self-end', 'self-center', 'self-stretch',
  'grow', 'grow-0', 'shrink', 'shrink-0',
  // Spacing
  'p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8', 'p-10', 'p-12', 'p-16', 'p-20',
  'px-0', 'px-1', 'px-2', 'px-3', 'px-4', 'px-5', 'px-6', 'px-8',
  'py-0', 'py-1', 'py-2', 'py-3', 'py-4', 'py-5', 'py-6', 'py-8',
  'pt-0', 'pt-1', 'pt-2', 'pt-3', 'pt-4', 'pt-5', 'pt-6', 'pt-8',
  'pb-0', 'pb-1', 'pb-2', 'pb-3', 'pb-4', 'pb-5', 'pb-6', 'pb-8',
  'pl-0', 'pl-1', 'pl-2', 'pl-3', 'pl-4', 'pl-5', 'pl-6', 'pl-8',
  'pr-0', 'pr-1', 'pr-2', 'pr-3', 'pr-4', 'pr-5', 'pr-6', 'pr-8',
  'm-0', 'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-8', 'm-auto',
  'mx-0', 'mx-1', 'mx-2', 'mx-3', 'mx-4', 'mx-auto',
  'my-0', 'my-1', 'my-2', 'my-3', 'my-4', 'my-auto',
  'mt-0', 'mt-1', 'mt-2', 'mt-3', 'mt-4', 'mt-auto',
  'mb-0', 'mb-1', 'mb-2', 'mb-3', 'mb-4', 'mb-auto',
  'gap-0', 'gap-1', 'gap-2', 'gap-3', 'gap-4', 'gap-5', 'gap-6', 'gap-8',
  // Size
  'w-full', 'w-auto', 'w-screen', 'w-1/2', 'w-1/3', 'w-2/3', 'w-1/4', 'w-3/4',
  'h-full', 'h-auto', 'h-screen', 'h-1/2',
  'min-h-0', 'min-h-full', 'min-h-screen',
  'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-full',
  // Typography
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
  'font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold',
  'text-left', 'text-center', 'text-right',
  'text-white', 'text-black', 'text-gray-50', 'text-gray-100', 'text-gray-200', 'text-gray-300',
  'text-gray-400', 'text-gray-500', 'text-gray-600', 'text-gray-700', 'text-gray-800', 'text-gray-900',
  'leading-none', 'leading-tight', 'leading-snug', 'leading-normal', 'leading-relaxed', 'leading-loose',
  'tracking-tighter', 'tracking-tight', 'tracking-normal', 'tracking-wide', 'tracking-wider',
  'uppercase', 'lowercase', 'capitalize', 'normal-case',
  // Colors
  'bg-white', 'bg-black', 'bg-transparent',
  'bg-gray-50', 'bg-gray-100', 'bg-gray-200', 'bg-gray-300', 'bg-gray-400',
  'bg-gray-500', 'bg-gray-600', 'bg-gray-700', 'bg-gray-800', 'bg-gray-900', 'bg-gray-950',
  'bg-blue-50', 'bg-blue-100', 'bg-blue-500', 'bg-blue-600', 'bg-blue-700',
  'bg-red-50', 'bg-red-100', 'bg-red-500', 'bg-red-600',
  'bg-green-50', 'bg-green-100', 'bg-green-500', 'bg-green-600',
  'bg-yellow-50', 'bg-yellow-100', 'bg-yellow-500',
  'text-blue-500', 'text-blue-600', 'text-red-500', 'text-red-600',
  'text-green-500', 'text-green-600', 'text-yellow-500',
  // Borders
  'border', 'border-0', 'border-2', 'border-4',
  'border-t', 'border-b', 'border-l', 'border-r',
  'border-gray-200', 'border-gray-300', 'border-gray-700', 'border-gray-800',
  'rounded', 'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  // Effects
  'opacity-0', 'opacity-25', 'opacity-50', 'opacity-75', 'opacity-100',
  'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
  'overflow-hidden', 'overflow-scroll', 'overflow-visible',
  // Position
  'relative', 'absolute',
  'top-0', 'right-0', 'bottom-0', 'left-0',
  'inset-0', 'inset-x-0', 'inset-y-0',
  'z-0', 'z-10', 'z-20', 'z-30', 'z-40', 'z-50',
];

const RN_SNIPPETS = [
  {
    label: 'rnfc',
    insertText: [
      "import React from 'react';",
      "import { View, Text } from 'react-native';",
      '',
      'export default function ${1:ComponentName}() {',
      '  return (',
      '    <View className="flex-1 ${2:bg-white}">',
      '      <Text className="${3:text-lg font-bold}">${4:Hello}</Text>',
      '    </View>',
      '  );',
      '}',
    ].join('\n'),
    documentation: 'React Native functional component with NativeWind',
  },
  {
    label: 'rnscroll',
    insertText: [
      '<ScrollView className="${1:flex-1 bg-white}" contentContainerStyle={{ paddingBottom: ${2:20} }}>',
      '  ${3}',
      '</ScrollView>',
    ].join('\n'),
    documentation: 'ScrollView with NativeWind className',
  },
  {
    label: 'rnflat',
    insertText: [
      '<FlatList',
      '  data={${1:data}}',
      '  keyExtractor={(item) => item.${2:id}}',
      '  renderItem={({ item }) => (',
      '    <View className="${3:p-4 border-b border-gray-200}">',
      '      <Text>${4:item.name}</Text>',
      '    </View>',
      '  )}',
      '  className="${5:flex-1}"',
      '/>',
    ].join('\n'),
    documentation: 'FlatList with NativeWind',
  },
  {
    label: 'rnpress',
    insertText: [
      '<TouchableOpacity',
      '  onPress={() => ${1:}}',
      '  className="${2:bg-blue-500 rounded-lg p-3 items-center}"',
      '>',
      '  <Text className="${3:text-white font-semibold}">${4:Button}</Text>',
      '</TouchableOpacity>',
    ].join('\n'),
    documentation: 'TouchableOpacity button with NativeWind',
  },
  {
    label: 'rninput',
    insertText: [
      '<TextInput',
      '  value={${1:value}}',
      '  onChangeText={${2:setValue}}',
      '  placeholder="${3:Enter text...}"',
      '  className="${4:border border-gray-300 rounded-lg p-3 text-base}"',
      '/>',
    ].join('\n'),
    documentation: 'TextInput with NativeWind',
  },
  {
    label: 'useState',
    insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialValue});',
    documentation: 'React useState hook',
  },
  {
    label: 'useEffect',
    insertText: [
      'useEffect(() => {',
      '  ${1}',
      '  return () => {',
      '    ${2}',
      '  };',
      '}, [${3}]);',
    ].join('\n'),
    documentation: 'React useEffect hook',
  },
];

export function configureMonacoLanguages(monaco: Monaco) {
  // Add React Native type definitions
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    REACT_NATIVE_TYPES,
    'file:///node_modules/@types/react-native-global.d.ts'
  );

  // Configure compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.Latest,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    reactNamespace: 'React',
    allowJs: true,
    typeRoots: ['node_modules/@types'],
    strict: false,
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  });

  // Register NativeWind class name completions for string literals in className
  monaco.languages.registerCompletionItemProvider('typescript', {
    triggerCharacters: ['"', "'", ' ', '-'],
    provideCompletionItems: (model: any, position: any) => {
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.substring(0, position.column - 1);

      // Check if we're inside a className attribute
      const classNameMatch = textBeforeCursor.match(/className\s*=\s*["'][^"']*$/);
      if (!classNameMatch) return { suggestions: [] };

      // Get the partial word being typed
      const wordRange = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordRange.startColumn,
        endColumn: wordRange.endColumn,
      };

      const suggestions = NATIVEWIND_COMPLETIONS.map((cls) => ({
        label: cls,
        kind: monaco.languages.CompletionItemKind.Value,
        insertText: cls,
        range,
        detail: 'NativeWind',
      }));

      return { suggestions };
    },
  });

  // Register RN component snippets
  monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: (model: any, position: any) => {
      const wordRange = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordRange.startColumn,
        endColumn: wordRange.endColumn,
      };

      const suggestions = RN_SNIPPETS.map((snippet) => ({
        label: snippet.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: snippet.insertText,
        insertTextRules:
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: snippet.documentation,
        range,
      }));

      return { suggestions };
    },
  });
}

export function defineAppxTheme(monaco: Monaco) {
  monaco.editor.defineTheme('appx-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '60a5fa' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'type', foreground: '22d3ee' },
      { token: 'tag', foreground: '60a5fa' },
      { token: 'attribute.name', foreground: '22d3ee' },
      { token: 'attribute.value', foreground: '34d399' },
      { token: 'delimiter', foreground: '9ca3af' },
      { token: 'delimiter.bracket', foreground: 'c084fc' },
    ],
    colors: {
      'editor.background': '#0a0a0f',
      'editor.foreground': '#e5e7eb',
      'editor.lineHighlightBackground': '#1f2937',
      'editor.selectionBackground': '#3b82f640',
      'editor.inactiveSelectionBackground': '#3b82f620',
      'editorCursor.foreground': '#3b82f6',
      'editorLineNumber.foreground': '#4b5563',
      'editorLineNumber.activeForeground': '#9ca3af',
      'editorIndentGuide.background': '#1f2937',
      'editorIndentGuide.activeBackground': '#374151',
      'editorBracketMatch.background': '#3b82f630',
      'editorBracketMatch.border': '#3b82f660',
      'editor.findMatchBackground': '#f59e0b40',
      'editor.findMatchHighlightBackground': '#f59e0b20',
      'editorWidget.background': '#111827',
      'editorWidget.border': '#1f2937',
      'editorSuggestWidget.background': '#111827',
      'editorSuggestWidget.border': '#1f2937',
      'editorSuggestWidget.selectedBackground': '#1f2937',
      'editorHoverWidget.background': '#111827',
      'editorHoverWidget.border': '#1f2937',
      'minimap.background': '#0a0a0f',
      'scrollbar.shadow': '#00000000',
      'scrollbarSlider.background': '#374151',
      'scrollbarSlider.hoverBackground': '#4b5563',
      'scrollbarSlider.activeBackground': '#6b7280',
    },
  });
}

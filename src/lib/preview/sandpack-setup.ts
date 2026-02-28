import type { SandpackFiles } from "@codesandbox/sandpack-react";
import { getShimFiles } from "./rn-web-shims";

/**
 * NPM dependencies that Sandpack will resolve from its CDN.
 */
export const SANDPACK_DEPENDENCIES: Record<string, string> = {
  react: "^18.2.0",
  "react-dom": "^18.2.0",
  "react-native-web": "^0.19.12",
  // react-native-paper and @expo/vector-icons are provided via shims
  // in rn-web-shims.ts rather than CDN (avoids context/resolution issues)
};

/**
 * The entry point file that wraps the user's screen component
 * with the necessary providers for react-native-web.
 */
const ENTRY_FILE = `
import { AppRegistry, Platform } from "react-native";
import { PaperProvider, DefaultTheme } from "react-native-paper";
import App from "./App";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#3b82f6",
    accent: "#06b6d4",
  },
};

function Root() {
  return (
    <PaperProvider theme={theme}>
      <App />
    </PaperProvider>
  );
}

AppRegistry.registerComponent("App", () => Root);

if (Platform.OS === "web") {
  const rootTag = document.getElementById("root");
  AppRegistry.runApplication("App", { rootTag });
}
`;

/**
 * Default App.js that shows a placeholder message.
 */
const DEFAULT_APP = `
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Preview will appear here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  text: { fontSize: 16, color: "#888" },
});
`;

/**
 * Custom index.html for the Sandpack preview.
 * Includes viewport meta for mobile sizing and icon font CSS for @expo/vector-icons.
 */
const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Preview</title>
  <link href="https://fonts.googleapis.com/css2?family=Material+Icons&family=Material+Icons+Outlined&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf" rel="stylesheet" />
  <style>
    @font-face { font-family: 'MaterialCommunityIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype'); }
    @font-face { font-family: 'FontAwesome'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype'); }
    @font-face { font-family: 'Ionicons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'); }
    @font-face { font-family: 'Feather'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype'); }
    @font-face { font-family: 'AntDesign'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf') format('truetype'); }
    @font-face { font-family: 'Entypo'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf') format('truetype'); }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    #root { display: flex; }
  </style>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

/**
 * Transforms the user's React Native code into a valid App.js for the Sandpack sandbox.
 * Strips `import "./global.css"` (NativeWind) and ensures a default export exists.
 */
function transformUserCode(code: string): string {
  let transformed = code;

  // Remove NativeWind global.css import (not needed in react-native-web)
  transformed = transformed.replace(
    /import\s+['"]\.\/global\.css['"];?\s*\n?/g,
    "",
  );

  // Remove require('./global.css') variant
  transformed = transformed.replace(
    /require\s*\(\s*['"]\.\/global\.css['"]\s*\)\s*;?\s*\n?/g,
    "",
  );

  // NativeWind className -> react-native-web supports className on web
  // No transformation needed -- react-native-web handles className prop

  // Deduplicate named imports: when the same identifier is imported from
  // react-native AND a more specific module (react-native-paper, expo-image, etc.),
  // remove it from the react-native import to avoid "Identifier already declared" errors.
  transformed = deduplicateNamedImports(transformed);

  // Strip TypeScript-only syntax that Sandpack's Babel can't handle.
  // AI-generated code often includes `as any`, `as Type`, non-null assertions, etc.
  transformed = stripTypeScriptSyntax(transformed);

  return transformed;
}

/**
 * Removes duplicate named imports from 'react-native' when the same
 * identifier is also imported from another module (e.g. Text from
 * react-native-paper, Image from expo-image, Animated from reanimated).
 */
function deduplicateNamedImports(code: string): string {
  // Extract the react-native named import
  const rnImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]react-native['"]/;
  const rnMatch = code.match(rnImportRegex);
  if (!rnMatch) return code;

  const rnNames = rnMatch[1].split(",").map((s) => s.trim()).filter(Boolean);

  // Collect all named identifiers imported from OTHER modules
  const otherIdentifiers = new Set<string>();
  const allImportRegex = /import\s+(?:\w+\s*,\s*)?\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = allImportRegex.exec(code)) !== null) {
    const mod = m[2];
    if (mod === "react-native") continue; // skip react-native itself
    for (const name of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
      const baseName = name.includes(" as ") ? name.split(" as ")[0].trim() : name;
      otherIdentifiers.add(baseName);
    }
  }

  // Also check default imports that shadow RN named exports (e.g. `import Animated from 'react-native-reanimated'`)
  const defaultImportRegex = /import\s+(\w+)\s+from\s*['"](?!react-native['"])[^'"]+['"]/g;
  while ((m = defaultImportRegex.exec(code)) !== null) {
    otherIdentifiers.add(m[1]);
  }

  // Filter out duplicated names from the react-native import
  const filtered = rnNames.filter((name) => {
    const baseName = name.includes(" as ") ? name.split(" as ")[0].trim() : name;
    return !otherIdentifiers.has(baseName);
  });

  if (filtered.length === rnNames.length) return code; // no duplicates found

  if (filtered.length === 0) {
    // All names were duplicated — remove the entire react-native import line
    return code.replace(/import\s*\{[^}]+\}\s*from\s*['"]react-native['"]\s*;?\s*\n?/, "");
  }

  // Replace just the named imports portion
  return code.replace(rnImportRegex, `import { ${filtered.join(", ")} } from 'react-native'`);
}

/**
 * Strips TypeScript-only syntax from AI-generated code so Sandpack's
 * Babel (JS-only) can parse it. Handles:
 *  - Generic type params on calls: `useState<any>(...)` → `useState(...)`
 *  - Type assertions: `expr as any`, `expr as SomeType`
 *  - Non-null assertions: `value!.prop`, `value!`
 *  - Type annotations: `const x: Type = ...`, `(param: Type) =>`
 *  - Interface/type declarations (removed entirely)
 */
function stripTypeScriptSyntax(code: string): string {
  // First pass: remove full-line TS constructs (interfaces, type aliases)
  let result = code.replace(
    /^\s*(?:export\s+)?(?:interface|type)\s+\w+[\s\S]*?^\}/gm,
    "",
  );

  return result
    .split("\n")
    .map((line) => {
      // Don't transform import lines (preserve `import { X as Y }` aliases)
      if (/^\s*import\s/.test(line)) return line;

      // Skip pure type export lines
      if (/^\s*export\s+(?:type|interface)\s/.test(line)) return "";

      let cleaned = line;

      // Remove generic type params on function calls: useState<any>(...) → useState(...)
      // Handles one level of nesting: useRef<ReturnType<typeof setTimeout>>(...)
      cleaned = cleaned.replace(
        /(\w+)<(?:[^<>]|<[^>]*>)*>\s*\(/g,
        "$1(",
      );

      // Remove type assertions: `as any`, `as unknown`, `as const`, `as SomeType`
      cleaned = cleaned.replace(
        /\s+as\s+(?:any|unknown|const|[A-Z]\w*(?:\.\w+)*(?:<[^>]*>)?)/g,
        "",
      );

      // Remove type annotations on const/let/var: `const x: Type =` → `const x =`
      cleaned = cleaned.replace(
        /((?:const|let|var)\s+\w+)\s*:\s*(?:[^=,;)]+?)\s*=/g,
        "$1 =",
      );

      // Remove type annotations in destructuring: `const [a, b]: Type =` → `const [a, b] =`
      cleaned = cleaned.replace(
        /((?:const|let|var)\s+\[[^\]]+\])\s*:\s*(?:[^=]+?)\s*=/g,
        "$1 =",
      );

      // Remove param type annotations: `(param: Type)` → `(param)`, `(param: Type,` → `(param,`
      // Be careful not to match object destructuring like `{ key: value }`
      cleaned = cleaned.replace(
        /(\(\s*\w+)\s*:\s*[^,)=>{]+([,)])/g,
        "$1$2",
      );

      // Remove return type annotations: `): Type =>` → `) =>`, `): Type {` → `) {`
      cleaned = cleaned.replace(
        /\)\s*:\s*[^=>{]+?(=>|\{)/g,
        ") $1",
      );

      // Remove non-null assertions: `value!.prop` -> `value.prop`, `value!)` -> `value)`
      cleaned = cleaned.replace(/(\w)!([.);\],\s}])/g, "$1$2");

      return cleaned;
    })
    .join("\n");
}

/**
 * Builds the complete Sandpack files map for a given screen's React Native code.
 */
export function buildSandpackFiles(
  reactNativeCode: string | null,
): SandpackFiles {
  const userCode = reactNativeCode
    ? transformUserCode(reactNativeCode)
    : DEFAULT_APP;

  const shimFiles = getShimFiles();

  const files: SandpackFiles = {
    "/index.js": { code: ENTRY_FILE, hidden: true },
    "/App.js": { code: userCode, active: true },
    "/public/index.html": { code: INDEX_HTML, hidden: true },
    ...shimFiles,
  };

  return files;
}

/**
 * Returns the Sandpack customSetup object.
 */
export function getSandpackSetup() {
  return {
    dependencies: SANDPACK_DEPENDENCIES,
    entry: "/index.js",
  };
}

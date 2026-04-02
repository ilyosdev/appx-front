/**
 * The entry-point bootstrap code. Wraps the user's screen component
 * with PaperProvider and mounts it via AppRegistry.
 */
export const ENTRY_CODE = `
var _rn = require("react-native");
var _App = require("__app__");

var AppRegistry = _rn.AppRegistry;
var Platform = _rn.Platform;

function Root() {
  var AppComponent = _App.default || _App;
  return React.createElement(AppComponent);
}

AppRegistry.registerComponent("App", function() { return Root; });

if (Platform.OS === "web") {
  var rootTag = document.getElementById("root");
  AppRegistry.runApplication("App", { rootTag: rootTag });
}
`;

/**
 * Multi-screen entry code. Reads window.__PREVIEW_SCREENS__ metadata,
 * loads each screen module, and renders a bottom tab bar for switching.
 */
export const MULTI_SCREEN_ENTRY_CODE = `
var _rn = require("react-native");
var _colors = require("@/constants/colors");

var AppRegistry = _rn.AppRegistry;
var Platform = _rn.Platform;
var View = _rn.View;
var Text = _rn.Text;
var TouchableOpacity = _rn.TouchableOpacity;

var Colors = _colors.default || _colors;

// Screen-name-to-icon alias map for fallback when no explicit icon is provided
var _nameToIconAlias = {
  'home':'Home','index':'Home','dashboard':'LayoutDashboard',
  'search':'Search','explore':'Compass','discover':'Compass',
  'profile':'User','account':'User','user':'User','me':'User',
  'settings':'Settings','preferences':'Settings','config':'Settings',
  'favorites':'Heart','liked':'Heart','wishlist':'Heart',
  'notifications':'Bell','alerts':'Bell',
  'cart':'ShoppingCart','basket':'ShoppingCart','bag':'ShoppingBag',
  'calendar':'Calendar','schedule':'Calendar','events':'CalendarDays',
  'chat':'MessageCircle','messages':'MessageCircle','inbox':'Mail',
  'map':'MapPin','location':'MapPin','places':'MapPin','nearby':'MapPin',
  'camera':'Camera','photos':'Image','gallery':'Image',
  'bookmark':'Bookmark','saved':'Bookmark',
  'music':'Music','audio':'Music','playlist':'ListMusic',
  'wallet':'Wallet','payment':'CreditCard',
  'list':'List','tasks':'ListTodo','todo':'ListTodo',
  'trips':'Plane','travel':'Plane','flights':'Plane',
  'globe':'Globe','world':'Globe','international':'Globe',
  'star':'Star','rating':'Star','reviews':'Star',
  'compass':'Compass','navigation':'Compass',
  'feed':'Rss','timeline':'Clock','history':'History',
  'shop':'Store','store':'Store','marketplace':'Store',
  'orders':'Package','deliveries':'Truck',
  'fitness':'Dumbbell','health':'Activity','workout':'Dumbbell',
  'recipes':'ChefHat','food':'UtensilsCrossed','restaurant':'UtensilsCrossed',
  'news':'Newspaper','articles':'FileText',
  'video':'Play','videos':'Play','watch':'Play',
  'add':'Plus','create':'Plus','new':'Plus',
};

var _lucide = require("lucide-react-native");

function TabIcon(props) {
  var color = props.color || Colors.tabInactive || '#9ca3af';
  var size = 22;
  var iconName = props.iconName;

  // If no explicit icon, try alias from screen name
  if (!iconName) {
    var lower = (props.name || '').toLowerCase().replace(/[^a-z]/g, '');
    iconName = _nameToIconAlias[lower] || null;
  }

  // Try to get the icon component from lucide shim
  var IconComponent = iconName ? (_lucide[iconName] || null) : null;

  if (IconComponent) {
    return React.createElement(IconComponent, { size: size, color: color, strokeWidth: 1.5 });
  }

  // Final fallback: generic circle
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' },
    React.createElement('circle', { cx: 12, cy: 12, r: 6 })
  );
}

function Root() {
  var screens = window.__PREVIEW_SCREENS__ || [];
  var activeTab = React.useState(0);
  var activeIndex = activeTab[0];
  var setActiveIndex = activeTab[1];

  var screenComponents = React.useMemo(function() {
    return screens.map(function(s) {
      var mod = require(s.module);
      return mod.default || mod;
    });
  }, []);

  var ActiveScreen = screenComponents[activeIndex];

  return React.createElement(View, { style: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: Colors.background || '#FAFAF8' } },
    React.createElement(View, { style: { flex: 1, overflow: 'hidden' } },
      ActiveScreen ? React.createElement(ActiveScreen) : null
    ),
    React.createElement(View, {
      style: {
        flexDirection: 'row', height: 60,
        backgroundColor: Colors.tabBar || '#FAFAF8',
        borderTopWidth: 0.5, borderTopColor: Colors.tabBarBorder || '#E8E5E0',
        alignItems: 'center', paddingBottom: 4, flexShrink: 0,
      }
    }, screens.map(function(screen, i) {
      var isActive = i === activeIndex;
      var color = isActive ? (Colors.tabActive || '#0D0D0D') : (Colors.tabInactive || '#C0BFBB');
      return React.createElement(TouchableOpacity, {
        key: i,
        onPress: function() { setActiveIndex(i); },
        style: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 }
      },
        React.createElement(TabIcon, { name: screen.name, iconName: screen.icon, color: color }),
        React.createElement(Text, {
          style: {
            fontSize: 10, marginTop: 2, color: color,
            fontWeight: isActive ? '600' : '400',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
            letterSpacing: 0.5,
          }
        }, screen.name)
      );
    }))
  );
}

AppRegistry.registerComponent("App", function() { return Root; });

if (Platform.OS === "web") {
  var rootTag = document.getElementById("root");
  AppRegistry.runApplication("App", { rootTag: rootTag });
}
`;

/**
 * Default app code shown when no screen code is available.
 */
export const DEFAULT_APP = `
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
 * HTML head content: viewport meta, Tailwind CDN, icon font CSS, skeleton loader.
 */
export const HEAD_HTML = `
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com/3.4.16"><\/script>
  <link href="https://fonts.googleapis.com/css2?family=Material+Icons&family=Material+Icons+Outlined&display=swap" rel="stylesheet" />
  <style>
    @font-face { font-family: 'MaterialCommunityIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype'); }
    @font-face { font-family: 'MaterialIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype'); }
    @font-face { font-family: 'FontAwesome'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/FontAwesome.ttf') format('truetype'); }
    @font-face { font-family: 'Ionicons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype'); }
    @font-face { font-family: 'Feather'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Feather.ttf') format('truetype'); }
    @font-face { font-family: 'AntDesign'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/AntDesign.ttf') format('truetype'); }
    @font-face { font-family: 'Entypo'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Entypo.ttf') format('truetype'); }
    @font-face { font-family: 'EvilIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/EvilIcons.ttf') format('truetype'); }
    @font-face { font-family: 'Octicons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Octicons.ttf') format('truetype'); }
    @font-face { font-family: 'SimpleLineIcons'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/SimpleLineIcons.ttf') format('truetype'); }
    @font-face { font-family: 'Foundation'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Foundation.ttf') format('truetype'); }
    @font-face { font-family: 'Zocial'; src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14.0.0/build/vendor/react-native-vector-icons/Fonts/Zocial.ttf') format('truetype'); }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { width: 100%; height: 100%; overflow: hidden; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
    #root { display: flex; }
    @keyframes __rn_spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes __skeleton_pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }
    span { display: inline; }
    img { display: block; }

    /* RN shim defaults — low specificity so Tailwind utilities override them */
    .__rnView { display:flex; flex-direction:column; align-items:stretch; position:relative; box-sizing:border-box; min-width:0; min-height:0; }
    .__rnScroll { display:flex; flex-direction:column; position:relative; overflow-y:auto; overflow-x:hidden; }
    .__rnScrollH { overflow-x:auto; overflow-y:hidden; flex-direction:row; }
    .__rnTouchable { display:flex; flex-direction:column; cursor:pointer; }
    .__rnPressable { display:flex; flex-direction:column; cursor:pointer; }
    .__rnText { font-size:14px; color:inherit; }
    .__rnInput { outline:none; border:none; font-family:inherit; font-size:inherit; background-color:transparent; color:inherit; padding:0; }

    /* Skeleton loader shown while Babel compiles */
    #__skeleton {
      display: flex; flex-direction: column; width: 100%; height: 100%;
      padding: 16px; gap: 16px; background: #f9fafb;
    }
    #__skeleton .sk-bar {
      background: #e5e7eb; border-radius: 8px;
      animation: __skeleton_pulse 1.5s ease-in-out infinite;
    }
    #__skeleton .sk-header { height: 44px; width: 60%; margin-bottom: 8px; }
    #__skeleton .sk-card { height: 120px; width: 100%; border-radius: 12px; }
    #__skeleton .sk-line { height: 14px; width: 80%; }
    #__skeleton .sk-line-sm { height: 12px; width: 50%; }
  </style>
`;

/**
 * Transforms the user's React Native code for web preview.
 * Strips NativeWind imports, deduplicates imports, strips TS syntax.
 */
export function transformUserCode(code: string): string {
  let transformed = code;

  // Remove NativeWind global.css import (not needed on web)
  transformed = transformed.replace(
    /import\s+['"]\.\/global\.css['"];?\s*\n?/g,
    "",
  );

  // Remove require('./global.css') variant
  transformed = transformed.replace(
    /require\s*\(\s*['"]\.\/global\.css['"]\s*\)\s*;?\s*\n?/g,
    "",
  );

  // Deduplicate named imports: when the same identifier is imported from
  // react-native AND a more specific module (react-native-paper, expo-image, etc.),
  // remove it from the react-native import to avoid "Identifier already declared" errors.
  transformed = deduplicateNamedImports(transformed);

  // TypeScript syntax is now handled by Babel's preset-typescript in preview-runtime.ts.
  // No need to strip TS syntax here.

  // Fix barrel files: only one `export { default }` allowed per module.
  // Convert subsequent `export { default, ... } from '...'` to named re-exports.
  // Matches both `export { default }` and `export { default, Foo }` patterns.
  let seenDefaultReexport = false;
  transformed = transformed
    .split("\n")
    .map((line) => {
      if (/^\s*export\s*\{[^}]*\bdefault\b[^}]*\}\s*from\s/.test(line)) {
        if (seenDefaultReexport) {
          // Convert: export { default, Foo } from './X' → export { default as _X, Foo } from './X'
          const modMatch = line.match(/from\s*['"]([^'"]+)['"]/);
          const modName = modMatch
            ? modMatch[1].replace(/[^a-zA-Z0-9]/g, "_")
            : "mod";
          return line.replace(
            /\bdefault\b(?!\s+as\b)/,
            `default as _barrel_${modName}`,
          );
        }
        seenDefaultReexport = true;
      }
      return line;
    })
    .join("\n");

  return transformed;
}

/**
 * Removes duplicate named imports across ALL modules.
 * When the same identifier is imported from multiple modules,
 * keeps only the LAST import (more specific module wins).
 * Also handles `import X from` default imports.
 */
function deduplicateNamedImports(code: string): string {
  // Collect all named import lines with their identifiers and modules
  const importLineRegex = /^(\s*import\s+(?:\w+\s*,\s*)?\{([^}]+)\}\s*from\s*['"]([^'"]+)['"].*?)$/gm;
  const defaultImportRegex = /^\s*import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/gm;

  // Build a map: identifier → list of modules that import it
  const identifierModules = new Map<string, string[]>();
  let m;

  // Named imports
  const namedImportRegexCopy = new RegExp(importLineRegex.source, importLineRegex.flags);
  while ((m = namedImportRegexCopy.exec(code)) !== null) {
    const names = m[2].split(",").map((s) => s.trim()).filter(Boolean);
    const mod = m[3];
    for (const name of names) {
      // Skip type-only imports (will be stripped later)
      if (name.startsWith("type ")) continue;
      const baseName = name.includes(" as ") ? name.split(" as ").pop()!.trim() : name;
      if (!identifierModules.has(baseName)) identifierModules.set(baseName, []);
      identifierModules.get(baseName)!.push(mod);
    }
  }

  // Default imports
  const defaultRegexCopy = new RegExp(defaultImportRegex.source, defaultImportRegex.flags);
  while ((m = defaultRegexCopy.exec(code)) !== null) {
    const name = m[1];
    const mod = m[2];
    if (!identifierModules.has(name)) identifierModules.set(name, []);
    identifierModules.get(name)!.push(mod);
  }

  // Find identifiers that are imported more than once
  const duplicates = new Map<string, string>();
  for (const [ident, modules] of identifierModules) {
    if (modules.length > 1) {
      // Keep the last one (most specific), mark earlier ones for removal
      for (let i = 0; i < modules.length - 1; i++) {
        duplicates.set(`${ident}@${modules[i]}`, ident);
      }
    }
  }

  if (duplicates.size === 0) return code;

  // Process each named import line, removing duplicate identifiers
  let result = code;
  const importLineRegex2 = /import\s+(?:\w+\s*,\s*)?\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  const replacements: Array<{ original: string; replacement: string }> = [];

  while ((m = importLineRegex2.exec(code)) !== null) {
    const fullMatch = m[0];
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const mod = m[2];

    const filtered = names.filter((name) => {
      if (name.startsWith("type ")) return true; // keep type imports, stripped later
      const baseName = name.includes(" as ") ? name.split(" as ").pop()!.trim() : name;
      return !duplicates.has(`${baseName}@${mod}`);
    });

    if (filtered.length === names.length) continue; // no change

    if (filtered.length === 0) {
      // Check if there's also a default import on this line
      const hasDefault = /import\s+(\w+)\s*,\s*\{/.test(fullMatch);
      if (hasDefault) {
        // Keep just the default: import X, { ... } → import X
        replacements.push({
          original: fullMatch,
          replacement: fullMatch.replace(/\s*,\s*\{[^}]*\}/, ""),
        });
      } else {
        replacements.push({ original: fullMatch, replacement: "" });
      }
    } else {
      replacements.push({
        original: fullMatch,
        replacement: fullMatch.replace(
          /\{[^}]+\}/,
          `{ ${filtered.join(", ")} }`,
        ),
      });
    }
  }

  for (const { original, replacement } of replacements) {
    if (replacement === "") {
      // Remove entire line including trailing semicolon and newline
      result = result.replace(new RegExp(escapeRegex(original) + "\\s*;?\\s*\\n?"), "");
    } else {
      result = result.replace(original, replacement);
    }
  }

  // Phase 2: Remove duplicate default import lines (keep last occurrence)
  // The named-import removal above only handles `import { X } from '...'` syntax.
  // Default imports (`import X from '...'`) are tracked but not removed — fix that here.
  const seenDefaultIdents = new Map<string, string[]>();
  const defaultScanRegex = /^[ \t]*import\s+(\w+)\s+from\s*['"][^'"]+['"].*$/gm;
  let dm;
  while ((dm = defaultScanRegex.exec(result)) !== null) {
    // Skip combined imports: import X, { ... } from ...
    if (/import\s+\w+\s*,\s*\{/.test(dm[0])) continue;
    const ident = dm[1];
    if (!seenDefaultIdents.has(ident)) seenDefaultIdents.set(ident, []);
    seenDefaultIdents.get(ident)!.push(dm[0]);
  }

  for (const [, occurrences] of seenDefaultIdents) {
    if (occurrences.length <= 1) continue;
    // Remove all but the last occurrence (String.replace only removes the first match)
    for (let i = 0; i < occurrences.length - 1; i++) {
      result = result.replace(occurrences[i] + "\n", "");
      if (result.includes(occurrences[i])) {
        result = result.replace(occurrences[i], "");
      }
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strips type annotations from function parameters.
 * Works by tracking brace/paren depth: only strips `ident: Type` or `...ident: Type`
 * when inside parens (not braces), and only when the `:` is immediately after an identifier
 * that's preceded by `(` or `,` at the correct depth (i.e., it's a function param, not
 * an object property like `{ key: value }`).
 */
function stripFunctionParamTypes(line: string): string {
  // Quick check: if line has no `:` there's nothing to strip
  if (!line.includes(':')) return line;

  const out: string[] = [];
  let parenDepth = 0;
  let braceDepth = 0;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (ch === '(') { parenDepth++; out.push(ch); i++; continue; }
    if (ch === ')') { parenDepth--; out.push(ch); i++; continue; }
    if (ch === '{') { braceDepth++; out.push(ch); i++; continue; }
    if (ch === '}') { braceDepth--; out.push(ch); i++; continue; }

    // Only try to strip inside parens and NOT inside braces
    if (parenDepth > 0 && braceDepth === 0) {
      // Check for param pattern: (ident: or , ident: or (... ident: etc.
      // Look back to see if this identifier is preceded by `(`, `,`, or whitespace after those
      const rest = line.substring(i);
      const paramMatch = rest.match(/^(\.\.\.)?(\w+)(\?)?:\s*/);

      if (paramMatch) {
        // Verify it's a param (preceded by `(` or `,` with optional whitespace)
        let lookBack = i - 1;
        while (lookBack >= 0 && (line[lookBack] === ' ' || line[lookBack] === '\t')) lookBack--;
        const prevChar = lookBack >= 0 ? line[lookBack] : '';
        const isParam = prevChar === '(' || prevChar === ',';

        if (isParam) {
          const prefix = paramMatch[1] || '';
          const name = paramMatch[2];
          const colonEnd = i + paramMatch[0].length;

          // Scan past the type annotation using balanced brackets
          let j = colonEnd;
          let a = 0, b = 0, p = 0, k = 0;
          while (j < line.length) {
            const c = line[j];
            if (c === '<') a++;
            else if (c === '>' && a > 0) a--;
            else if (c === '{') b++;
            else if (c === '}' && b > 0) b--;
            else if (c === '(') p++;
            else if (c === ')' && p > 0) p--;
            else if (c === '[') k++;
            else if (c === ']' && k > 0) k--;
            else if (a === 0 && b === 0 && p === 0 && k === 0) {
              if (c === ',' || c === ')') break;
            }
            j++;
          }

          // Emit just the param name
          out.push(prefix + name);
          i = j; // position at `,` or `)` which will be handled next iteration
          continue;
        }
      }
    }

    out.push(ch);
    i++;
  }

  return out.join('');
}

/**
 * Strips TypeScript-only syntax from AI-generated code so Babel can parse it.
 */
export function stripTypeScriptSyntax(code: string): string {
  // --- Balanced bracket helpers ---

  // Find matching '>' for a '<' at openIdx, respecting nesting. Returns -1 if unbalanced.
  function findBalancedAngleClose(str: string, openIdx: number): number {
    let depth = 0;
    for (let i = openIdx; i < str.length; i++) {
      if (str[i] === '<') depth++;
      else if (str[i] === '>') { depth--; if (depth === 0) return i; }
    }
    return -1;
  }

  // Skip a type expression starting at `start` (after ':'). Returns the index of the
  // terminator character ('=' not followed by '>', or ';') at bracket-depth zero.
  // Returns `str.length` when no terminator is found.
  function findTypeEnd(str: string, start: number): number {
    let a = 0, b = 0, p = 0, k = 0; // angle, brace, paren, bracket depths
    for (let i = start; i < str.length; i++) {
      const ch = str[i];
      if (ch === '<') a++;
      else if (ch === '>' && a > 0) a--;
      else if (ch === '{') b++;
      else if (ch === '}' && b > 0) b--;
      else if (ch === '(') p++;
      else if (ch === ')' && p > 0) p--;
      else if (ch === '[') k++;
      else if (ch === ']' && k > 0) k--;
      else if (a === 0 && b === 0 && p === 0 && k === 0) {
        if (ch === '=' && (i + 1 >= str.length || str[i + 1] !== '>')) return i;
        if (ch === ';') return i;
      }
    }
    return str.length;
  }

  // Strip generic type params from function/method calls: ident<...>( → ident(
  // Only strips when <...> is followed by '(' to avoid touching JSX tags.
  function stripGenericCallTypeParams(line: string): string {
    const out: string[] = [];
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '<' && i > 0 && /\w/.test(line[i - 1])) {
        const close = findBalancedAngleClose(line, i);
        if (close !== -1) {
          let next = close + 1;
          while (next < line.length && line[next] === ' ') next++;
          if (next < line.length && line[next] === '(') { i = close; continue; }
        }
      }
      out.push(line[i]);
    }
    return out.join('');
  }

  // Strip type annotation from variable declarations using balanced bracket matching.
  // const x: Complex<A, B<C>> = ...  →  const x = ...
  // let x: Type;                     →  let x;
  function stripVarTypeAnnotation(line: string): string {
    const m = line.match(/((?:const|let|var)\s+(?:\w+|\[[^\]]+\]))\s*:/);
    if (!m) return line;
    const colonIdx = m.index! + m[0].length - 1;
    const endIdx = findTypeEnd(line, colonIdx + 1);
    if (endIdx >= line.length) return line;
    const terminator = line[endIdx];
    if (terminator === '=') return line.substring(0, colonIdx) + ' ' + line.substring(endIdx);
    return line.substring(0, colonIdx) + line.substring(endIdx); // ';'
  }

  // Strip function return type annotation: ): ReturnType { → ) {
  function stripReturnType(line: string): string {
    const m = line.match(/\)\s*:/);
    if (!m) return line;
    const colonIdx = m.index! + m[0].length - 1;
    let a = 0, p = 0;
    for (let i = colonIdx + 1; i < line.length; i++) {
      const ch = line[i];
      if (ch === '<') a++;
      else if (ch === '>' && a > 0) a--;
      else if (ch === '(') p++;
      else if (ch === ')' && p > 0) p--;
      else if (a === 0 && p === 0) {
        if (ch === '{') return line.substring(0, colonIdx) + ' ' + line.substring(i);
        if (ch === '=' && i + 1 < line.length && line[i + 1] === '>') {
          return line.substring(0, colonIdx) + ' ' + line.substring(i);
        }
      }
    }
    return line;
  }

  // --- Phase 1: Remove interface/type declarations (balanced bracket approach) ---
  // Handles nested braces like: interface X { hours: { open: string; close: string }; }
  let result = code;
  {
    const interfaceRe = /^\s*(?:export\s+)?(?:interface|type)\s+\w+/gm;
    let im;
    const removals: Array<[number, number]> = [];
    while ((im = interfaceRe.exec(result)) !== null) {
      // Find the opening brace
      let i = im.index + im[0].length;
      while (i < result.length && result[i] !== '{') {
        if (result[i] === '=' && !/interface/.test(im[0])) break; // type alias, handled below
        i++;
      }
      if (i >= result.length || result[i] !== '{') continue; // not a brace-delimited declaration
      // Find the balanced closing brace (skip strings, comments, template literals)
      let depth = 0;
      let j = i;
      while (j < result.length) {
        const ch = result[j];
        // Skip single-line comments
        if (ch === '/' && j + 1 < result.length && result[j + 1] === '/') {
          while (j < result.length && result[j] !== '\n') j++;
          continue;
        }
        // Skip block comments
        if (ch === '/' && j + 1 < result.length && result[j + 1] === '*') {
          j += 2;
          while (j < result.length && !(result[j] === '*' && j + 1 < result.length && result[j + 1] === '/')) j++;
          j += 2;
          continue;
        }
        // Skip string literals (single/double quotes)
        if (ch === '"' || ch === "'") {
          const quote = ch;
          j++;
          while (j < result.length && result[j] !== quote) {
            if (result[j] === '\\') j++; // skip escaped char
            j++;
          }
          j++;
          continue;
        }
        // Skip template literals
        if (ch === '`') {
          j++;
          while (j < result.length && result[j] !== '`') {
            if (result[j] === '\\') { j += 2; continue; }
            if (result[j] === '$' && j + 1 < result.length && result[j + 1] === '{') {
              // Template expression — count nested braces
              j += 2;
              let tDepth = 1;
              while (j < result.length && tDepth > 0) {
                if (result[j] === '{') tDepth++;
                else if (result[j] === '}') tDepth--;
                if (tDepth > 0) j++;
              }
            }
            j++;
          }
          j++;
          continue;
        }
        // Count braces
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) break; }
        j++;
      }
      if (depth === 0) {
        // Remove from start of match to closing brace (+ optional semicolon and newline)
        let end = j + 1;
        while (end < result.length && (result[end] === ';' || result[end] === '\n' || result[end] === '\r')) end++;
        removals.push([im.index, end]);
      }
    }
    // Apply removals in reverse order to preserve indices
    for (let ri = removals.length - 1; ri >= 0; ri--) {
      result = result.substring(0, removals[ri][0]) + result.substring(removals[ri][1]);
    }
  }

  // Remove single-line type aliases: type Foo = string | number;
  result = result.replace(
    /^\s*(?:export\s+)?type\s+\w+\s*(?:<[^>]*>)?\s*=\s*[^;{]+;\s*$/gm,
    "",
  );

  // --- Phase 1.5: Strip multi-line generic type params on function calls ---
  // Handles patterns like: ident<\n  Type1,\n  Type2\n>( → ident(
  // Must run before line-by-line processing since individual lines would be fragments.
  result = result.replace(
    /(\w)\s*<\s*\n([\s\S]*?)>\s*\(/g,
    (match, before, inner) => {
      // Verify this looks like type params (not JSX): inner should have type-like content
      // and the overall pattern should have balanced brackets
      let depth = 1;
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === '<') depth++;
        else if (inner[i] === '>') {
          depth--;
          if (depth === 0) return match; // unbalanced — leave alone
        }
      }
      // depth should be 1 here (the closing > is outside `inner`)
      if (depth !== 1) return match;
      return before + '(';
    },
  );

  // Also strip multi-line ): ReturnType\n{ patterns
  result = result.replace(
    /\)\s*:\s*\n([\s\S]*?)(=>|\{)/g,
    (match, inner, terminator) => {
      // Only strip if inner doesn't contain balanced issues
      let a = 0;
      for (let i = 0; i < inner.length; i++) {
        if (inner[i] === '<') a++;
        else if (inner[i] === '>') a--;
      }
      if (a !== 0) return match;
      return ') ' + terminator;
    },
  );

  // Strip inline ): { ... } => patterns (object return types)
  result = result.replace(
    /\)\s*:\s*\{[^}]*\}\s*(=>)/g,
    ') $1',
  );

  // Strip inline ): TypeName => patterns
  result = result.replace(
    /\)\s*:\s*[A-Za-z]\w*(?:\.\w+)*(?:<[^>]*>)?(?:\[\])?\s*(=>)/g,
    ') $1',
  );

  // --- Phase 2: Line-by-line processing ---
  const lines = result.split('\n');
  const out: string[] = [];
  // Track delimiter nesting to distinguish function params from object properties.
  // Top of stack '(' means inside function params; '{' means inside object/block.
  const contextStack: string[] = [];

  for (let line of lines) {
    // Determine context from delimiter stack (state from previous lines)
    const inFunctionParams = contextStack.length > 0 && contextStack[contextStack.length - 1] === '(';

    // Remove entire `import type ...` lines
    if (/^\s*import\s+type\s+/.test(line)) { out.push(''); continue; }

    // Strip inline `type` specifiers: import { type X, Y } → import { Y }
    if (/^\s*import\s/.test(line) && /\btype\s+\w/.test(line)) {
      line = line.replace(/,?\s*\btype\s+\w+(?:\s+as\s+\w+)?/g, '');
      line = line.replace(/\{\s*,/, '{');
      line = line.replace(/,\s*,/g, ',');
      if (/\{\s*\}/.test(line)) { out.push(''); continue; }
      out.push(line); continue;
    }

    // Pass through other import lines untouched
    if (/^\s*import\s/.test(line)) { out.push(line); continue; }

    // Remove export type/interface single-line declarations
    if (/^\s*export\s+(?:type|interface)\s/.test(line)) { out.push(''); continue; }

    // Remove leftover `extends` clauses from interface removal
    if (/^\s*extends\s+\w/.test(line)) { out.push(''); continue; }

    let cleaned = line;

    // 1. Strip generic type params from calls: ident<T>( → ident(
    cleaned = stripGenericCallTypeParams(cleaned);

    // 2. Strip `as` type assertions (typeof, keyof, literals, primitives, named types)
    // Also handles union types: `as string | null`, `as keyof typeof X | undefined`
    {
      const typeAtom = '(?:keyof\\s+typeof\\s+\\w+(?:\\.\\w+)*|keyof\\s+\\w+(?:\\.\\w+)*|typeof\\s+\\w+(?:\\.\\w+)*(?:\\[[^\\]]*\\])*|\'[^\']*\'|"[^"]*"|const|any|unknown|never|string|number|boolean|undefined|null|void|[A-Z]\\w*(?:\\.\\w+)*(?:<[^>]*>)?(?:\\[\\])*)';
      const asPattern = new RegExp(
        '\\s+as\\s+' + typeAtom + '(?:\\s*\\|\\s*' + typeAtom + ')*',
        'g',
      );
      cleaned = cleaned.replace(asPattern, '');
    }

    // 2b. Strip `satisfies Type` expressions
    {
      const satAtom = '(?:keyof\\s+typeof\\s+\\w+(?:\\.\\w+)*|typeof\\s+\\w+(?:\\.\\w+)*|any|unknown|never|string|number|boolean|undefined|null|void|Record<[^>]*>|Partial<[^>]*>|Required<[^>]*>|Readonly<[^>]*>|Pick<[^>]*>|Omit<[^>]*>|[A-Z]\\w*(?:\\.\\w+)*(?:<[^>]*>)?(?:\\[\\])*)';
      const satPattern = new RegExp(
        '\\s+satisfies\\s+' + satAtom + '(?:\\s*\\|\\s*' + satAtom + ')*',
        'g',
      );
      cleaned = cleaned.replace(satPattern, '');
    }

    // 3. Strip variable declaration type annotations (balanced brackets)
    cleaned = stripVarTypeAnnotation(cleaned);

    // 4. Strip destructured param type annotations
    cleaned = cleaned.replace(/(\})\s*:\s*\{[^}]*\}\s*(\))/g, '$1$2');
    cleaned = cleaned.replace(/(\})\s*:\s*(?:keyof\s+typeof\s+\w+(?:\.\w+)*|keyof\s+\w+(?:\.\w+)*|[A-Z]\w*(?:\.\w+)*(?:<[^>]*>)?)\s*([,)=])/g, '$1 $2');
    cleaned = cleaned.replace(/(\])\s*:\s*(?:keyof\s+typeof\s+\w+(?:\.\w+)*|keyof\s+\w+(?:\.\w+)*|[A-Z]\w*(?:\.\w+)*(?:<[^>]*>)?)\s*([,)])/g, '$1$2');

    // 5. Strip function parameter type annotations inside parentheses.
    // We must avoid matching object property `key: value` patterns.
    // Strategy: find `(` then strip `param: Type` only within paren groups.
    cleaned = stripFunctionParamTypes(cleaned);

    // 5b. Strip standalone param type annotations on their own line (multi-line params).
    // Pattern: `  variant: ButtonVariant,` or `  disabled: boolean,` outside of objects.
    // These appear when function params span multiple lines.
    // ONLY apply when inside a function parameter list (delimiter stack top is '('),
    // NOT inside an object literal (top is '{') — otherwise lines like
    // `backgroundColor: Colors.background,` would be incorrectly stripped.
    if (inFunctionParams) {
      cleaned = cleaned.replace(
        /^(\s*)(\.\.\.)?(\w+)(\?)?\s*:\s*(?:keyof\s+typeof\s+\w+(?:\.\w+)*|keyof\s+\w+(?:\.\w+)*|(?:typeof\s+)?[A-Za-z]\w*(?:\.\w+)*(?:<[^>]*>)?(?:\[\])?)(?:\s*\|\s*(?:typeof\s+)?[A-Za-z]\w*(?:\.\w+)*(?:<[^>]*>)?(?:\[\])?)*\s*(,?\s*)$/,
        '$1$2$3$5',
      );
    }

    // 6. Strip function return type annotations (balanced brackets)
    cleaned = stripReturnType(cleaned);

    // 7. Strip non-null assertions: expr!. → expr.
    cleaned = cleaned.replace(/(\w)!([.);\],\s}])/g, '$1$2');

    out.push(cleaned);

    // Update delimiter stack from the ORIGINAL line for next iteration's context.
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci];
      // Skip characters inside string literals (single/double quotes)
      if (ch === "'" || ch === '"') {
        const quote = ch;
        ci++;
        while (ci < line.length && line[ci] !== quote) {
          if (line[ci] === '\\') ci++; // skip escaped char
          ci++;
        }
        continue;
      }
      // Skip template literal strings — backticks can contain ${} expressions
      // which would corrupt the delimiter stack if not handled
      if (ch === '`') {
        ci++;
        while (ci < line.length && line[ci] !== '`') {
          if (line[ci] === '\\') { ci++; ci++; continue; } // skip escaped char
          if (line[ci] === '$' && ci + 1 < line.length && line[ci + 1] === '{') {
            // Template expression: skip balanced braces within it
            ci += 2; // skip ${
            let tmplDepth = 1;
            while (ci < line.length && tmplDepth > 0) {
              if (line[ci] === '{') tmplDepth++;
              else if (line[ci] === '}') tmplDepth--;
              if (tmplDepth > 0) ci++;
            }
            // ci is now at the closing } of the template expression
          }
          ci++;
        }
        continue;
      }
      // Skip single-line comments
      if (ch === '/' && ci + 1 < line.length) {
        if (line[ci + 1] === '/') break; // rest of line is comment
        if (line[ci + 1] === '*') {
          ci += 2;
          while (ci < line.length - 1 && !(line[ci] === '*' && line[ci + 1] === '/')) ci++;
          ci++; // skip past */
          continue;
        }
      }
      if (ch === '(' || ch === '{') {
        contextStack.push(ch);
      } else if (ch === ')' && contextStack.length > 0 && contextStack[contextStack.length - 1] === '(') {
        contextStack.pop();
      } else if (ch === '}' && contextStack.length > 0 && contextStack[contextStack.length - 1] === '{') {
        contextStack.pop();
      }
    }
  }

  const finalResult = out.join('\n');

  // Safety fallback: if TS stripping introduced a bare `return` at column 0
  // that wasn't in the original code, the stripping corrupted something — fall back.
  const bareReturnRe = /^return\s/m;
  if (bareReturnRe.test(finalResult) && !bareReturnRe.test(code)) {
    console.warn('[Preview] TS stripping may have corrupted code, falling back to original');
    return code;
  }

  return finalResult;
}

import { getShimModuleEntries } from "./rn-web-shims";
import {
  HEAD_HTML,
  ENTRY_CODE,
  MULTI_SCREEN_ENTRY_CODE,
  DEFAULT_APP,
  transformUserCode,
} from "./code-transform";
import { extractTailwindCSS } from "./tailwind-extract";

export interface PreviewScreen {
  name: string;
  code: string;
  icon?: string;
  /** When screen comes from a project file, this is the file path (e.g. "app/(tabs)/index.tsx") */
  filePath?: string;
}

/**
 * Builds a complete self-contained HTML document for the preview iframe.
 * Uses Babel Standalone for in-browser JSX transpilation and a custom
 * module system — no external bundler or CodeSandbox dependency.
 *
 * When `screens` is provided with 2+ entries, renders a bottom tab bar
 * that switches between screens.
 *
 * When `files` is provided, each file is registered as a module so that
 * cross-file relative imports (e.g. `../../components/Card`) resolve correctly.
 */
export function buildPreviewHTML(
  reactNativeCode: string | null,
  screens?: PreviewScreen[],
  files?: Record<string, string>,
): string {
  const useMultiScreen = screens && screens.length > 1;

  // Single-screen mode
  const userCode = reactNativeCode
    ? transformUserCode(reactNativeCode)
    : DEFAULT_APP;

  const shimEntries = getShimModuleEntries();

  // Safely embed a string in a <script> tag: JSON.stringify + escape </script>
  const safeEmbed = (s: string) =>
    JSON.stringify(s).replace(/<\//g, "<\\/");

  // Build the module registry initialization code.
  const shimRegistrations = shimEntries
    .map((entry) => {
      return `__registerModule(${safeEmbed(entry.moduleName)}, ${safeEmbed(entry.code)});`;
    })
    .join("\n");

  // Filter out non-compilable files before registration
  const compilableExtRegex = /\.(tsx?|jsx?)$/;
  const configFileRegex =
    /^(tailwind|metro|babel|postcss|app)\.config\.(ts|js|mjs)$/;

  const filteredFileEntries = files
    ? Object.entries(files).filter(([fp]) => {
        if (!compilableExtRegex.test(fp)) return false;
        const fileName = fp.split("/").pop() || "";
        if (configFileRegex.test(fileName)) return false;
        return true;
      })
    : [];
  const registeredFilePaths = new Set(filteredFileEntries.map(([fp]) => fp));

  // Register additional project files as modules for cross-file imports
  let fileRegistrations = "";
  if (filteredFileEntries.length > 0) {
    fileRegistrations = filteredFileEntries
      .map(([filePath, fileCode]) => {
        const transformed = transformUserCode(fileCode);
        // Register under multiple keys: full path, without extension, and normalized variants
        const basePath = filePath.replace(/\.(tsx?|jsx?)$/, "");
        const escaped = safeEmbed(transformed);
        // Build all path variants this file should be findable under
        const pathVariants = new Set([filePath, basePath]);
        // With leading slash
        if (!filePath.startsWith("/")) {
          pathVariants.add("/" + filePath);
          pathVariants.add("/" + basePath);
        }
        // Without leading slash
        const noSlash = filePath.replace(/^\//, "");
        const noSlashBase = basePath.replace(/^\//, "");
        pathVariants.add(noSlash);
        pathVariants.add(noSlashBase);
        // @/ alias variants (strip "app/" or "src/" prefix)
        for (const prefix of ["app/", "src/"]) {
          if (noSlash.startsWith(prefix)) {
            const stripped = noSlash.substring(prefix.length);
            const strippedBase = noSlashBase.substring(prefix.length);
            pathVariants.add(stripped);
            pathVariants.add(strippedBase);
          }
        }
        const regLines = Array.from(pathVariants)
          .map((p) => `      __modules[${JSON.stringify(p)}] = __fileFactory;`)
          .join("\n");
        const stubRegLines = Array.from(pathVariants)
          .map((p) => `      __modules[${JSON.stringify(p)}] = __fileFactory;`)
          .join("\n");
        return `
    // Register project file: ${filePath}
    try {
      var __fileSource = ${escaped};
      var __fileResult = Babel.transform(__fileSource, {
        presets: ["react", ["typescript", { isTSX: true, allExtensions: true }]],
        plugins: [["transform-modules-commonjs", { strict: false, lazy: false }]],
        filename: ${JSON.stringify(filePath)},
      });
      var __fileFactory;
      try {
        __fileFactory = new Function("module", "exports", "require", __fileResult.code);
      } catch (syntaxErr) {
        console.warn("[Preview] SyntaxError in compiled file: ${filePath}", syntaxErr);
        __fileFactory = function(mod) { mod.exports = __createStubModule(${JSON.stringify(filePath)}); };
      }
${regLines}
    } catch (e) {
      console.warn("[Preview] Failed to compile file: ${filePath}", e);
      // Register a stub module so imports don't fail with "Module not found"
      var __fileFactory = function(mod) { mod.exports = __createStubModule(${JSON.stringify(filePath)}); };
${stubRegLines}
    }`;
      })
      .join("\n");
  }

  // For multi-screen: register each screen as a separate module
  let screenRegistrations = "";
  let screenMeta = "[]";
  if (useMultiScreen) {
    const metaEntries: string[] = [];
    screenRegistrations = screens
      .map((screen, i) => {
        // If screen references a project file already registered, skip compilation
        if (screen.filePath && registeredFilePaths.has(screen.filePath)) {
          metaEntries.push(
            JSON.stringify({
              name: screen.name,
              module: screen.filePath,
              icon: screen.icon || null,
            }),
          );
          return `// Screen "${screen.name}" → file module: ${screen.filePath}`;
        }

        // Old-style: compile screen code inline
        const transformed = transformUserCode(screen.code);
        const moduleName = `__screen_${i}__`;
        metaEntries.push(
          JSON.stringify({
            name: screen.name,
            module: moduleName,
            icon: screen.icon || null,
          }),
        );
        return `
    // Register screen: ${screen.name}
    try {
      var __screenSource_${i} = ${safeEmbed(transformed)};
      var __screenResult_${i} = Babel.transform(__screenSource_${i}, {
        presets: ["react", ["typescript", { isTSX: true, allExtensions: true }]],
        plugins: [["transform-modules-commonjs", { strict: false, lazy: false }]],
        filename: "${screen.name}.tsx",
      });
      var __screenFactory_${i} = new Function("module", "exports", "require", __screenResult_${i}.code);
      __modules["${moduleName}"] = __screenFactory_${i};
    } catch (e) {
      console.error("[Preview] Failed to compile screen: ${screen.name}", e);
      __modules["${moduleName}"] = function(mod) {
        mod.exports = { default: function() { return React.createElement("div", {style:{padding:20}}, "Error loading ${screen.name}"); } };
      };
    }`;
      })
      .join("\n");
    screenMeta = `[${metaEntries.join(",")}]`;
  }

  const entryCode = useMultiScreen ? MULTI_SCREEN_ENTRY_CODE : ENTRY_CODE;

  // Extract Tailwind CSS from all code sources as fallback for CDN JIT
  const codeSources: string[] = [];
  if (reactNativeCode) codeSources.push(reactNativeCode);
  if (screens) {
    for (const s of screens) {
      if (s.code) codeSources.push(s.code);
    }
  }
  if (files) {
    for (const f of Object.values(files)) {
      codeSources.push(f);
    }
  }
  const extractedCSS = codeSources.length > 0 ? extractTailwindCSS(...codeSources) : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
${HEAD_HTML}
${extractedCSS ? `<style id="__tw_extracted">${extractedCSS}</style>` : ""}
</head>
<body>
  <div id="root">
    <!-- Skeleton loader shown while scripts load -->
    <div id="__skeleton">
      <div class="sk-bar sk-header"></div>
      <div class="sk-bar sk-card"></div>
      <div class="sk-bar sk-line"></div>
      <div class="sk-bar sk-line-sm"></div>
      <div class="sk-bar sk-card" style="height:80px"></div>
      <div class="sk-bar sk-line"></div>
      <div class="sk-bar sk-line-sm" style="width:35%"></div>
    </div>
  </div>

  <!-- React UMD globals -->
  <script src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"><\/script>

  <!-- Babel Standalone with IndexedDB caching -->
  <script>
  // Cache Babel in IndexedDB to avoid re-downloading 2MB on every preview
  (function() {
    var BABEL_URL = "https://unpkg.com/@babel/standalone@7.26.9/babel.min.js";
    var DB_NAME = "__preview_cache";
    var STORE = "scripts";
    var KEY = "babel_7_26_9";

    function loadFromNetwork() {
      var s = document.createElement("script");
      s.src = BABEL_URL;
      s.onload = function() { cacheScript(); window.__babelReady && window.__babelReady(); };
      s.onerror = function() {
        window.parent.postMessage({ type: "__preview_error__", message: "Failed to load Babel from CDN" }, "*");
      };
      document.head.appendChild(s);
    }

    function cacheScript() {
      if (!window.indexedDB) return;
      try {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", BABEL_URL, true);
        xhr.responseType = "text";
        xhr.onload = function() {
          if (xhr.status !== 200) return;
          try {
            var req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function(e) { e.target.result.createObjectStore(STORE); };
            req.onsuccess = function(e) {
              var db = e.target.result;
              var tx = db.transaction(STORE, "readwrite");
              tx.objectStore(STORE).put(xhr.responseText, KEY);
            };
          } catch(e) {}
        };
        xhr.send();
      } catch(e) {}
    }

    function loadFromCache() {
      if (!window.indexedDB) { loadFromNetwork(); return; }
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function(e) { e.target.result.createObjectStore(STORE); };
        req.onsuccess = function(e) {
          var db = e.target.result;
          var tx = db.transaction(STORE, "readonly");
          var getReq = tx.objectStore(STORE).get(KEY);
          getReq.onsuccess = function(ev) {
            if (ev.target.result) {
              // Execute cached Babel inline
              try {
                var s = document.createElement("script");
                s.textContent = ev.target.result;
                document.head.appendChild(s);
                // Verify Babel actually loaded (cache could be corrupt)
                if (typeof Babel === "undefined") {
                  console.warn("[Preview] Cached Babel is corrupt, reloading from network");
                  loadFromNetwork();
                  return;
                }
                window.__babelReady && window.__babelReady();
              } catch(ex) { loadFromNetwork(); }
            } else {
              loadFromNetwork();
            }
          };
          getReq.onerror = function() { loadFromNetwork(); };
        };
        req.onerror = function() { loadFromNetwork(); };
      } catch(e) { loadFromNetwork(); }
    }

    // Try cache first, fallback to network
    loadFromCache();
  })();
  <\/script>

  <script>
  // Early error handler to catch script parse failures
  window.onerror = function(msg, src, line, col) {
    window.parent.postMessage({ type: "__preview_error__", message: "[Parse] " + msg + " (line " + line + ", col " + col + ")" }, "*");
  };
  <\/script>

  <script>
  // ── Module System ──
  var __modules = {};
  var __moduleCache = {};

  // Resolve a relative path against a base directory
  function __resolvePath(from, request) {
    if (request[0] !== ".") return request;
    // Get directory of the requiring module
    var lastSlash = from.lastIndexOf("/");
    var dir = lastSlash >= 0 ? from.substring(0, lastSlash) : "";
    var parts = dir.split("/").filter(Boolean);
    var segments = request.split("/");
    for (var i = 0; i < segments.length; i++) {
      if (segments[i] === "..") parts.pop();
      else if (segments[i] !== ".") parts.push(segments[i]);
    }
    return "/" + parts.join("/");
  }

  // Try to find a module under various name variants
  function __findModule(name) {
    if (__modules[name]) return name;
    // Try with common extensions
    var exts = [".tsx", ".ts", ".jsx", ".js"];
    for (var i = 0; i < exts.length; i++) {
      if (__modules[name + exts[i]]) return name + exts[i];
    }
    // Try as directory with index file
    for (var i = 0; i < exts.length; i++) {
      if (__modules[name + "/index" + exts[i]]) return name + "/index" + exts[i];
    }
    // Try with app/ or src/ prefix (AI generates imports like "@/constants/colors"
    // which resolve to "constants/colors" but files are stored as "app/constants/colors.ts")
    var prefixes = ["app/", "src/"];
    var stripped = name.replace(/^\\//, "");
    for (var pi = 0; pi < prefixes.length; pi++) {
      var prefixed = prefixes[pi] + stripped;
      if (__modules[prefixed]) return prefixed;
      for (var i = 0; i < exts.length; i++) {
        if (__modules[prefixed + exts[i]]) return prefixed + exts[i];
      }
      for (var i = 0; i < exts.length; i++) {
        if (__modules[prefixed + "/index" + exts[i]]) return prefixed + "/index" + exts[i];
      }
    }
    // Try stripping app/ or src/ prefix (file stored without prefix but imported with it)
    for (var pi = 0; pi < prefixes.length; pi++) {
      if (stripped.indexOf(prefixes[pi]) === 0) {
        var unprefixed = stripped.substring(prefixes[pi].length);
        if (__modules[unprefixed]) return unprefixed;
        for (var i = 0; i < exts.length; i++) {
          if (__modules[unprefixed + exts[i]]) return unprefixed + exts[i];
        }
      }
    }
    // Skip Expo Router convention files (+not-found, +html, _layout) — these are
    // framework files that don't exist in web preview
    if (/\\/\\+[^/]+$/.test(name) || /\\/_layout$/.test(name)) return null;
    return null;
  }

  function __require(name) {
    return __requireFrom(".", name);
  }

  function __requireFrom(fromPath, name) {
    // Resolve @/ path alias (maps to project root)
    if (name.indexOf("@/") === 0) name = name.substring(2);
    // Resolve relative paths
    var resolved = name[0] === "." ? __resolvePath(fromPath, name) : name;
    // Normalize: strip leading slash so "/src/mocks/data" matches "src/mocks/data"
    var normalizedResolved = resolved.replace(/^\\//, "");

    if (__moduleCache[resolved]) return __moduleCache[resolved];
    if (__moduleCache[normalizedResolved]) return __moduleCache[normalizedResolved];
    // Try exact match or with extensions (try both with and without leading slash)
    var found = __findModule(resolved) || __findModule(normalizedResolved);
    if (found) {
      if (__moduleCache[found]) return __moduleCache[found];
      var mod = { exports: {} };
      try {
        __modules[found](mod, mod.exports, function(req) { return __requireFrom(found, req); });
      } catch (e) {
        console.warn("[Preview] Runtime error in module: " + found, e);
        mod.exports = __createStubModule(found);
      }
      __moduleCache[found] = mod.exports;
      __moduleCache[resolved] = mod.exports;
      return mod.exports;
    }
    // Fallback: try original name directly
    if (__modules[name]) {
      if (__moduleCache[name]) return __moduleCache[name];
      var mod = { exports: {} };
      try {
        __modules[name](mod, mod.exports, function(req) { return __requireFrom(name, req); });
      } catch (e) {
        console.warn("[Preview] Runtime error in module: " + name, e);
        mod.exports = __createStubModule(name);
      }
      __moduleCache[name] = mod.exports;
      return mod.exports;
    }
    if (name === "react") return window.React;
    if (name === "react-dom") return window.ReactDOM;
    if (name === "react-dom/client") {
      return { createRoot: window.ReactDOM.createRoot.bind(window.ReactDOM) };
    }
    // Silently stub Expo Router convention files — these are framework artifacts
    // that don't exist in web preview (e.g. +not-found, +html, _layout)
    if (/\\/[+_][^/]*$/.test(resolved) || /\\/[+_][^/]*$/.test(name)) {
      var _stub = __createStubModule(name);
      __moduleCache[resolved || name] = _stub;
      return _stub;
    }
    console.warn("[Preview] Module not found: " + name + " (from: " + fromPath + ")");
    // Return a safe Proxy that won't crash on property access.
    // For data/mock modules: returns arrays/objects with placeholder values.
    // For component modules: returns a passthrough React component.
    var _stub = __createStubModule(name);
    __moduleCache[resolved || name] = _stub;
    return _stub;
  }

  // Create a stub module for missing imports so the preview doesn't crash
  function __createStubModule(name) {
    // Universal deep-proxy: any property access returns another proxy that
    // behaves as an empty array, empty string, empty function, AND a no-op
    // React component.  This handles patterns like:
    //   data.trips.map(...)        → [].map(...) → []
    //   data.user.name             → ""
    //   <TimelineItem foo="bar" /> → null (React component)
    //   colors.primary             → ""
    var _stubCache = {};
    function makeDeep(label) {
      if (_stubCache[label]) return _stubCache[label];
      var arr = [];
      // Make it callable as a React component (returns null)
      var fn = function(props) { return props && props.children ? props.children : null; };
      fn.displayName = "Stub(" + (label || "?") + ")";
      // Attach array methods so .map/.filter/etc work
      var arrayMethods = ["map","filter","forEach","reduce","find","some","every","flatMap","slice","concat","indexOf","includes","join","keys","values","entries","flat","fill","copyWithin","reverse","sort","splice"];
      for (var i = 0; i < arrayMethods.length; i++) {
        fn[arrayMethods[i]] = arr[arrayMethods[i]] ? arr[arrayMethods[i]].bind(arr) : function(){return [];};
      }
      fn.length = 0;
      fn[Symbol.iterator] = arr[Symbol.iterator].bind(arr);
      fn.toString = function() { return ""; };
      fn.valueOf = function() { return 0; };
      var p = new Proxy(fn, {
        get: function(_target, prop) {
          if (prop === "__esModule") return true;
          if (prop === "$$typeof" || prop === "type" || prop === "ref" || prop === "key" || prop === "_owner" || prop === "_store") return undefined;
          if (prop === "default") return p;
          if (prop === Symbol.iterator) return arr[Symbol.iterator].bind(arr);
          if (prop === Symbol.toPrimitive) return function(hint) { return hint === "number" ? 0 : ""; };
          if (prop === "length") return 0;
          if (prop === "displayName") return fn.displayName;
          if (prop === "toString") return fn.toString;
          if (prop === "valueOf") return fn.valueOf;
          // Array methods
          if (typeof prop === "string" && arr[prop] && typeof arr[prop] === "function") return arr[prop].bind(arr);
          if (typeof prop === "string" && !isNaN(Number(prop))) return undefined;
          if (typeof prop === "symbol") return undefined;
          // Recursively return another deep proxy for chained access
          return makeDeep(label + "." + String(prop));
        },
        apply: function(_target, _this, args) {
          // When called as hook (useTheme(), useAppTheme(), etc.) return a
          // theme-like object so .colors / .fonts access works.
          if (label.match(/theme/i)) {
            return { colors: makeDeep(label + ".().colors"), fonts: makeDeep(label + ".().fonts"), dark: false, roundness: 4 };
          }
          // When called as React component
          return args && args[0] && args[0].children ? args[0].children : null;
        },
        has: function() { return true; },
        // Make { ...stub } work: return deep proxies for all spread properties
        ownKeys: function(_target) {
          return Reflect.ownKeys(_target).filter(function(k) {
            return k !== "length" && k !== "name" && typeof k !== "symbol";
          });
        },
        getOwnPropertyDescriptor: function(_target, prop) {
          // For own properties of the fn target, return descriptors that
          // resolve to deep proxies so spread preserves chainable behavior
          var desc = Object.getOwnPropertyDescriptor(_target, prop);
          if (desc) return desc;
          // For any other property, report as non-existent (not own)
          return undefined;
        },
      });
      _stubCache[label] = p;
      return p;
    }
    var stub = makeDeep(name.split("/").pop() || name);
    return stub;
  }

  function __registerModule(name, source) {
    try {
      var result = Babel.transform(source, {
        presets: ["react", ["typescript", { isTSX: true, allExtensions: true }]],
        plugins: [["transform-modules-commonjs", { strict: false, lazy: false }]],
        filename: name + ".tsx",
      });
      var factory = new Function("module", "exports", "require", result.code);
      __modules[name] = factory;
    } catch (e) {
      console.error("[Preview] Failed to register module: " + name, e);
      __modules[name] = function(mod) { mod.exports = {}; };
    }
  }

  if (!window.React || !window.ReactDOM) {
    window.parent.postMessage({
      type: "__preview_error__",
      message: "React failed to load from CDN. Check network connection.",
    }, "*");
  }
  __moduleCache["react"] = window.React || {};
  __moduleCache["react-dom"] = window.ReactDOM || {};
  __moduleCache["react-dom/client"] = {
    createRoot: window.ReactDOM && window.ReactDOM.createRoot
      ? window.ReactDOM.createRoot.bind(window.ReactDOM)
      : function() { return { render: function() {} }; },
  };

  // ── Resilient createElement: replace undefined types with safe passthrough ──
  var _origCE = React.createElement;
  React.createElement = function(type) {
    if (type === undefined || type === null) {
      // Replace undefined/null component with a safe passthrough that renders children
      arguments[0] = function _Fallback(p) { return p && p.children ? p.children : null; };
    }
    return _origCE.apply(React, arguments);
  };

  // ── Console Interception ──
  (function() {
    var origLog = console.log;
    var origWarn = console.warn;
    var origError = console.error;
    function send(level, args) {
      try {
        var msg = Array.prototype.map.call(args, function(a) {
          if (typeof a === "string") return a;
          try { return JSON.stringify(a); } catch(e) { return String(a); }
        }).join(" ");
        // Filter out noisy React/Babel internals
        if (msg.indexOf("[Preview]") === 0 && level !== "error") return;
        window.parent.postMessage({ type: "__preview_console__", level: level, message: msg }, "*");
      } catch(e) {}
    }
    console.log = function() { send("log", arguments); return origLog.apply(console, arguments); };
    console.warn = function() { send("warn", arguments); return origWarn.apply(console, arguments); };
    console.error = function() { send("error", arguments); return origError.apply(console, arguments); };
  })();

  // ── Error Reporting to Parent ──
  window.onerror = function(msg, source, line, col, err) {
    var stack = err && err.stack ? err.stack : "";
    window.parent.postMessage({
      type: "__preview_error__",
      message: String(msg),
      source: source,
      line: line,
      column: col,
      stack: stack,
    }, "*");
  };
  window.onunhandledrejection = function(e) {
    var stack = e.reason && e.reason.stack ? e.reason.stack : "";
    window.parent.postMessage({
      type: "__preview_error__",
      message: "Unhandled rejection: " + String(e.reason),
      stack: stack,
    }, "*");
  };

  // ── Wait for Babel, then transpile and run ──
  function __initApp() {
  try {
    // ── Register Shim Modules (after Babel is ready) ──
    ${shimRegistrations}

    // ── Register Project Files ──
    ${fileRegistrations}

    ${
      useMultiScreen
        ? `// ── Register Screen Modules ──
    ${screenRegistrations}

    // Screen metadata for tab bar
    window.__PREVIEW_SCREENS__ = ${screenMeta};
    `
        : `// ── Single Screen Mode ──
    var __userSource = ${safeEmbed(userCode)};
    var __userResult = Babel.transform(__userSource, {
      presets: ["react", ["typescript", { isTSX: true, allExtensions: true }]],
      plugins: [["transform-modules-commonjs", { strict: false, lazy: false }]],
      filename: "App.tsx",
    });
    try {
      var __appFactory = new Function("module", "exports", "require", __userResult.code);
    } catch (syntaxErr) {
      console.error("[Preview] SyntaxError in App code:", syntaxErr);
      var __appFactory = function(mod) { mod.exports = { default: function() { return React.createElement("div", {style:{padding:20,color:"red"}}, "Syntax error in generated code: " + syntaxErr.message); } }; };
    }
    __modules["__app__"] = __appFactory;
    `
    }

    // Run entry code (mounts the app)
    var __entrySource = ${safeEmbed(entryCode)};
    var __entryFactory = new Function("React", "require", __entrySource);
    __entryFactory(window.React, __require);

    // Remove skeleton
    var sk = document.getElementById("__skeleton");
    if (sk) sk.remove();

    window.parent.postMessage({ type: "__preview_loaded__" }, "*");

    // Force Tailwind CDN to re-scan DOM after React render
    // Trigger a DOM mutation so MutationObserver re-processes all elements
    setTimeout(function() {
      var root = document.getElementById("root");
      if (root) {
        root.setAttribute("data-tw", "1");
        root.removeAttribute("data-tw");
      }
    }, 100);
  } catch (e) {
    console.error("[Preview] Runtime error:", e);
    var sk2 = document.getElementById("__skeleton");
    if (sk2) sk2.remove();
    window.parent.postMessage({
      type: "__preview_error__",
      message: e.message || String(e),
    }, "*");
  }
  } // end __initApp

  // If Babel is already loaded (from cache), run immediately; otherwise wait
  if (typeof Babel !== "undefined") {
    __initApp();
  } else {
    window.__babelReady = __initApp;
  }
  <\/script>
</body>
</html>`;
}

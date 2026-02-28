/**
 * HTML utility functions for canvas rendering
 */

/**
 * Strips height-expanding Tailwind classes from HTML for design mode auto-height.
 * This is more reliable than CSS overrides since it eliminates classes at source.
 */
function neutralizeHeightClassesInHtml(html: string): string {
  // IMPORTANT: Replace min-h-* BEFORE h-* to avoid partial matches
  // (e.g., \bh-screen\b matches within min-h-screen because - is a word boundary)
  return html
    // Min-height classes first (to prevent partial matches)
    .replace(/\bmin-h-screen\b/g, 'min-h-0')
    .replace(/\bmin-h-dvh\b/g, 'min-h-0')
    .replace(/\bmin-h-svh\b/g, 'min-h-0')
    .replace(/\bmin-h-lvh\b/g, 'min-h-0')
    .replace(/\bmin-h-full\b/g, 'min-h-0')
    .replace(/\bmin-h-\[100vh\]/g, 'min-h-0')
    .replace(/\bmin-h-\[100dvh\]/g, 'min-h-0')
    .replace(/\bmin-h-\[100svh\]/g, 'min-h-0')
    .replace(/\bmin-h-\[100%\]/g, 'min-h-0')
    // Height classes (after min-h to avoid partial match issues)
    .replace(/\bh-screen\b/g, 'h-auto')
    .replace(/\bh-dvh\b/g, 'h-auto')
    .replace(/\bh-svh\b/g, 'h-auto')
    .replace(/\bh-lvh\b/g, 'h-auto')
    .replace(/\bh-full\b/g, 'h-auto')
    .replace(/\bh-\[100vh\]/g, 'h-auto')
    .replace(/\bh-\[100dvh\]/g, 'h-auto')
    .replace(/\bh-\[100svh\]/g, 'h-auto')
    .replace(/\bh-\[100%\]/g, 'h-auto')
    // Flex growth classes (expand to fill)
    .replace(/\bflex-1\b/g, 'flex-none')
    .replace(/\bflex-grow\b(?!-)/g, 'flex-grow-0')
    .replace(/\bgrow\b(?!-)/g, 'grow-0');
}

/**
 * Creates a script that reports the document height to the parent window
 * Used for design mode auto-height feature
 */
function createHeightReportScript(screenId: string): string {
  return `
    <script>
      (function() {
        var screenId = "${screenId}";
        var lastHeight = 0;

        function reportHeight() {
          // Measure #root if available (esbuild), fall back to body (legacy HTML)
          var root = document.getElementById('root') || document.body;
          var height = root.scrollHeight;
          height = Math.ceil(height) + 16;

          if (height !== lastHeight && height > 0) {
            lastHeight = height;
            window.parent.postMessage({
              type: 'screenHeight',
              screenId: screenId,
              height: height
            }, '*');
          }
        }

        function waitForTailwind(callback) {
          if (window.tailwind) {
            setTimeout(callback, 100);
          } else {
            setTimeout(function() { waitForTailwind(callback); }, 50);
          }
        }

        function startReporting() {
          waitForTailwind(function() {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(reportHeight);
            } else {
              reportHeight();
            }
          });
        }

        if (document.readyState === 'complete') {
          startReporting();
        } else {
          window.addEventListener('load', startReporting);
        }

        if (typeof ResizeObserver !== 'undefined') {
          var target = document.getElementById('root') || document.body;
          var observer = new ResizeObserver(function() {
            reportHeight();
          });
          observer.observe(target);
        }

        var checks = 0;
        var checkInterval = setInterval(function() {
          reportHeight();
          checks++;
          if (checks > 25) clearInterval(checkInterval);
        }, 200);
      })();
    </script>
  `;
}

/**
 * Ensures HTML content has required scripts (Tailwind, Iconify) and prevents navigation.
 * Optionally injects height-reporting script for design mode auto-height.
 */
export function ensureHtmlStyles(
  html: string,
  options?: { screenId?: string; reportHeight?: boolean }
): string {
  if (!html) return html;

  // Preprocess HTML to strip height-expanding classes in design mode
  // This is more reliable than CSS overrides since it eliminates classes at source
  const processedHtml = options?.reportHeight
    ? neutralizeHeightClassesInHtml(html)
    : html;

  // Simplified styles - scrollbar hiding and basic html/body reset
  const hideScrollbarStyles = `
    <style>
      * { scrollbar-width: none; -ms-overflow-style: none; }
      *::-webkit-scrollbar { display: none; }
      html, body { height: auto !important; min-height: 0 !important; }
      #root { height: auto !important; min-height: 0 !important; }
    </style>
  `;

  const cdnScripts = `
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>
    ${hideScrollbarStyles}
  `;

  // Script to intercept navigation and communicate with parent canvas
  const preventNavScript = `
    <script>
      document.addEventListener('click', function(e) {
        var target = e.target.closest('a, button, [onclick]');
        if (!target) return;

        var isNavClick = !!target.closest('nav');

        if (target.tagName === 'A') {
          e.preventDefault();
          e.stopPropagation();
          var href = target.getAttribute('href') || '';
          if (href && href !== '#' && !href.startsWith('http')) {
            var targetPath = href.replace(/^\\//, '').replace(/\\/.*$/, '');
            window.parent.postMessage({
              type: 'navigateToScreen',
              targetPath: targetPath,
              targetLabel: target.textContent ? target.textContent.trim() : ''
            }, '*');
          }
          return;
        }

        if (isNavClick && (target.tagName === 'BUTTON' || target.closest('button'))) {
          e.preventDefault();
          e.stopPropagation();
          var btn = target.tagName === 'BUTTON' ? target : target.closest('button');
          var label = btn.textContent ? btn.textContent.trim() : '';
          if (label) {
            window.parent.postMessage({
              type: 'navigateToScreen',
              targetPath: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              targetLabel: label
            }, '*');
          }
          return;
        }

        if (target.tagName === 'A' || target.tagName === 'BUTTON') {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
      document.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
      }, true);
    </script>
  `;

  // Height reporting script for design mode auto-height
  const heightScript =
    options?.reportHeight && options?.screenId
      ? createHeightReportScript(options.screenId)
      : "";

  if (processedHtml.includes("cdn.tailwindcss.com")) {
    let result = processedHtml;
    if (!processedHtml.includes("iconify-icon")) {
      result = result.replace(
        "</head>",
        `<script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"></script>${hideScrollbarStyles}</head>`,
      );
    } else {
      // Still need to inject the scrollbar/height styles
      result = result.replace("</head>", `${hideScrollbarStyles}</head>`);
    }
    return result.replace("</body>", `${preventNavScript}${heightScript}</body>`);
  }

  if (processedHtml.includes("</head>")) {
    return processedHtml
      .replace("</head>", `${cdnScripts}</head>`)
      .replace("</body>", `${preventNavScript}${heightScript}</body>`);
  }

  return `<!DOCTYPE html><html><head>${cdnScripts}</head><body>${processedHtml}${preventNavScript}${heightScript}</body></html>`;
}

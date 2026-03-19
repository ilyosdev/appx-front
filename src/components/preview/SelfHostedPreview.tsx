import { useEffect, useRef, useState } from "react";
import { buildPreviewHTML, type PreviewScreen } from "@/lib/preview/preview-runtime";

interface SelfHostedPreviewProps {
  code: string | null;
  screens?: PreviewScreen[];
  files?: Record<string, string>;
  onError?: (msg: string) => void;
  onLoad?: () => void;
}

export function SelfHostedPreview({ code, screens, files, onError, onLoad }: SelfHostedPreviewProps) {
  const [html, setHtml] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Build HTML, debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setHtml(buildPreviewHTML(code, screens, files));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [code, screens, files]);

  // Listen for messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__preview_error__") {
        onError?.(e.data.message || "Unknown preview error");
      }
      if (e.data.type === "__preview_loaded__") {
        onLoad?.();
      }
      // Forward console messages as "console" type for PreviewConsole
      if (e.data.type === "__preview_console__") {
        window.dispatchEvent(new MessageEvent("message", {
          data: { type: "console", level: e.data.level, message: e.data.message },
        }));
        // Route console errors to the auto-fix pipeline
        if (e.data.level === "error") {
          onError?.(e.data.message || "Unknown console error");
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onError, onLoad]);

  if (!html) return null;

  return (
    <iframe
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      style={{ width: "100%", height: "100%", border: "none" }}
      title="App Preview"
    />
  );
}

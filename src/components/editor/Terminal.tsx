import { useRef, useEffect } from 'react';
import { X, Trash2, ChevronDown } from 'lucide-react';
import { useEditorStore, type TerminalLine } from '@/stores/editorStore';

function getLineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'stderr':
      return 'text-red-400';
    case 'success':
      return 'text-green-400';
    case 'info':
      return 'text-blue-400';
    default:
      return 'text-surface-300';
  }
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function Terminal() {
  const lines = useEditorStore((s) => s.terminalLines);
  const clearTerminal = useEditorStore((s) => s.clearTerminal);
  const toggleBottomPanel = useEditorStore((s) => s.toggleBottomPanel);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-surface-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
            Terminal
          </span>
          {lines.length > 0 && (
            <span className="text-xs text-surface-600">
              {lines.length} lines
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearTerminal}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
            title="Clear terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
            title="Minimize panel"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 font-mono text-xs"
      >
        {lines.length === 0 ? (
          <span className="text-surface-600">No output yet.</span>
        ) : (
          lines.map((line) => (
            <div key={line.id} className="flex gap-2 py-0.5 leading-relaxed">
              <span className="text-surface-600 shrink-0 select-none">
                {formatTimestamp(line.timestamp)}
              </span>
              <span className={getLineColor(line.type)}>{line.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

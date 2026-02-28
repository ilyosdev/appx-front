import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FileCode, FileJson, FileType } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/stores/editorStore';

interface QuickOpenProps {
  files: Array<{ path: string; content: string | null }>;
  onSelectFile: (path: string) => void;
}

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'js':
    case 'jsx':
      return FileCode;
    case 'json':
      return FileJson;
    default:
      return FileType;
  }
}

function getFileIconColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
      return 'text-blue-400';
    case 'json':
      return 'text-yellow-400';
    case 'css':
    case 'scss':
      return 'text-pink-400';
    case 'js':
    case 'jsx':
      return 'text-yellow-300';
    default:
      return 'text-gray-400';
  }
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

function fuzzyMatch(query: string, text: string): { matches: boolean; score: number } {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  if (q.length === 0) return { matches: true, score: 0 };

  // Exact substring match gets highest score
  if (t.includes(q)) {
    return { matches: true, score: 100 - t.indexOf(q) };
  }

  // Fuzzy character matching
  let qi = 0;
  let score = 0;
  let lastMatchIdx = -1;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      // Consecutive matches bonus
      if (lastMatchIdx === ti - 1) score += 5;
      // Start of word bonus
      if (ti === 0 || t[ti - 1] === '/' || t[ti - 1] === '.' || t[ti - 1] === '-') score += 3;
      lastMatchIdx = ti;
      qi++;
    }
  }

  return { matches: qi === q.length, score };
}

export function QuickOpen({ files, onSelectFile }: QuickOpenProps) {
  const showQuickOpen = useEditorStore((s) => s.showQuickOpen);
  const setShowQuickOpen = useEditorStore((s) => s.setShowQuickOpen);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showQuickOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [showQuickOpen]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowQuickOpen(!showQuickOpen);
      }
      if (e.key === 'Escape' && showQuickOpen) {
        setShowQuickOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuickOpen, setShowQuickOpen]);

  const filtered = useMemo(() => {
    if (!query) {
      return files
        .filter((f) => f.path && !f.path.endsWith('/'))
        .slice(0, 50)
        .map((f) => ({ path: f.path, score: 0 }));
    }

    return files
      .filter((f) => f.path && !f.path.endsWith('/'))
      .map((f) => {
        const result = fuzzyMatch(query, f.path);
        return { path: f.path, ...result };
      })
      .filter((f) => f.matches)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
  }, [query, files]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectFile(filtered[selectedIndex].path);
          setShowQuickOpen(false);
        }
      }
    },
    [filtered, selectedIndex, onSelectFile, setShowQuickOpen]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!showQuickOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setShowQuickOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg">
        <div className="bg-surface-900 border border-surface-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center border-b border-surface-700">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a file name to open..."
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-surface-500 outline-none"
            />
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[300px] overflow-y-auto"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-surface-500 text-center">
                No matching files
              </div>
            ) : (
              filtered.map((item, idx) => {
                const name = getFileName(item.path);
                const Icon = getFileIcon(name);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      onSelectFile(item.path);
                      setShowQuickOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2 text-left text-sm',
                      idx === selectedIndex
                        ? 'bg-primary-500/20 text-white'
                        : 'text-surface-300 hover:bg-surface-800'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0',
                        getFileIconColor(name)
                      )}
                    />
                    <span className="truncate">{name}</span>
                    <span className="ml-auto text-xs text-surface-600 truncate max-w-[200px]">
                      {item.path}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

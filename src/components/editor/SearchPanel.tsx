import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Replace,
  ChevronRight,
  ChevronDown,
  FileCode,
  CaseSensitive,
  Regex,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditorStore, type SearchResultGroup } from '@/stores/editorStore';

interface SearchPanelProps {
  files: Array<{ path: string; content: string | null }>;
  onNavigateToResult: (filePath: string, line: number, column: number) => void;
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function SearchPanel({ files, onNavigateToResult }: SearchPanelProps) {
  const searchQuery = useEditorStore((s) => s.searchQuery);
  const setSearchQuery = useEditorStore((s) => s.setSearchQuery);
  const searchRegex = useEditorStore((s) => s.searchRegex);
  const setSearchRegex = useEditorStore((s) => s.setSearchRegex);
  const searchCaseSensitive = useEditorStore((s) => s.searchCaseSensitive);
  const setSearchCaseSensitive = useEditorStore((s) => s.setSearchCaseSensitive);
  const searchResults = useEditorStore((s) => s.searchResults);
  const setSearchResults = useEditorStore((s) => s.setSearchResults);
  const replaceQuery = useEditorStore((s) => s.replaceQuery);
  const setReplaceQuery = useEditorStore((s) => s.setReplaceQuery);
  const updateFileContent = useEditorStore((s) => s.updateFileContent);
  const openFiles = useEditorStore((s) => s.openFiles);

  const [showReplace, setShowReplace] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus search input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform search when query/options change
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    const results: SearchResultGroup[] = [];
    const flags = searchCaseSensitive ? 'g' : 'gi';

    for (const file of files) {
      if (!file.content) continue;
      const lines = file.content.split('\n');
      const matches: SearchResultGroup['matches'] = [];

      for (let i = 0; i < lines.length; i++) {
        let regex: RegExp;
        try {
          regex = searchRegex
            ? new RegExp(searchQuery, flags)
            : new RegExp(escapeRegExp(searchQuery), flags);
        } catch {
          setSearchResults([]);
          return;
        }

        let match: RegExpExecArray | null;
        while ((match = regex.exec(lines[i])) !== null) {
          matches.push({
            filePath: file.path,
            line: i + 1,
            column: match.index + 1,
            lineContent: lines[i],
            matchLength: match[0].length,
          });
          if (!regex.global) break;
        }
      }

      if (matches.length > 0) {
        results.push({ filePath: file.path, matches });
      }
    }

    setSearchResults(results);
    // Auto-expand all groups
    setExpandedGroups(new Set(results.map((r) => r.filePath)));
  }, [searchQuery, searchRegex, searchCaseSensitive, files, setSearchResults]);

  const toggleGroup = useCallback((path: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleReplaceAll = useCallback(() => {
    if (!searchQuery) return;

    for (const group of searchResults) {
      const file = openFiles.get(group.filePath);
      if (!file) continue;

      const flags = searchCaseSensitive ? 'g' : 'gi';
      let regex: RegExp;
      try {
        regex = searchRegex
          ? new RegExp(searchQuery, flags)
          : new RegExp(escapeRegExp(searchQuery), flags);
      } catch {
        return;
      }

      const newContent = file.content.replace(regex, replaceQuery);
      updateFileContent(group.filePath, newContent);
    }
  }, [searchQuery, searchRegex, searchCaseSensitive, replaceQuery, searchResults, openFiles, updateFileContent]);

  const totalMatches = searchResults.reduce(
    (sum, g) => sum + g.matches.length,
    0
  );

  return (
    <div className="h-full flex flex-col">
      {/* Search header */}
      <div className="px-3 py-2 border-b border-surface-700">
        <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
          Search
        </span>
      </div>

      {/* Search inputs */}
      <div className="px-3 py-2 space-y-2 border-b border-surface-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowReplace(!showReplace)}
            className="p-1 rounded hover:bg-surface-700 text-surface-500"
          >
            {showReplace ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          <div className="flex-1 flex items-center bg-surface-800 rounded border border-surface-700 focus-within:border-primary-500">
            <Search className="w-3.5 h-3.5 ml-2 text-surface-500 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white placeholder-surface-500 outline-none"
            />
            <button
              onClick={() => setSearchCaseSensitive(!searchCaseSensitive)}
              className={cn(
                'p-1 rounded mx-0.5',
                searchCaseSensitive
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-surface-500 hover:text-surface-300'
              )}
              title="Match Case"
            >
              <CaseSensitive className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setSearchRegex(!searchRegex)}
              className={cn(
                'p-1 rounded mr-0.5',
                searchRegex
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'text-surface-500 hover:text-surface-300'
              )}
              title="Use Regex"
            >
              <Regex className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showReplace && (
          <div className="flex items-center gap-1 ml-6">
            <div className="flex-1 flex items-center bg-surface-800 rounded border border-surface-700 focus-within:border-primary-500">
              <Replace className="w-3.5 h-3.5 ml-2 text-surface-500 shrink-0" />
              <input
                type="text"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                placeholder="Replace"
                className="flex-1 bg-transparent px-2 py-1.5 text-xs text-white placeholder-surface-500 outline-none"
              />
            </div>
            <button
              onClick={handleReplaceAll}
              className="px-2 py-1.5 text-xs rounded bg-surface-700 text-surface-300 hover:bg-surface-600 hover:text-white shrink-0"
              title="Replace All"
            >
              All
            </button>
          </div>
        )}

        {searchQuery && (
          <div className="text-xs text-surface-500">
            {totalMatches} result{totalMatches !== 1 ? 's' : ''} in{' '}
            {searchResults.length} file{searchResults.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {searchResults.length === 0 && searchQuery && (
          <div className="px-3 py-4 text-sm text-surface-500 text-center">
            No results found
          </div>
        )}

        {searchResults.map((group) => (
          <div key={group.filePath}>
            <button
              onClick={() => toggleGroup(group.filePath)}
              className="w-full flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-surface-800/50"
            >
              {expandedGroups.has(group.filePath) ? (
                <ChevronDown className="w-3 h-3 text-surface-500 shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-surface-500 shrink-0" />
              )}
              <FileCode className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-surface-300 truncate">
                {getFileName(group.filePath)}
              </span>
              <span className="ml-auto text-surface-600 shrink-0">
                {group.matches.length}
              </span>
            </button>

            {expandedGroups.has(group.filePath) &&
              group.matches.map((match, idx) => (
                <button
                  key={`${match.line}-${match.column}-${idx}`}
                  onClick={() =>
                    onNavigateToResult(
                      match.filePath,
                      match.line,
                      match.column
                    )
                  }
                  className="w-full text-left px-3 pl-8 py-0.5 text-xs hover:bg-surface-800/50 truncate"
                >
                  <span className="text-surface-600 mr-2">{match.line}</span>
                  <HighlightedLine
                    line={match.lineContent}
                    query={searchQuery}
                    isRegex={searchRegex}
                    caseSensitive={searchCaseSensitive}
                  />
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightedLine({
  line,
  query,
  isRegex,
  caseSensitive,
}: {
  line: string;
  query: string;
  isRegex: boolean;
  caseSensitive: boolean;
}) {
  if (!query) return <span className="text-surface-400">{line.trim()}</span>;

  const trimmed = line.trim();
  const flags = caseSensitive ? 'g' : 'gi';
  let regex: RegExp;
  try {
    regex = isRegex
      ? new RegExp(query, flags)
      : new RegExp(escapeRegExp(query), flags);
  } catch {
    return <span className="text-surface-400">{trimmed}</span>;
  }

  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: trimmed.slice(lastIndex, match.index), highlight: false });
    }
    parts.push({ text: match[0], highlight: true });
    lastIndex = regex.lastIndex;
    if (!regex.global) break;
  }
  if (lastIndex < trimmed.length) {
    parts.push({ text: trimmed.slice(lastIndex), highlight: false });
  }

  return (
    <span>
      {parts.map((part, i) =>
        part.highlight ? (
          <span key={i} className="bg-yellow-500/30 text-yellow-200">
            {part.text}
          </span>
        ) : (
          <span key={i} className="text-surface-400">
            {part.text}
          </span>
        )
      )}
    </span>
  );
}

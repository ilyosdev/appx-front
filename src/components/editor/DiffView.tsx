import { useState, useMemo } from 'react';
import { ArrowLeftRight, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiffViewProps {
  originalContent: string;
  modifiedContent: string;
  filePath: string;
  onAccept?: (content: string) => void;
  onReject?: () => void;
}

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed';
  content: string;
  oldLineNumber: number | null;
  newLineNumber: number | null;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');
  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff
  let i = m,
    j = n;
  const reversed: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      reversed.push({
        type: 'unchanged',
        content: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      reversed.push({
        type: 'added',
        content: newLines[j - 1],
        oldLineNumber: null,
        newLineNumber: j,
      });
      j--;
    } else {
      reversed.push({
        type: 'removed',
        content: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: null,
      });
      i--;
    }
  }

  return reversed.reverse();
}

export function DiffView({
  originalContent,
  modifiedContent,
  filePath,
  onAccept,
  onReject,
}: DiffViewProps) {
  const [mode, setMode] = useState<'inline' | 'side-by-side'>('inline');

  const diffLines = useMemo(
    () => computeDiff(originalContent, modifiedContent),
    [originalContent, modifiedContent]
  );

  const changeIndices = useMemo(() => {
    const indices: number[] = [];
    diffLines.forEach((line, idx) => {
      if (line.type !== 'unchanged') indices.push(idx);
    });
    return indices;
  }, [diffLines]);

  const [currentChangeIdx, setCurrentChangeIdx] = useState(0);

  const stats = useMemo(() => {
    let added = 0,
      removed = 0;
    for (const line of diffLines) {
      if (line.type === 'added') added++;
      if (line.type === 'removed') removed++;
    }
    return { added, removed };
  }, [diffLines]);

  const goToNextChange = () => {
    setCurrentChangeIdx((prev) =>
      prev < changeIndices.length - 1 ? prev + 1 : 0
    );
  };

  const goToPrevChange = () => {
    setCurrentChangeIdx((prev) =>
      prev > 0 ? prev - 1 : changeIndices.length - 1
    );
  };

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-300">{filePath}</span>
          <span className="text-xs text-green-400">+{stats.added}</span>
          <span className="text-xs text-red-400">-{stats.removed}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrevChange}
              className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
              title="Previous change"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <span className="text-xs text-surface-500">
              {changeIndices.length > 0
                ? `${currentChangeIdx + 1}/${changeIndices.length}`
                : '0/0'}
            </span>
            <button
              onClick={goToNextChange}
              className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
              title="Next change"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() =>
              setMode(mode === 'inline' ? 'side-by-side' : 'inline')
            }
            className={cn(
              'p-1.5 rounded text-xs flex items-center gap-1',
              'text-surface-400 hover:text-surface-200 hover:bg-surface-800'
            )}
            title={mode === 'inline' ? 'Side by side' : 'Inline'}
          >
            {mode === 'inline' ? (
              <ArrowLeftRight className="w-3.5 h-3.5" />
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5" />
            )}
          </button>
          {onAccept && (
            <button
              onClick={() => onAccept(modifiedContent)}
              className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-500"
            >
              Accept
            </button>
          )}
          {onReject && (
            <button
              onClick={onReject}
              className="px-3 py-1 text-xs rounded bg-surface-700 text-surface-300 hover:bg-surface-600"
            >
              Reject
            </button>
          )}
        </div>
      </div>

      {/* Diff content */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        {mode === 'inline' ? (
          <InlineDiff lines={diffLines} />
        ) : (
          <SideBySideDiff lines={diffLines} />
        )}
      </div>
    </div>
  );
}

function InlineDiff({ lines }: { lines: DiffLine[] }) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map((line, idx) => (
          <tr
            key={idx}
            className={cn(
              line.type === 'added' && 'bg-green-900/20',
              line.type === 'removed' && 'bg-red-900/20'
            )}
          >
            <td className="w-12 text-right pr-2 text-surface-600 select-none border-r border-surface-800 py-0.5">
              {line.oldLineNumber ?? ''}
            </td>
            <td className="w-12 text-right pr-2 text-surface-600 select-none border-r border-surface-800 py-0.5">
              {line.newLineNumber ?? ''}
            </td>
            <td className="w-6 text-center select-none py-0.5">
              <span
                className={cn(
                  line.type === 'added' && 'text-green-400',
                  line.type === 'removed' && 'text-red-400'
                )}
              >
                {line.type === 'added'
                  ? '+'
                  : line.type === 'removed'
                  ? '-'
                  : ' '}
              </span>
            </td>
            <td className="pl-2 py-0.5">
              <span
                className={cn(
                  'whitespace-pre',
                  line.type === 'added' && 'text-green-300',
                  line.type === 'removed' && 'text-red-300',
                  line.type === 'unchanged' && 'text-surface-400'
                )}
              >
                {line.content}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SideBySideDiff({ lines }: { lines: DiffLine[] }) {
  const leftLines: Array<DiffLine | null> = [];
  const rightLines: Array<DiffLine | null> = [];

  for (const line of lines) {
    if (line.type === 'unchanged') {
      leftLines.push(line);
      rightLines.push(line);
    } else if (line.type === 'removed') {
      leftLines.push(line);
      rightLines.push(null);
    } else {
      leftLines.push(null);
      rightLines.push(line);
    }
  }

  return (
    <div className="flex h-full">
      {/* Left (original) */}
      <div className="flex-1 border-r border-surface-700 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {leftLines.map((line, idx) => (
              <tr
                key={idx}
                className={cn(
                  line?.type === 'removed' && 'bg-red-900/20',
                  !line && 'bg-surface-900/50'
                )}
              >
                <td className="w-10 text-right pr-2 text-surface-600 select-none border-r border-surface-800 py-0.5">
                  {line?.oldLineNumber ?? ''}
                </td>
                <td className="pl-2 py-0.5">
                  <span
                    className={cn(
                      'whitespace-pre',
                      line?.type === 'removed'
                        ? 'text-red-300'
                        : 'text-surface-400'
                    )}
                  >
                    {line?.content ?? ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Right (modified) */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <tbody>
            {rightLines.map((line, idx) => (
              <tr
                key={idx}
                className={cn(
                  line?.type === 'added' && 'bg-green-900/20',
                  !line && 'bg-surface-900/50'
                )}
              >
                <td className="w-10 text-right pr-2 text-surface-600 select-none border-r border-surface-800 py-0.5">
                  {line?.newLineNumber ?? ''}
                </td>
                <td className="pl-2 py-0.5">
                  <span
                    className={cn(
                      'whitespace-pre',
                      line?.type === 'added'
                        ? 'text-green-300'
                        : 'text-surface-400'
                    )}
                  >
                    {line?.content ?? ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

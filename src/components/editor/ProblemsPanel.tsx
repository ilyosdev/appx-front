import { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  X,
} from 'lucide-react';
import { useEditorStore, type Problem } from '@/stores/editorStore';

interface ProblemsPanelProps {
  onNavigateToProblem: (filePath: string, line: number, column: number) => void;
}

function getSeverityIcon(severity: Problem['severity']) {
  switch (severity) {
    case 'error':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    case 'info':
      return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  }
}

function getFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function ProblemsPanel({ onNavigateToProblem }: ProblemsPanelProps) {
  const problems = useEditorStore((s) => s.problems);
  const toggleBottomPanel = useEditorStore((s) => s.toggleBottomPanel);

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const p of problems) {
      c[p.severity]++;
    }
    return c;
  }, [problems]);

  const grouped = useMemo(() => {
    const map = new Map<string, Problem[]>();
    for (const p of problems) {
      const existing = map.get(p.filePath) || [];
      existing.push(p);
      map.set(p.filePath, existing);
    }
    return Array.from(map.entries());
  }, [problems]);

  return (
    <div className="h-full flex flex-col bg-surface-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-surface-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-surface-400 uppercase tracking-wider">
            Problems
          </span>
          <div className="flex items-center gap-2 text-xs">
            {counts.error > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" />
                {counts.error}
              </span>
            )}
            {counts.warning > 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                {counts.warning}
              </span>
            )}
            {counts.info > 0 && (
              <span className="flex items-center gap-1 text-blue-400">
                <Info className="w-3 h-3" />
                {counts.info}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleBottomPanel}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleBottomPanel}
            className="p-1 rounded hover:bg-surface-800 text-surface-500 hover:text-surface-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {problems.length === 0 ? (
          <div className="px-3 py-4 text-sm text-surface-600 text-center">
            No problems detected
          </div>
        ) : (
          grouped.map(([filePath, fileProblems]) => (
            <div key={filePath}>
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs text-surface-400 bg-surface-900/50">
                <span className="truncate">{getFileName(filePath)}</span>
                <span className="text-surface-600 ml-auto shrink-0">
                  {fileProblems.length}
                </span>
              </div>
              {fileProblems.map((problem, idx) => (
                <button
                  key={`${problem.line}-${problem.column}-${idx}`}
                  onClick={() =>
                    onNavigateToProblem(
                      problem.filePath,
                      problem.line,
                      problem.column
                    )
                  }
                  className="w-full flex items-center gap-2 px-3 pl-6 py-1 text-xs hover:bg-surface-800/50 text-left"
                >
                  {getSeverityIcon(problem.severity)}
                  <span className="text-surface-300 truncate flex-1">
                    {problem.message}
                  </span>
                  {problem.source && (
                    <span className="text-surface-600 shrink-0">
                      [{problem.source}]
                    </span>
                  )}
                  <span className="text-surface-600 shrink-0">
                    ({problem.line}:{problem.column})
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useEditorStore } from '@/stores/editorStore';
import type { Problem } from '@/stores/editorStore';

export interface SourceFile {
  id: string;
  projectId: string;
  path: string;
  filename: string;
  directory: string;
  fileType: 'file' | 'folder';
  contentType: string | null;
  content: string | null;
  isScreen: boolean;
  screenName: string | null;
  screenOrder: number;
  screenshotUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseProjectFilesReturn {
  files: SourceFile[];
  isLoading: boolean;
  error: string | null;
  fetchFiles: () => Promise<void>;
  saveFile: (fileId: string, path: string, content: string) => Promise<void>;
  createFile: (path: string, content: string) => Promise<SourceFile | null>;
  deleteFile: (path: string) => Promise<void>;
  setFiles: React.Dispatch<React.SetStateAction<SourceFile[]>>;
}

export function useProjectFiles(projectId: string | undefined): UseProjectFilesReturn {
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const addTerminalLine = useEditorStore((s) => s.addTerminalLine);
  const markFileSaved = useEditorStore((s) => s.markFileSaved);
  const setProblems = useEditorStore((s) => s.setProblems);

  // Fetch files from backend
  const fetchFiles = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: filesResponse } = await api.get(`/projects/${projectId}/files`);
      const filesData: SourceFile[] = filesResponse.data || filesResponse;
      setFiles(filesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load files';
      setError(message);
      console.error('[useProjectFiles] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Fetch files on mount (only once per projectId)
  useEffect(() => {
    if (!projectId) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    fetchFiles();
  }, [projectId, fetchFiles]);

  // Reset when projectId changes
  useEffect(() => {
    hasFetchedRef.current = false;
    setFiles([]);
    setError(null);
  }, [projectId]);

  // Lint code via backend API and push results to ProblemsPanel
  const lintCode = useCallback(
    async (code: string, filePath: string) => {
      try {
        const { data: lintResult } = await api.post('/lint', { code, filePath });
        const result = lintResult.data || lintResult;

        // Convert lint errors/warnings to editor Problem format
        const newProblems: Problem[] = [
          ...(result.errors || []).map((e: { line: number; column: number; message: string; ruleId: string }) => ({
            filePath: filePath,
            line: e.line,
            column: e.column,
            message: e.message,
            severity: 'error' as const,
            source: e.ruleId,
          })),
          ...(result.warnings || []).map((w: { line: number; column: number; message: string; ruleId: string }) => ({
            filePath: filePath,
            line: w.line,
            column: w.column,
            message: w.message,
            severity: 'warning' as const,
            source: w.ruleId,
          })),
        ];

        // Merge: replace problems for this file, keep problems from other files
        const currentProblems = useEditorStore.getState().problems;
        const otherFileProblems = currentProblems.filter(
          (p) => p.filePath !== filePath
        );
        setProblems([...otherFileProblems, ...newProblems]);
      } catch (err) {
        // Linting is best-effort; don't block the save flow
        console.warn('[useProjectFiles] Lint error:', err);
      }
    },
    [setProblems]
  );

  // Save a single file
  const saveFile = useCallback(
    async (fileId: string, path: string, content: string) => {
      if (!projectId) return;

      addTerminalLine({ text: `Saving ${path}...`, type: 'info' });

      try {
        const response = await api.patch(`/projects/${projectId}/files/${fileId}`, {
          content,
          changedBy: 'user',
        });

        // Update local files state
        if (fileId.startsWith('tmpl:')) {
          const newFile = response.data.data || response.data;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, ...newFile } : f))
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, content } : f))
          );
        }

        markFileSaved(path);
        addTerminalLine({ text: `Saved ${path}`, type: 'success' });

        // Lint the saved code and update problems panel
        lintCode(content, path);
      } catch (err) {
        addTerminalLine({
          text: `Failed to save ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          type: 'stderr',
        });
        throw err;
      }
    },
    [projectId, addTerminalLine, markFileSaved, lintCode]
  );

  // Create new file
  const createFile = useCallback(
    async (path: string, content: string): Promise<SourceFile | null> => {
      if (!projectId) return null;

      try {
        const { data: response } = await api.post(`/projects/${projectId}/files`, {
          path,
          content,
        });
        const newFile: SourceFile = response.data || response;
        setFiles((prev) => [...prev, newFile]);
        addTerminalLine({ text: `Created ${path}`, type: 'success' });
        return newFile;
      } catch (err) {
        addTerminalLine({
          text: `Failed to create ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          type: 'stderr',
        });
        return null;
      }
    },
    [projectId, addTerminalLine]
  );

  // Delete file
  const deleteFile = useCallback(
    async (path: string) => {
      if (!projectId) return;

      const file = files.find((f) => f.path === path);
      if (!file) return;

      try {
        await api.delete(`/projects/${projectId}/files/${file.id}`);
        setFiles((prev) => prev.filter((f) => f.path !== path));
        addTerminalLine({ text: `Deleted ${path}`, type: 'info' });
      } catch (err) {
        addTerminalLine({
          text: `Failed to delete ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          type: 'stderr',
        });
      }
    },
    [projectId, files, addTerminalLine]
  );

  return {
    files,
    isLoading,
    error,
    fetchFiles,
    saveFile,
    createFile,
    deleteFile,
    setFiles,
  };
}

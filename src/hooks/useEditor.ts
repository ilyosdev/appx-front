import { useCallback } from 'react';
import { useEditorStore, type SearchResultGroup } from '@/stores/editorStore';
import { api } from '@/lib/api';

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
      return 'typescript';
    case 'tsx':
      return 'typescript';
    case 'js':
      return 'javascript';
    case 'jsx':
      return 'javascript';
    case 'json':
      return 'json';
    case 'css':
    case 'scss':
      return 'css';
    case 'html':
      return 'html';
    case 'md':
      return 'markdown';
    default:
      return 'typescript';
  }
}

export function useEditor(projectId: string | undefined) {
  const store = useEditorStore();

  const openFile = useCallback(
    (path: string, content: string) => {
      const language = getLanguageFromPath(path);
      store.openFile(path, content, language);
    },
    [store]
  );

  const saveFile = useCallback(
    async (path: string, fileId: string) => {
      if (!projectId) return;
      const file = store.openFiles.get(path);
      if (!file || !file.isDirty) return;

      try {
        store.addTerminalLine({
          text: `Saving ${path}...`,
          type: 'info',
        });

        await api.patch(`/projects/${projectId}/files/${fileId}`, {
          content: file.content,
          changedBy: 'user',
        });

        store.markFileSaved(path);
        store.addTerminalLine({
          text: `Saved ${path}`,
          type: 'success',
        });
      } catch (err) {
        store.addTerminalLine({
          text: `Failed to save ${path}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          type: 'stderr',
        });
        throw err;
      }
    },
    [projectId, store]
  );

  const closeFile = useCallback(
    (path: string) => {
      store.closeFile(path);
    },
    [store]
  );

  const searchInFiles = useCallback(
    (
      query: string,
      files: Array<{ path: string; content: string | null }>,
      options?: { regex?: boolean; caseSensitive?: boolean }
    ) => {
      if (!query) {
        store.setSearchResults([]);
        return;
      }

      const results: SearchResultGroup[] = [];
      const flags = options?.caseSensitive ? 'g' : 'gi';

      for (const file of files) {
        if (!file.content) continue;
        const lines = file.content.split('\n');
        const matches: SearchResultGroup['matches'] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          let regex: RegExp;
          try {
            regex = options?.regex
              ? new RegExp(query, flags)
              : new RegExp(escapeRegExp(query), flags);
          } catch {
            return;
          }

          let match: RegExpExecArray | null;
          while ((match = regex.exec(line)) !== null) {
            matches.push({
              filePath: file.path,
              line: i + 1,
              column: match.index + 1,
              lineContent: line,
              matchLength: match[0].length,
            });
            if (!regex.global) break;
          }
        }

        if (matches.length > 0) {
          results.push({
            filePath: file.path,
            matches,
          });
        }
      }

      store.setSearchResults(results);
    },
    [store]
  );

  const replaceInFile = useCallback(
    (
      filePath: string,
      searchQuery: string,
      replaceWith: string,
      options?: { regex?: boolean; caseSensitive?: boolean }
    ) => {
      const file = store.openFiles.get(filePath);
      if (!file) return;

      const flags = options?.caseSensitive ? 'g' : 'gi';
      let regex: RegExp;
      try {
        regex = options?.regex
          ? new RegExp(searchQuery, flags)
          : new RegExp(escapeRegExp(searchQuery), flags);
      } catch {
        return;
      }

      const newContent = file.content.replace(regex, replaceWith);
      store.updateFileContent(filePath, newContent);
    },
    [store]
  );

  return {
    openFile,
    saveFile,
    closeFile,
    searchInFiles,
    replaceInFile,
  };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

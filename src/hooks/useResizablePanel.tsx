import { useState, useCallback, useRef, useEffect } from 'react';

interface UseResizablePanelOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

export function useResizablePanel({ defaultWidth, minWidth, maxWidth, storageKey }: UseResizablePanelOptions) {
  const [width, setWidth] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) return parsed;
      }
    }
    return defaultWidth;
  });

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, String(width));
  }, [width, storageKey]);

  const onMouseDown = useCallback((e: React.MouseEvent, direction: 'left' | 'right' = 'right') => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = direction === 'right' ? ev.clientX - startX.current : startX.current - ev.clientX;
      const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta));
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [width, minWidth, maxWidth]);

  return { width, onMouseDown };
}

export function ResizeHandle({ onMouseDown, direction = 'right' }: { onMouseDown: (e: React.MouseEvent, dir: 'left' | 'right') => void; direction?: 'left' | 'right' }) {
  return (
    <div
      onMouseDown={(e) => onMouseDown(e, direction)}
      className="w-1 hover:w-1.5 flex-shrink-0 bg-surface-800/30 hover:bg-primary-500/40 transition-all duration-150 cursor-col-resize group"
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-px h-8 bg-surface-600/0 group-hover:bg-primary-400/60 transition-colors rounded-full" />
      </div>
    </div>
  );
}

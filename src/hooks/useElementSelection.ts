import { create } from 'zustand';

export interface SelectedElement {
  elementType: string;    // 'button', 'heading', 'text', 'image', etc.
  innerText: string;      // Text content
  selector: string;       // CSS selector
  boundingBox: { x: number; y: number; width: number; height: number };
  screenPath: string;     // Which screen file this is from
  screenName: string;
}

interface ElementSelectionStore {
  selectedElement: SelectedElement | null;
  isSelectionMode: boolean;
  setSelectedElement: (element: SelectedElement | null) => void;
  setSelectionMode: (mode: boolean) => void;
  clearSelection: () => void;
}

export const useElementSelection = create<ElementSelectionStore>((set) => ({
  selectedElement: null,
  isSelectionMode: false,
  setSelectedElement: (element) => set({ selectedElement: element }),
  setSelectionMode: (mode) => set({ isSelectionMode: mode }),
  clearSelection: () => set({ selectedElement: null, isSelectionMode: false }),
}));

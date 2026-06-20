import { create } from 'zustand';
import type { Product } from '@/types';

const MAX = 4;

interface CompareStore {
  items: Product[];
  toggle: (p: Product) => void;
  remove: (id: string) => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  isFull: () => boolean;
}

export const useCompareStore = create<CompareStore>((set, get) => ({
  items: [],
  toggle: (p) => {
    if (get().isSelected(p.id)) {
      set((s) => ({ items: s.items.filter((x) => x.id !== p.id) }));
    } else if (get().items.length < MAX) {
      set((s) => ({ items: [...s.items, p] }));
    }
  },
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
  isSelected: (id) => get().items.some((x) => x.id === id),
  isFull: () => get().items.length >= MAX,
}));

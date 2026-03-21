import { create } from 'zustand';
import type { Product, ProductTag } from '@/types';
import { API } from '@/lib/api';

export interface ProductFormData {
  name: string;
  price: number;
  image: string;
  category: string;
  subcategory?: string;
  description: string;
  stock: number;
  rating?: number;
  originalPrice?: number;
  tag?: ProductTag;
}

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    const state = get();
    if (state.loading) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}/products`);
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      set({ products: list, loading: false, error: null });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Error desconocido';
      set((prev) => ({
        loading: false,
        error: errMsg,
        products: prev.products.length > 0 ? prev.products : [],
      }));
    }
  },
}));

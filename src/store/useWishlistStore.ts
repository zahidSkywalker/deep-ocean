import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  items: number[];
  toggleItem: (productId: number) => void;
  isWishlisted: (productId: number) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: (productId: number) => {
        set((state) => {
          const exists = state.items.includes(productId);
          if (exists) {
            return { items: state.items.filter((id) => id !== productId) };
          }
          return { items: [...state.items, productId] };
        });
      },

      isWishlisted: (productId: number) => {
        return get().items.includes(productId);
      },
    }),
    {
      name: 'artisanmarket-wishlist',
    }
  )
);
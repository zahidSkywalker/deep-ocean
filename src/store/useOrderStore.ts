import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Order } from '@/types';

interface OrderStoreState {
  orders: Order[];
  addOrder: (order: Order) => void;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByUser: () => Order[];
}

export const useOrderStore = create<OrderStoreState>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order: Order) => {
        set((state) => ({ orders: [order, ...state.orders] }));
      },

      getOrderById: (id: string) => {
        return get().orders.find((order) => order.id === id);
      },

      getOrdersByUser: () => {
        return get().orders;
      },
    }),
    {
      name: 'artisanmarket-orders',
    }
  )
);
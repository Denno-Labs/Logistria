import { create } from 'zustand';
import type { User } from 'firebase/auth';

export interface Truck {
  id: string;
  lat: number;
  lng: number;
  status: 'MOVING' | 'DELAYED';
}

interface StoreState {
  // Fleet
  trucks: Truck[];
  activeProduct: string;
  setActiveProduct: (product: string) => void;
  // Auth
  user: User | null;
  role: string | null;
  setUser: (user: User, role: string | null) => void;
  logout: () => void;
}

export const useStore = create<StoreState>((set) => ({
  trucks: [
    { id: 'TRK-001', lat: 40.7128, lng: -74.006, status: 'MOVING' },
    { id: 'TRK-002', lat: 40.7589, lng: -73.9851, status: 'DELAYED' },
    { id: 'TRK-003', lat: 40.6892, lng: -74.0445, status: 'MOVING' },
  ],
  activeProduct: 'Semiconductors',
  setActiveProduct: (product) => set({ activeProduct: product }),
  user: null,
  role: null,
  setUser: (user, role) => set({ user, role }),
  logout: () => set({ user: null, role: null }),
}));

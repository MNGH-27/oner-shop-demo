import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Customer } from "@core/types/shop.types";
interface AuthState {
  token: string | null;
  user: Customer | null;
  setAuth: (token: string, user: Customer) => void;
  setUser: (user: Customer) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem("oner-access-token", token);
        set({ token, user });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        localStorage.removeItem("oner-access-token");
        set({ token: null, user: null });
      },
    }),
    { name: "oner-auth" },
  ),
);

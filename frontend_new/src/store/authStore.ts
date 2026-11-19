import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../services/api";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      login: async (email, password) => {
        const { data } = await api.post<{ access_token: string }>("/auth/login", { email, password });
        localStorage.setItem("access_token", data.access_token);
        set({ token: data.access_token, isAuthenticated: true });
        await get().loadUser();
      },
      register: async (name, email, password) => {
        await api.post("/auth/register", { name, email, password });
      },
      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null, isAuthenticated: false });
      },
      loadUser: async () => {
        const token = get().token ?? localStorage.getItem("access_token");
        if (!token) {
          set({ user: null, isAuthenticated: false, loading: false });
          return;
        }
        set({ loading: true });
        try {
          const { data } = await api.get<AuthUser>("/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user: data, token, isAuthenticated: true, loading: false });
        } catch {
          localStorage.removeItem("access_token");
          set({ user: null, token: null, isAuthenticated: false, loading: false });
        }
      },
    }),
    {
      name: "finance-auth",
      partialize: (state) => ({ token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

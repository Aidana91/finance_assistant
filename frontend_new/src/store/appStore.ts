import { create } from "zustand";
import type { Settings } from "../types";

type Notice = { type: "success" | "error"; text: string } | null;

interface AppState {
  notice: Notice;
  setNotice: (notice: Notice) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  language: Settings["language"];
  setLanguage: (language: Settings["language"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  notice: null,
  setNotice: (notice) => set({ notice }),
  sidebarOpen: typeof window === "undefined" ? true : window.innerWidth >= 900,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  language: (typeof localStorage === "undefined" ? "ru" : localStorage.getItem("finance-language") as Settings["language"] | null) ?? "ru",
  setLanguage: (language) => {
    localStorage.setItem("finance-language", language);
    document.documentElement.lang = language;
    set({ language });
  },
}));

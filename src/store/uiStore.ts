import { create } from 'zustand'

interface UIState {
  isKeyboardOpen: boolean
  setKeyboardOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  isKeyboardOpen: false,
  setKeyboardOpen: (open) => set({ isKeyboardOpen: open })
}))


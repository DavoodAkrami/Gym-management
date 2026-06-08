"use client";

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/store";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
};

type ToastState = {
  toasts: Toast[];
};

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload);
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    markToastExiting(state, action: PayloadAction<string>) {
      const toast = state.toasts.find((t) => t.id === action.payload);
      if (toast) {
        toast.exiting = true;
      }
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const toastActions = toastSlice.actions;
export const toastReducer = toastSlice.reducer;

export function selectToasts(state: RootState) {
  return state.toast.toasts;
}

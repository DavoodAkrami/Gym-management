"use client";

import { useCallback } from "react";
import { toastActions, type Toast, type ToastType } from "./store";
import { store } from "@/lib/store";

let counter = 0;

const TOAST_DURATION = 4000;

export function showToast(type: ToastType, message: string) {
  const id = `toast-${++counter}`;
  store.dispatch(toastActions.addToast({ id, type, message }));
  window.setTimeout(() => {
    store.dispatch(toastActions.removeToast(id));
  }, TOAST_DURATION);
  return id;
}

export function useToast() {
  const addToast = useCallback((type: ToastType, message: string) => {
    return showToast(type, message);
  }, []);

  const success = useCallback((message: string) => addToast("success", message), [addToast]);
  const error = useCallback((message: string) => addToast("error", message), [addToast]);
  const info = useCallback((message: string) => addToast("info", message), [addToast]);

  return { addToast, success, error, info };
}

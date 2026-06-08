import { configureStore } from "@reduxjs/toolkit";
import { toastReducer } from "@/lib/toast/store";
import { reducers } from "./slices";

export const store = configureStore({
  reducer: {
    ...reducers,
    toast: toastReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

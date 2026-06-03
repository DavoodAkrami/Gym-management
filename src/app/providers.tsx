"use client";

import { Provider } from "react-redux";
import { LocaleProvider } from "@/components/LocaleProvider";
import { store } from "@/lib/store";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Provider store={store}>
      <LocaleProvider>{children}</LocaleProvider>
    </Provider>
  );
}

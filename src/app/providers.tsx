"use client";

import { Provider } from "react-redux";
import { LocaleProvider } from "@/components/LocaleProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { store } from "@/lib/store";

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <LocaleProvider>{children}</LocaleProvider>
      </ThemeProvider>
    </Provider>
  );
}

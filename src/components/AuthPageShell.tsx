"use client";

import { AuthBackButton } from "./AuthBackButton";
import { PreferencesBar } from "./PreferencesBar";

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen px-5 py-5 pt-20 text-foreground sm:px-8 sm:pt-24 lg:px-10">
      <div className="fixed top-3 right-3 left-14 z-50 flex justify-end sm:top-8 sm:right-8 sm:left-auto">
        <PreferencesBar />
      </div>
      <AuthBackButton />
      <section className="mx-auto flex w-full max-w-3xl flex-col">
        <div className="flex flex-1 items-start justify-center py-4">{children}</div>
      </section>
    </main>
  );
}

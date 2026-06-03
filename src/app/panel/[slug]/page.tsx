import { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PanelShell } from "@/components/panel/PanelShell";
import { PanelSkeleton } from "@/components/panel/PanelSkeleton";

type PanelPageProps = {
  params: Promise<{ slug: string }>;
};

function PanelLoading() {
  return <PanelSkeleton />;
}

export default async function GymPanelPage({ params }: PanelPageProps) {
  const { slug } = await params;

  return (
    <AuthGate mode="panel" gymSlug={slug}>
      <main className="panel-page-root px-4 py-4 text-foreground sm:px-6 lg:px-8">
        <Suspense fallback={<PanelLoading />}>
          <PanelShell slug={slug} />
        </Suspense>
      </main>
    </AuthGate>
  );
}

import { Suspense } from "react";
import { CoachAuthGate } from "@/components/coach/CoachAuthGate";
import { CoachPanelShell } from "@/components/coach/CoachPanelShell";
import { PanelSkeleton } from "@/components/panel/PanelSkeleton";

type CoachPanelPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CoachPanelPage({ params }: CoachPanelPageProps) {
  const { slug } = await params;

  return (
    <CoachAuthGate gymSlug={slug}>
      <main className="panel-page-root px-4 py-4 text-foreground sm:px-6 lg:px-8">
        <Suspense fallback={<PanelSkeleton />}>
          <CoachPanelShell slug={slug} />
        </Suspense>
      </main>
    </CoachAuthGate>
  );
}

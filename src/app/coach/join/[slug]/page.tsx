import { CoachSignupForm } from "@/components/coach/CoachSignupForm";

type CoachJoinPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CoachJoinPage({ params }: CoachJoinPageProps) {
  const { slug } = await params;

  return (
    <main className="panel-page-root flex min-h-screen items-center justify-center px-4 py-8 text-foreground">
      <CoachSignupForm gymSlug={slug} />
    </main>
  );
}

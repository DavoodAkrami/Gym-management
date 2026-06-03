import { JoinSignupForm } from "@/components/join/JoinSignupForm";

type JoinPageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicJoinPage({ params }: JoinPageProps) {
  const { token } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <JoinSignupForm token={token} />
    </main>
  );
}

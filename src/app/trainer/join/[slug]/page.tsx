import { redirect } from "next/navigation";

type TrainerJoinRedirectProps = {
  params: Promise<{ slug: string }>;
};

export default async function TrainerJoinRedirect({ params }: TrainerJoinRedirectProps) {
  const { slug } = await params;
  redirect(`/coach/join/${slug}`);
}

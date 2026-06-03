import { CoachPortalRedirect } from "@/components/coach/CoachPortalRedirect";

/** Legacy URL — same as /coach */
export default function TrainerPortalRedirectPage() {
  return (
    <main className="panel-page-root px-4 py-4 text-foreground">
      <CoachPortalRedirect />
    </main>
  );
}

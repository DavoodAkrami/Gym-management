import { MemberAuthGate } from "@/components/MemberAuthGate";
import { MemberPortalView } from "@/components/member/MemberPortalView";

export default function MemberPortalPage() {
  return (
    <main className="min-h-screen px-4 py-4 sm:px-6">
      <MemberAuthGate>
        <MemberPortalView />
      </MemberAuthGate>
    </main>
  );
}

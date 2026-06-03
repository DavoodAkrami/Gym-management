import { AuthPageShell } from "@/components/AuthPageShell";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <AuthPageShell>
      <SignupForm />
    </AuthPageShell>
  );
}

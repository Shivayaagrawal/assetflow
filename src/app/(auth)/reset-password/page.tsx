import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="page-subtitle">Loading reset form...</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

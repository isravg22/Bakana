import { Suspense } from "react";
import { LoginPanel } from "./LoginPanel";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPanel />
    </Suspense>
  );
}

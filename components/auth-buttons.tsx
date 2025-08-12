"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AuthButtons() {
  const { data: session, status } = useSession();
  if (status === "loading") return <Button variant="outline" disabled>…</Button>;

  if (!session) {
    return (
      <Button variant="outline" onClick={() => signIn("discord", { callbackUrl: "/" })}>
        Sign in
      </Button>
    );
  }
  return (
    <Button variant="outline" onClick={() => signOut({ callbackUrl: "/" })}>
      Sign out
    </Button>
  );
}

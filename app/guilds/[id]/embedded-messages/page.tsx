"use client";

import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import EmbeddedMessagesBuilder from "@/components/embedded-messages-builder";

export default function EmbeddedMessagesPage() {
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated" || !session) {
    redirect("/signin");
  }

  // For now, assume premium is true - you can adjust this logic based on your needs
  const premium = true;

  return <EmbeddedMessagesBuilder premium={premium} />;
}

"use client";

import EmbeddedMessagesBuilder from "@/components/embedded-messages-builder";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

export default function EmbeddedRolesPage(undefined) {
  return (
    <AuthErrorBoundary>
      <EmbeddedRolesPageContent undefined />
    </AuthErrorBoundary>
  );
}

function EmbeddedRolesPageContent(undefined) {
  
  return <EmbeddedMessagesBuilder premium={true} />;

}



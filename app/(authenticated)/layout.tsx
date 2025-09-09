import ConsoleShell from "@/components/console-shell";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthErrorBoundary>
      <ConsoleShell>{children}</ConsoleShell>
    </AuthErrorBoundary>
  );
}
import ConsoleShell from "@/components/console-shell";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';
import { E2ETrackingProvider } from '@/components/e2e-tracking-provider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user session for E2E tracking
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const discordId = (session as any)?.discordId;

  return (
    <AuthErrorBoundary>
      <E2ETrackingProvider
        userId={userId}
        discordId={discordId}
        enableTracking={process.env.NODE_ENV === 'production' || process.env.E2E_TRACKING_ENABLED === 'true'}
      >
        <ConsoleShell>{children}</ConsoleShell>
      </E2ETrackingProvider>
    </AuthErrorBoundary>
  );
}
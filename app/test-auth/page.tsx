"use client";

import { useAuth } from '@/hooks/useAuth';
import { useSession } from 'next-auth/react';

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { data: session, status } = useSession();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">useAuth Hook:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify({ user, isAuthenticated, isLoading }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">useSession Hook:</h2>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify({ 
              status, 
              hasSession: !!session,
              user: session?.user,
              discordId: (session as any)?.discordId,
              role: (session as any)?.role,
              expiresAt: (session as any)?.expiresAt
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Raw Session:</h2>
          <pre className="bg-gray-100 p-4 rounded max-h-96 overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

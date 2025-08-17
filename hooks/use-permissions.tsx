import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PermissionCheck {
  canUseApp: boolean;
  isOwner: boolean;
  hasRoleAccess: boolean;
  loading: boolean;
  error: string | null;
}

export function usePermissions(guildId: string): PermissionCheck {
  const { data: session } = useSession();
  const [permissions, setPermissions] = useState<PermissionCheck>({
    canUseApp: false,
    isOwner: false,
    hasRoleAccess: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!session?.user || !guildId) {
      setPermissions(prev => ({ ...prev, loading: false }));
      return;
    }

    checkPermissions();
  }, [session, guildId]);

  const checkPermissions = async () => {
    try {
      setPermissions(prev => ({ ...prev, loading: true, error: null }));

      // Get user's roles from session or fetch them
      const userRoles = (session?.user as any)?.roles || [];
      
      const response = await fetch(`/api/guilds/${guildId}/role-permissions/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: (session?.user as any)?.id,
          userRoles
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions({
          canUseApp: data.canUseApp,
          isOwner: data.isOwner,
          hasRoleAccess: data.hasRoleAccess,
          loading: false,
          error: null
        });
      } else {
        throw new Error('Failed to check permissions');
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      setPermissions({
        canUseApp: false,
        isOwner: false,
        hasRoleAccess: false,
        loading: false,
        error: 'Failed to check permissions'
      });
    }
  };

  return permissions;
}

// Higher-order component for protecting routes/components
export function withPermissions<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType
) {
  return function ProtectedComponent(props: P & { guildId: string }) {
    const { canUseApp, loading, error } = usePermissions(props.guildId);

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Checking permissions...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-8 text-center">
          <div className="text-red-600 mb-2">Permission Check Failed</div>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      );
    }

    if (!canUseApp) {
      if (fallback) {
        return <fallback />;
      }
      
      return (
        <div className="p-8 text-center">
          <div className="text-red-600 mb-2">Access Denied</div>
          <p className="text-sm text-muted-foreground">
            You don't have permission to access this feature. Contact a server administrator.
          </p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

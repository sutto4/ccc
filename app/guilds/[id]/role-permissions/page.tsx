"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import RolePermissionSettings from "@/components/ui/role-permission-settings";
import { fetchRoles } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

export default function RolePermissionsPage() {
  return (
    <AuthErrorBoundary>
      <RolePermissionsPageContent undefined />
    </AuthErrorBoundary>
  );
}

function RolePermissionsPageContent() {
  
  const params = useParams<{ id: string }>();
  const guildId = params.id;
  const { data: session, status } = useSession();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (status === "loading") return;
    
    if (status === "unauthenticated" || !session) {
      redirect("/signin");
    }

    // Only load data when we have a valid session
    if (session) {
      console.log('Session loaded, calling loadRoles');
      loadRoles();
    }
  }, [status, session, guildId]);



  const loadRoles = async () => {
    try {
      setLoading(true);
      const fetchedRoles = await fetchRoles(guildId);
      setRoles(fetchedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: "Error",
        description: "Failed to load server roles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="py-6">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || !session) {
    redirect("/signin");
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">App Access Control</h1>
      <p className="text-sm text-muted-foreground mb-6">Control which roles can access and use this app.</p>
      <RolePermissionSettings guildId={guildId} roles={roles} />
    </div>
  );

}

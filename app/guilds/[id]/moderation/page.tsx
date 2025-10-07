"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  List, 
  Settings, 
  UserX, 
  UserCheck, 
  Clock, 
  VolumeX,
  Volume2,
  Ban,
  Plus
} from "lucide-react";
import ActionModal, { ModAction } from "./components/action-modal";
import CasesList from "./components/cases-list";
import ModerationSettings from "./components/moderation-settings";
import CaseDetail from "./components/case-detail";
import { useBanSyncMock } from "./hooks/use-ban-sync-mock";
import { AuthErrorBoundary } from '@/components/auth-error-boundary';

// Mock function to get guild info - replace with real API call
const getGuildInfo = async (guildId: string) => {
  // This would be a real API call in production
  // For now, return mock data
  return {
    id: guildId,
    name: "Test Server",
    group: {
      id: 1,
      name: "Gaming Community",
      description: "A group of gaming servers"
    }
  };
};

export default function ModerationPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState("cases");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: ModAction;
    targetUserId?: string;
    targetUsername?: string;
  }>({
    isOpen: false,
    action: "ban",
  });

  const { toastMessage } = useBanSyncMock();
  const [guildId, setGuildId] = useState<string>("");
  const [guildInfo, setGuildInfo] = useState<{
    id: string;
    name: string;
    group?: {
      id: number;
      name: string;
      description: string | null;
    } | null;
  } | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    totalCases: 0,
    activeBans: 0,
    activeMutes: 0,
    pendingReviews: 0,
    recentCases24h: 0,
    isGroupView: false,
    groupGuildCount: 1,
    groupGuildIds: []
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch moderation stats
  const fetchStats = async (id: string) => {
    // Don't fetch if id is empty
    if (!id || id.trim() === '') {
      setStatsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/guilds/${id}/moderation/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch stats:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    const getGuildId = async () => {
      const { id } = await params;
      setGuildId(id);

      // Fetch guild info to check group membership
      try {
        const info = await getGuildInfo(id);
        setGuildInfo(info);
      } catch (error) {
        console.error("Failed to fetch guild info:", error);
        setGuildInfo({ id, name: "Unknown Server", group: null });
      }

      // Fetch moderation stats
      await fetchStats(id);

      // Check for case parameter in URL to auto-open case details
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const caseParam = urlParams.get('case');
        if (caseParam) {
          setSelectedCaseId(caseParam);
          setActiveTab("case-detail");
        }
      }
    };
    getGuildId();
  }, [params]);

  const isPartOfGroup = !!guildInfo?.group;
  const groupName = guildInfo?.group?.name;

  // Demo toggle for testing group membership states
  const [demoGroupState, setDemoGroupState] = useState(true);
  const finalIsPartOfGroup = demoGroupState && isPartOfGroup;
  const finalGroupName = demoGroupState ? groupName : undefined;

  const openActionModal = (action: ModAction, targetUserId?: string, targetUsername?: string) => {
    setActionModal({
      isOpen: true,
      action,
      targetUserId,
      targetUsername,
    });
  };

  const closeActionModal = () => {
    setActionModal({
      isOpen: false,
      action: "ban",
    });
  };

  const viewCaseDetails = (caseId: string) => {
    setSelectedCaseId(caseId);
    setActiveTab("case-detail");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-red-500" />
          <h1 className="text-2xl font-bold">Moderation</h1>
        </div>
        <p className="text-muted-foreground">
          Manage server moderation, cases, and user actions
        </p>
        
        {/* Group Information */}
        {finalIsPartOfGroup && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
            <Shield className="h-4 w-4 text-blue-500" />
            Part of group: <span className="font-semibold">{finalGroupName}</span>
          </div>
        )}
        
        {/* Demo Group Toggle */}
        <div className="flex items-center space-x-3">
          <div className="text-sm text-muted-foreground">
            {finalIsPartOfGroup ? (
              <span className="text-green-600 font-medium">✓ In Group: {finalGroupName}</span>
            ) : (
              <span className="text-red-600 font-medium">✗ Not in Group</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDemoGroupState(!demoGroupState)}
            className="text-xs"
          >
            {demoGroupState ? "Remove from Group" : "Add to Group"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
              <p className="text-2xl font-bold">
                {statsLoading ? "..." : stats.totalCases.toLocaleString()}
              </p>
            </div>
            <List className="h-8 w-8 text-blue-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.totalCases === 0 ? "No cases yet" : 
             stats.isGroupView ? `Across ${stats.groupGuildCount} server${stats.groupGuildCount !== 1 ? 's' : ''}` : 
             "Total moderation cases"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Bans</p>
              <p className="text-2xl font-bold text-red-600">
                {statsLoading ? "..." : stats.activeBans.toLocaleString()}
              </p>
            </div>
            <Ban className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.activeBans === 0 ? "No active bans" : "Currently banned"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Muted Users</p>
              <p className="text-2xl font-bold text-orange-600">
                {statsLoading ? "..." : stats.activeMutes.toLocaleString()}
              </p>
            </div>
            <VolumeX className="h-8 w-8 text-orange-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.activeMutes === 0 ? "No muted users" : "Currently muted"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">
                {statsLoading ? "..." : stats.pendingReviews.toLocaleString()}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.pendingReviews === 0 ? "No pending cases" : "Need attention"}
          </p>
        </Card>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Cases List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <List className="h-5 w-5" />
              Moderation Cases
            </h2>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </div>
          
          {guildId ? (
            <CasesList
              guildId={guildId}
              isPartOfGroup={finalIsPartOfGroup}
              onViewCase={viewCaseDetails}
              selectedCaseId={selectedCaseId}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading moderation cases...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Case Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Case Details
            </h2>
            {selectedCaseId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCaseId(null)}
                className="text-xs"
              >
                Clear Selection
              </Button>
            )}
          </div>

          {guildId && selectedCaseId ? (
            <CaseDetail
              guildId={guildId}
              caseId={selectedCaseId}
              isPartOfGroup={finalIsPartOfGroup}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="text-center py-16">
                  <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Case Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a case from the list to view its details
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Click on any case in the left panel to get started
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Moderation Settings
        </h2>
        
        {guildId ? (
          <ModerationSettings guildId={guildId} isPartOfGroup={finalIsPartOfGroup} groupName={finalGroupName} />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading moderation settings...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Action Modal */}
      <ActionModal
        isOpen={actionModal.isOpen}
        onClose={closeActionModal}
        action={actionModal.action}
        targetUserId={actionModal.targetUserId}
        targetUsername={actionModal.targetUsername}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

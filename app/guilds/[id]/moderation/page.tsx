"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Ban
} from "lucide-react";
import ActionModal, { ModAction } from "./components/action-modal";
import CasesList from "./components/cases-list";
import ModerationSettings from "./components/moderation-settings";
import CaseDetailDemo from "./components/case-detail-demo";
import { useBanSyncMock } from "./hooks/use-ban-sync-mock";

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-red-500" />
          <div>
            <h1 className="text-3xl font-bold">Moderation</h1>
            <p className="text-muted-foreground">
              Manage server moderation, cases, and user actions
            </p>
          </div>
        </div>
        
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <List className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No cases yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bans</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No active bans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Muted Users</CardTitle>
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No muted users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No pending cases</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cases" className="flex items-center space-x-2">
            <List className="h-4 w-4" />
            <span>Cases</span>
          </TabsTrigger>
          <TabsTrigger value="case-detail" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Case Detail</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Quick Actions</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-4">
          <CasesList guildId={guildId} isPartOfGroup={finalIsPartOfGroup} />
        </TabsContent>

        <TabsContent value="case-detail" className="space-y-4">
          <CaseDetailDemo guildId={guildId} isPartOfGroup={finalIsPartOfGroup} />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Take moderation actions quickly. All actions will be logged and can be reviewed later.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button
                  variant="danger"
                  onClick={() => openActionModal("ban")}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Ban className="h-6 w-6" />
                  <span>Ban User</span>
                </Button>

                <Button
                  variant="danger"
                  onClick={() => openActionModal("kick")}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <UserX className="h-6 w-6" />
                  <span>Kick User</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => openActionModal("timeout")}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Clock className="h-6 w-6" />
                  <span>Timeout User</span>
                </Button>

                <Button
                  variant="primary"
                  onClick={() => openActionModal("mute")}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <VolumeX className="h-6 w-6" />
                  <span>Mute User</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openActionModal("unban")}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <UserCheck className="h-6 w-6" />
                  <span>Unban User</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => openActionModal("unmute")}
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                >
                  <Volume2 className="h-6 w-6" />
                  <span>Unmute User</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ModerationSettings guildId={guildId} isPartOfGroup={finalIsPartOfGroup} groupName={finalGroupName} />
        </TabsContent>
      </Tabs>

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

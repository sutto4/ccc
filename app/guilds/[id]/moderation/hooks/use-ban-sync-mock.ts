import { useState, useCallback } from "react";
import { SyncSettings, SyncSettingsData, PropagationRow, EnforcementStatus } from "../types/ban-sync";

// In-memory storage for mock data
const mockSyncSettings = new Map<string, SyncSettings>();
const mockPropagations = new Map<string, PropagationRow[]>();

// Initialize with some mock data
const initializeMockData = () => {
  // Mock sync settings for a few guilds
  mockSyncSettings.set("guild1", {
    enabled: true,
    mode: "review",
    reviewerRoleIds: ["role1", "role2"]
  });
  
  mockSyncSettings.set("guild2", {
    enabled: false,
    mode: "exempt",
    reviewerRoleIds: []
  });

  // Mock propagation data for some cases
  mockPropagations.set("case1", [
    {
      guildId: "guild1",
      guildName: "Test Server 1",
      status: "pending",
      updatedAt: "2024-01-15T10:30:00Z"
    },
    {
      guildId: "guild2", 
      guildName: "Test Server 2",
      status: "enforced",
      updatedAt: "2024-01-15T10:25:00Z"
    }
  ]);

  mockPropagations.set("case2", [
    {
      guildId: "guild1",
      guildName: "Test Server 1", 
      status: "exempt",
      updatedAt: "2024-01-15T09:15:00Z"
    }
  ]);
};

// Initialize mock data
initializeMockData();

export function useBanSyncMock() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const getSyncSettings = useCallback((guildId: string): SyncSettings => {
    return mockSyncSettings.get(guildId) || {
      enabled: false,
      mode: "exempt",
      reviewerRoleIds: []
    };
  }, []);

  const saveSyncSettings = useCallback((guildId: string, data: SyncSettingsData): Promise<void> => {
    return new Promise((resolve) => {
      mockSyncSettings.set(guildId, data);
      showToast("Sync settings saved successfully");
      resolve();
    });
  }, [showToast]);

  const getPropagation = useCallback((caseId: string): PropagationRow[] => {
    return mockPropagations.get(caseId) || [];
  }, []);

  const approve = useCallback((caseId: string, guildId: string): Promise<void> => {
    return new Promise((resolve) => {
      const propagation = mockPropagations.get(caseId);
      if (propagation) {
        const row = propagation.find(p => p.guildId === guildId);
        if (row) {
          row.status = "enforced";
          row.updatedAt = new Date().toISOString();
          showToast(`Case approved for ${row.guildName}`);
        }
      }
      resolve();
    });
  }, [showToast]);

  const reject = useCallback((caseId: string, guildId: string, reason?: string): Promise<void> => {
    return new Promise((resolve) => {
      const propagation = mockPropagations.get(caseId);
      if (propagation) {
        const row = propagation.find(p => p.guildId === guildId);
        if (row) {
          row.status = "exempt";
          row.lastError = reason || "Rejected by reviewer";
          row.updatedAt = new Date().toISOString();
          showToast(`Case rejected for ${row.guildName}`);
        }
      }
      resolve();
    });
  }, [showToast]);

  const propagate = useCallback((caseId: string): Promise<void> => {
    return new Promise((resolve) => {
      // Mock propagation - add some pending rows
      const newPropagation: PropagationRow[] = [
        {
          guildId: "guild3",
          guildName: "New Server",
          status: "pending",
          updatedAt: new Date().toISOString()
        }
      ];
      
      const existing = mockPropagations.get(caseId) || [];
      mockPropagations.set(caseId, [...existing, ...newPropagation]);
      
      showToast("Case propagated to linked guilds");
      resolve();
    });
  }, [showToast]);

  return {
    getSyncSettings,
    saveSyncSettings,
    getPropagation,
    approve,
    reject,
    propagate,
    toastMessage,
    showToast
  };
}

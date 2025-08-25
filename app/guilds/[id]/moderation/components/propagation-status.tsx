"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { PropagationRow, EnforcementStatus } from "../types/ban-sync";

interface PropagationStatusProps {
  rows: PropagationRow[];
  canReview: boolean;
  onApprove: (caseId: string, guildId: string) => Promise<void>;
  onReject: (caseId: string, guildId: string, reason?: string) => Promise<void>;
  isPartOfGroup: boolean;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary" as const,
    className: "bg-yellow-100 text-yellow-800 border-yellow-200"
  },
  enforced: {
    label: "Enforced",
    icon: CheckCircle,
    variant: "default" as const,
    className: "bg-green-100 text-green-800 border-green-200"
  },
  exempt: {
    label: "Exempt",
    icon: XCircle,
    variant: "outline" as const,
    className: "bg-gray-100 text-gray-600 border-gray-200"
  },
  failed: {
    label: "Failed",
    icon: AlertTriangle,
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 border-red-200"
  }
};

export default function PropagationStatus({
  rows,
  canReview,
  onApprove,
  onReject,
  isPartOfGroup
}: PropagationStatusProps) {
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectingGuildId, setRejectingGuildId] = useState<string | null>(null);

  const handleApprove = async (guildId: string) => {
    try {
      await onApprove("case1", guildId); // Mock caseId
    } catch (error) {
      console.error("Failed to approve:", error);
    }
  };

  const handleReject = async (guildId: string) => {
    try {
      await onReject("case1", guildId, rejectReason || undefined);
      setRejectingGuildId(null);
      setRejectReason("");
    } catch (error) {
      console.error("Failed to reject:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateError = (error: string, maxLength: number = 50) => {
    return error.length > maxLength ? `${error.substring(0, maxLength)}...` : error;
  };

  if (!isPartOfGroup) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Propagation Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">Server Not in Group</h3>
            <p className="text-muted-foreground">
              Propagation status is only available for servers that are part of a server group.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Propagation Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No linked guilds yet</h3>
            <p className="text-muted-foreground">
              When you propagate this case, it will appear here with its enforcement status.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Propagation Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Guild</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Last Error</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Updated</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status = statusConfig[row.status];
                const StatusIcon = status.icon;
                const isPending = row.status === "pending";
                const showActions = isPending && canReview;

                return (
                  <tr key={row.guildId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="font-medium">{row.guildName}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge 
                        variant={status.variant}
                        className={`flex items-center space-x-1 ${status.className}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        <span>{status.label}</span>
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {row.lastError ? (
                        <span className="text-sm text-red-600" title={row.lastError}>
                          {truncateError(row.lastError)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(row.updatedAt)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {showActions ? (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(row.guildId)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectingGuildId(row.guildId)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Reject Reason Modal */}
        {rejectingGuildId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Reject Case</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Provide a reason for rejecting this case (optional):
              </p>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingGuildId(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleReject(rejectingGuildId)}
                >
                  Reject
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Clock, MessageSquare } from "lucide-react";
import SyncBadge from "./sync-badge";
import PropagateActionBar from "./propagate-action-bar";
import PropagationStatus from "./propagation-status";
import { useBanSyncMock } from "../hooks/use-ban-sync-mock";
import { Label } from "@/components/ui/label";

interface CaseDetailDemoProps {
  guildId: string;
  isPartOfGroup: boolean;
}

export default function CaseDetailDemo({ guildId, isPartOfGroup }: CaseDetailDemoProps) {
  const [isPropagated, setIsPropagated] = useState(false);
  const { getPropagation, approve, reject, propagate } = useBanSyncMock();
  
  // Mock case data
  const mockCase = {
    id: "case1",
    targetUser: "123456789",
    targetUsername: "TroubleMaker#1234",
    action: "ban",
    reason: "Repeated violations of community guidelines",
    moderator: "Moderator#5678",
    createdAt: "2024-01-15T10:00:00Z",
    isOrigin: true
  };

  const propagationRows = getPropagation(mockCase.id);
  const canReview = true; // Mock user has reviewer role

  const handlePropagate = async () => {
    await propagate(mockCase.id);
    setIsPropagated(true);
  };

  const handleApprove = async (caseId: string, guildId: string) => {
    await approve(caseId, guildId);
  };

  const handleReject = async (caseId: string, guildId: string, reason?: string) => {
    await reject(caseId, guildId, reason);
  };

  return (
    <div className="space-y-6">
      {/* Case Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold">Case #{mockCase.id}</h1>
                <SyncBadge variant={mockCase.isOrigin ? "origin" : "synced"} />
              </div>
              <p className="text-muted-foreground">
                {mockCase.action} action on {mockCase.targetUsername}
              </p>
            </div>
            <PropagateActionBar
              enabled={true}
              alreadyPropagated={isPropagated}
              onPropagate={handlePropagate}
              isPartOfGroup={isPartOfGroup}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Target User</Label>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{mockCase.targetUsername}</span>
                <Badge variant="outline">{mockCase.targetUser}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Moderator</Label>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>{mockCase.moderator}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Action</Label>
              <Badge variant="destructive" className="capitalize">{mockCase.action}</Badge>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Created</Label>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{new Date(mockCase.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Reason</Label>
            <p className="text-sm bg-gray-50 p-3 rounded-md">{mockCase.reason}</p>
          </div>
        </CardContent>
      </Card>

      {/* Evidence Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Evidence</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-2">No evidence attached</h3>
            <p className="text-muted-foreground mb-4">
              Attach screenshots, logs, or other evidence to support this case.
            </p>
            <Button variant="outline">Add Evidence</Button>
          </div>
        </CardContent>
      </Card>

      {/* Propagation Status */}
      <PropagationStatus
        rows={propagationRows}
        canReview={canReview}
        onApprove={handleApprove}
        onReject={handleReject}
        isPartOfGroup={isPartOfGroup}
      />
    </div>
  );
}

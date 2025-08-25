"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { List, Search, Filter, Plus } from "lucide-react";
import SyncFilters, { SyncFilterValue } from "./sync-filters";
import { Label } from "@/components/ui/label";

interface CasesListProps {
  guildId: string;
  isPartOfGroup: boolean;
}

export default function CasesList({ guildId, isPartOfGroup }: CasesListProps) {
  const [syncFilter, setSyncFilter] = useState<SyncFilterValue>("all");

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Moderation Cases</span>
            <Button size="sm" variant="primary">
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cases by user ID, moderator, or reason..."
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
          
          {/* Sync Filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sync Status</Label>
            <SyncFilters value={syncFilter} onChange={setSyncFilter} isPartOfGroup={isPartOfGroup} />
          </div>
        </CardContent>
      </Card>

      {/* Cases Table */}
      <Card>
        <CardContent className="p-0">
          <div className="text-center py-12">
            <List className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No cases yet</h3>
            <p className="text-muted-foreground mb-4">
              When you take moderation actions, cases will appear here for tracking and review.
            </p>
            <Button variant="primary">Take First Action</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

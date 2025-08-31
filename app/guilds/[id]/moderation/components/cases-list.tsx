"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { List, Search, Filter, Plus, User, Shield, Clock, MessageSquare } from "lucide-react";
import SyncFilters, { SyncFilterValue } from "./sync-filters";
import { Label } from "@/components/ui/label";

interface ModerationCase {
  id: number;
  case_id: string;
  action_type: string;
  target_user_id: string;
  target_username: string;
  moderator_user_id: string;
  moderator_username: string;
  reason: string | null;
  duration_ms: number | null;
  duration_label: string | null;
  active: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  evidence_count: number;
  origin_server_name?: string;
}

interface CasesListProps {
  guildId: string;
  isPartOfGroup: boolean;
  onViewCase?: (caseId: string) => void;
}

export default function CasesList({ guildId, isPartOfGroup, onViewCase }: CasesListProps) {
  const [syncFilter, setSyncFilter] = useState<SyncFilterValue>("all");
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const fetchCases = async (reset = false) => {
    if (!guildId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '20',
        offset: reset ? '0' : offset.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedAction && { action: selectedAction })
      });

      const response = await fetch(`/api/guilds/${guildId}/moderation/cases?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCases(reset ? data.cases : [...cases, ...data.cases]);
        setHasMore(data.pagination.hasMore);
        setOffset(reset ? 20 : offset + 20);
      } else {
        console.error('Failed to fetch cases:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases(true);
  }, [guildId, searchTerm, selectedAction]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setOffset(0);
  };

  const handleActionFilter = (action: string) => {
    setSelectedAction(action);
    setOffset(0);
  };

  const handleViewCase = (caseId: string) => {
    if (onViewCase) {
      onViewCase(caseId);
    }
  };

  if (loading && cases.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading cases...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>Moderation Cases ({cases.length})</span>
              {isPartOfGroup && (
                <Badge variant="outline" className="text-xs">
                  Group View
                </Badge>
              )}
            </div>
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
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <select
              value={selectedAction}
              onChange={(e) => handleActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="warn">Warn</option>
              <option value="kick">Kick</option>
              <option value="ban">Ban</option>
              <option value="mute">Mute</option>
              <option value="timeout">Timeout</option>
              <option value="unban">Unban</option>
              <option value="unmute">Unmute</option>
            </select>
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
        {cases.length === 0 ? (
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
        ) : (
          <div className="divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleViewCase(caseItem.case_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">Case #{caseItem.case_id}</h3>
                      <Badge
                        variant={caseItem.active ? "default" : "secondary"}
                        className={caseItem.active ? "bg-green-100 text-green-800" : ""}
                      >
                        {caseItem.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        variant={
                          caseItem.action_type === 'ban' ? 'destructive' :
                          caseItem.action_type === 'kick' ? 'secondary' :
                          caseItem.action_type === 'mute' ? 'outline' :
                          caseItem.action_type === 'timeout' ? 'outline' :
                          'default'
                        }
                        className="capitalize"
                      >
                        {caseItem.action_type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="font-medium">{caseItem.target_username}</span>
                          <div className="text-muted-foreground">{caseItem.target_user_id}</div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>{caseItem.moderator_username}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(caseItem.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {caseItem.reason && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <strong>Reason:</strong> {caseItem.reason}
                      </div>
                    )}

                    <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{caseItem.evidence_count} evidence</span>
                      </span>
                      {caseItem.duration_label && (
                        <span>Duration: {caseItem.duration_label}</span>
                      )}
                      {caseItem.origin_server_name && (
                        <span className="flex items-center space-x-1 text-blue-600">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>{caseItem.origin_server_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="p-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => fetchCases()}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Cases'}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

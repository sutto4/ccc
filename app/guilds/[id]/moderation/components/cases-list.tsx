"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { List, Search, User, Shield, Clock, MessageSquare, Server, Calendar } from "lucide-react";
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
  selectedCaseId?: string | null;
}

export default function CasesList({ guildId, isPartOfGroup, onViewCase, selectedCaseId }: CasesListProps) {
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
      {/* Group Info Banner */}
      {isPartOfGroup && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900 flex items-center space-x-2 text-sm">
                  <Server className="h-4 w-4" />
                  <span>Group Moderation View</span>
                </h3>
                <p className="text-xs text-blue-700">
                  Showing cases from all servers in this group
                </p>
              </div>
              <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs">
                Group View
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, moderator, or reason..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
            </div>
            <select
              value={selectedAction}
              onChange={(e) => handleActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            {cases.map((caseItem) => {
              const isSelected = selectedCaseId === caseItem.case_id;
              return (
                <div
                  key={caseItem.id}
                  className={`p-3 cursor-pointer transition-colors border-l-4 ${
                    isSelected 
                      ? 'bg-blue-50 border-blue-500 hover:bg-blue-100' 
                      : 'hover:bg-gray-50 border-transparent'
                  }`}
                  onClick={() => handleViewCase(caseItem.case_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-gray-900">#{caseItem.case_id}</h3>
                        <Badge
                          variant={caseItem.active ? "default" : "secondary"}
                          className={`text-xs ${caseItem.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
                        >
                          {caseItem.active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge
                          variant={
                            caseItem.action_type === 'ban' ? 'destructive' :
                            caseItem.action_type === 'kick' ? 'secondary' :
                            caseItem.action_type === 'mute' ? 'outline' :
                            caseItem.action_type === 'timeout' ? 'outline' :
                            caseItem.action_type === 'warn' ? 'default' :
                            'default'
                          }
                          className="text-xs capitalize"
                        >
                          {caseItem.action_type}
                        </Badge>
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-sm">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="font-medium">{caseItem.target_username}</span>
                          <span className="text-gray-500">by</span>
                          <span className="text-gray-600">{caseItem.moderator_username}</span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(caseItem.created_at).toLocaleDateString()}</span>
                          </span>
                          {caseItem.duration_label && (
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{caseItem.duration_label}</span>
                            </span>
                          )}
                          <span className="flex items-center space-x-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{caseItem.evidence_count}</span>
                          </span>
                        </div>

                        {/* Reason Preview */}
                        {caseItem.reason && (
                          <div className="text-xs text-gray-600 truncate">
                            {caseItem.reason}
                          </div>
                        )}

                        {/* Server Origin */}
                        {caseItem.origin_server_name && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                              <Server className="h-2 w-2 mr-1" />
                              {caseItem.origin_server_name}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="ml-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

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

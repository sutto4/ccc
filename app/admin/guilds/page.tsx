"use client";

import { useState, useEffect } from "react";
import { 
  Server, 
  Users, 
  Settings, 
  Search, 
  Filter,
  ExternalLink,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreVertical
} from "lucide-react";
import Link from "next/link";

interface Guild {
  guild_id: string;
  name?: string;
  guild_name?: string; // Fallback column name
  icon_url?: string;
  member_count?: number;
  premium?: boolean;
  status?: string;
  created_at: string;
  owner_id?: string;
}

export default function AdminGuilds() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'premium'>('all');

  useEffect(() => {
    fetchGuilds();
  }, []);

  const fetchGuilds = async () => {
    try {
      setLoading(true);
      // This would need to be an admin endpoint that fetches all guilds
      const response = await fetch('/api/admin/guilds');
      if (response.ok) {
        const data = await response.json();
        setGuilds(data.guilds || []);
      }
    } catch (error) {
      console.error('Error fetching guilds:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuilds = guilds.filter(guild => {
    const guildName = guild.name || guild.guild_name || '';
    const matchesSearch = guildName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'premium' && guild.premium) ||
      (statusFilter === 'active' && guild.status === 'active') ||
      (statusFilter === 'inactive' && guild.status !== 'active');
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string, premium: boolean) => {
    if (premium) return <Shield className="h-4 w-4 text-yellow-500" />;
    if (status === 'active') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'inactive') return <Clock className="h-4 w-4 text-gray-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = (status: string, premium: boolean) => {
    if (premium) return 'Premium';
    if (status === 'active') return 'Active';
    if (status === 'inactive') return 'Inactive';
    return 'Unknown';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading guilds...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search guilds..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="premium">Premium</option>
        </select>

        <Link
          href="/admin/guilds/bulk"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Bulk Operations
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Total Guilds</span>
          </div>
          <div className="text-2xl font-bold">{guilds.length}</div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold">
            {guilds.filter(g => g.status === 'active').length}
          </div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">Premium</span>
          </div>
          <div className="text-2xl font-bold">
            {guilds.filter(g => g.premium).length}
          </div>
        </div>
        
        <div className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Total Users</span>
          </div>
          <div className="text-2xl font-bold">
            {guilds.reduce((sum, g) => sum + (g.member_count || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Guild List */}
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">All Guilds ({filteredGuilds.length})</h2>
        </div>
        
        <div className="divide-y">
          {filteredGuilds.map((guild) => (
            <div key={guild.guild_id} className="p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {guild.icon_url ? (
                    <img 
                      src={guild.icon_url} 
                      alt={guild.name || guild.guild_name}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <Server className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{guild.name || guild.guild_name}</h3>
                      {getStatusIcon(guild.status || 'unknown', guild.premium || false)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{guild.member_count?.toLocaleString() || 0} members</span>
                      <span>Status: {getStatusText(guild.status, guild.premium)}</span>
                      <span>Added: {new Date(guild.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/guilds/${guild.guild_id}`}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Manage
                  </Link>
                  
                  <Link
                    href={`/guilds/${guild.guild_id}`}
                    className="px-3 py-1 text-sm border rounded hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredGuilds.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No guilds found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
